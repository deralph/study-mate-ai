import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

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
