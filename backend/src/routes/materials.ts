import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uid()}${path.extname(file.originalname)}`),
});

const ALLOWED = new Set(['.pdf', '.txt', '.md', '.doc', '.docx', '.png', '.jpg', '.jpeg']);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

export const materialsRouter = Router();
materialsRouter.use(requireAuth);

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function cloudinaryFolder() {
  return process.env.CLOUDINARY_FOLDER || `study-mate-ai/${process.env.NODE_ENV || 'development'}`;
}

function signCloudinaryParams(params: Record<string, string | number | undefined>) {
  const toSign = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${toSign}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
}

async function uploadToCloudinary(file: Express.Multer.File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = cloudinaryFolder();
  const signature = signCloudinaryParams({ folder, timestamp });
  const form = new FormData();
  const bytes = fs.readFileSync(file.path);
  form.append('file', new Blob([bytes], { type: file.mimetype }), file.originalname);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json() as {
    secure_url?: string;
    public_id?: string;
    resource_type?: string;
    error?: { message?: string };
  };
  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message || `Cloudinary upload failed (${response.status})`);
  }
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type || 'raw',
  };
}

async function deleteFromCloudinary(publicId: string, resourceType = 'raw') {
  if (!hasCloudinary()) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams({ public_id: publicId, timestamp });
  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    console.warn(`Cloudinary delete failed for ${publicId}: ${text}`);
  }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function rowToApi(r: any) {
  return {
    id: r.id, title: r.title, subject: r.subject, course_code: r.course_code || undefined,
    file_type: r.file_type, file_name: r.file_name, file_size: r.file_size,
    status: r.status, upload_date: r.upload_date, file_url: r.file_url || undefined,
  };
}

materialsRouter.get('/', async (req: AuthedRequest, res) => {
  const rows = await db.prepare('SELECT * FROM materials WHERE user_id=? ORDER BY upload_date DESC')
    .all(req.userId!);
  res.json({ materials: rows.map(rowToApi) });
});

materialsRouter.get('/:id/file', async (req: AuthedRequest, res) => {
  const row: any = await db.prepare('SELECT file_path, file_url, file_name, file_type FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.file_url) return res.redirect(row.file_url);
  if (!fs.existsSync(row.file_path)) return res.status(404).json({ error: 'File missing on server' });
  res.setHeader('Content-Disposition', `inline; filename="${String(row.file_name).replace(/"/g, '')}"`);
  res.sendFile(row.file_path);
});

materialsRouter.post('/upload', upload.single('file'), async (req: AuthedRequest, res) => {
  const file = req.file;
  const { title, subject, courseCode } = req.body ?? {};
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!title) return res.status(400).json({ error: 'Title required' });

  const id = uid();
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  try {
    // Extract text content for AI before optionally removing the temporary file.
    let textContent = '';
    try {
      if (ext === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(fs.readFileSync(file.path));
        textContent = data.text.slice(0, 50_000);
      } else if (ext === 'txt' || ext === 'md') {
        textContent = fs.readFileSync(file.path, 'utf8').slice(0, 50_000);
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ path: file.path });
        textContent = result.value.slice(0, 50_000);
      }
    } catch (e) {
      console.error('Text extraction failed:', e);
    }

    let filePath = file.path;
    let fileUrl: string | null = null;
    let cloudinaryPublicId: string | null = null;
    let cloudinaryResourceType: string | null = null;

    if (hasCloudinary()) {
      const cloudinary = await uploadToCloudinary(file);
      filePath = cloudinary.secureUrl;
      fileUrl = cloudinary.secureUrl;
      cloudinaryPublicId = cloudinary.publicId;
      cloudinaryResourceType = cloudinary.resourceType;
      try { fs.unlinkSync(file.path); } catch {}
    }

    await db.prepare(`INSERT INTO materials (id, user_id, title, subject, course_code, file_type, file_name, file_path, file_url, cloudinary_public_id, cloudinary_resource_type, file_size, text_content, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'ready')`)
      .run(id, req.userId!, title, subject || 'General Studies', courseCode || null, ext.toUpperCase(), file.originalname, filePath, fileUrl, cloudinaryPublicId, cloudinaryResourceType, fmtSize(file.size), textContent);

    const row = await db.prepare('SELECT * FROM materials WHERE id=?').get(id);
    res.json({ material: rowToApi(row) });
  } catch (e: any) {
    try { fs.unlinkSync(file.path); } catch {}
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

materialsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const row: any = await db.prepare('SELECT * FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ material: { ...rowToApi(row), text_content: row.text_content } });
});

materialsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const row: any = await db.prepare('SELECT file_path, cloudinary_public_id, cloudinary_resource_type FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.cloudinary_public_id) {
    await deleteFromCloudinary(row.cloudinary_public_id, row.cloudinary_resource_type || 'raw');
  } else {
    try { fs.unlinkSync(row.file_path); } catch {}
  }
  await db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});
