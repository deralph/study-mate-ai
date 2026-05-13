import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
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

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function rowToApi(r: any) {
  return {
    id: r.id, title: r.title, subject: r.subject,
    file_type: r.file_type, file_name: r.file_name, file_size: r.file_size,
    status: r.status, upload_date: r.upload_date,
  };
}

materialsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = db.prepare('SELECT * FROM materials WHERE user_id=? ORDER BY upload_date DESC')
    .all(req.userId!);
  res.json({ materials: rows.map(rowToApi) });
});

materialsRouter.post('/upload', upload.single('file'), async (req: AuthedRequest, res) => {
  const file = req.file;
  const { title, subject } = req.body ?? {};
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!title || !subject) return res.status(400).json({ error: 'Title and subject required' });

  const id = uid();
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  // Extract text content for AI
  let textContent = '';
  try {
    if (ext === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(fs.readFileSync(file.path));
      textContent = data.text.slice(0, 50_000);
    } else if (ext === 'txt' || ext === 'md') {
      textContent = fs.readFileSync(file.path, 'utf8').slice(0, 50_000);
    }
  } catch (e) {
    console.error('Text extraction failed:', e);
  }

  db.prepare(`INSERT INTO materials (id, user_id, title, subject, file_type, file_name, file_path, file_size, text_content, status)
              VALUES (?,?,?,?,?,?,?,?,?,'ready')`)
    .run(id, req.userId!, title, subject, ext.toUpperCase(), file.originalname, file.path, fmtSize(file.size), textContent);

  const row = db.prepare('SELECT * FROM materials WHERE id=?').get(id);
  res.json({ material: rowToApi(row) });
});

materialsRouter.get('/:id', (req: AuthedRequest, res) => {
  const row: any = db.prepare('SELECT * FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ material: { ...rowToApi(row), text_content: row.text_content } });
});

materialsRouter.delete('/:id', (req: AuthedRequest, res) => {
  const row: any = db.prepare('SELECT file_path FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!row) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(row.file_path); } catch {}
  db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});
