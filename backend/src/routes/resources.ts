import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

interface ResourceSeed { title: string; type: string; subject: string; duration: string; rating: number; url?: string }

function rowToApi(r: any) {
  return {
    id: r.id, title: r.title, type: r.type, subject: r.subject,
    rating: r.rating, duration: r.duration ?? '', url: r.url,
    bookmarked: !!r.bookmarked,
  };
}

resourcesRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT * FROM resources WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ resources: rows.map(rowToApi) });
});

resourcesRouter.post('/', (req: AuthedRequest, res) => {
  const { title, type, subject, url, duration, rating } = req.body ?? {};
  if (!title || !type || !subject || !url) return res.status(400).json({ error: 'title, type, subject, url required' });
  const id = uid();
  db.prepare('INSERT INTO resources (id, user_id, title, type, subject, url, duration, rating) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.userId!, title, type, subject, url, duration || null, Number(rating) || 0);
  const row = db.prepare('SELECT * FROM resources WHERE id=?').get(id);
  res.json({ resource: rowToApi(row) });
});

resourcesRouter.post('/generate', async (req: AuthedRequest, res) => {
  const user: any = db.prepare('SELECT name, department, year, university FROM users WHERE id=?').get(req.userId!);
  const materials: any[] = db.prepare('SELECT title, subject FROM materials WHERE user_id=? ORDER BY upload_date DESC LIMIT 12').all(req.userId!);
  const subjects = [...new Set(materials.map(m => String(m.subject || '').trim()).filter(Boolean))];

  let resources: ResourceSeed[];
  if (hasAi()) {
    try {
      resources = await aiJson<ResourceSeed[]>(`Create 8 helpful study resources for this Nigerian university student.
Profile: ${JSON.stringify(user)}
Uploaded materials: ${JSON.stringify(materials)}
Return STRICT JSON array only:
[{"title":"clear resource/blog/topic title","type":"Article|Video|PDF|Blog","subject":"course/subject","duration":"10 min","rating":4.7,"url":"https://www.google.com/search?q=encoded+search+query"}]
Use Google, YouTube, or scholar-style search URLs that point to the topic; do not invent fake domains.`);
      if (!Array.isArray(resources) || resources.length === 0) throw new Error('empty');
    } catch {
      resources = defaultResources(subjects, user?.department);
    }
  } else {
    resources = defaultResources(subjects, user?.department);
  }

  db.prepare('DELETE FROM resources WHERE user_id=?').run(req.userId!);
  const ins = db.prepare('INSERT INTO resources (id, user_id, title, type, subject, url, duration, rating) VALUES (?,?,?,?,?,?,?,?)');
  for (const r of resources.slice(0, 10)) {
    const subject = r.subject || subjects[0] || user?.department || 'General Studies';
    const query = encodeURIComponent(`${subject} ${r.title} university study guide`);
    ins.run(uid(), req.userId!, r.title, r.type || 'Article', subject, r.url || `https://www.google.com/search?q=${query}`, r.duration || '15 min', Number(r.rating) || 4.5);
  }
  const rows: any[] = db.prepare('SELECT * FROM resources WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ resources: rows.map(rowToApi) });
});

function defaultResources(subjects: string[], department?: string): ResourceSeed[] {
  const base = subjects.length ? subjects : [department || 'General Studies', 'Academic Writing', 'Exam Preparation'];
  return base.slice(0, 4).flatMap((subject) => ([
    { title: `${subject} fundamentals study guide`, type: 'Article', subject, duration: '12 min', rating: 4.7 },
    { title: `${subject} past questions and revision topics`, type: 'Blog', subject, duration: '18 min', rating: 4.6 },
  ]));
}

resourcesRouter.patch('/:id/bookmark', (req: AuthedRequest, res) => {
  const r: any = db.prepare('SELECT bookmarked FROM resources WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const next = r.bookmarked ? 0 : 1;
  db.prepare('UPDATE resources SET bookmarked=? WHERE id=?').run(next, req.params.id);
  res.json({ bookmarked: !!next });
});

resourcesRouter.delete('/:id', (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM resources WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});
