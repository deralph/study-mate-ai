import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';

export const remindersRouter = Router();
remindersRouter.use(requireAuth);

function rowToApi(r: any) {
  return {
    id: r.id, title: r.title, time: r.time, recurrence: r.recurrence,
    enabled: !!r.enabled, condition: r.condition ?? undefined,
  };
}

remindersRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT * FROM reminders WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ reminders: rows.map(rowToApi) });
});

remindersRouter.post('/', (req: AuthedRequest, res) => {
  const { title, time, recurrence, condition } = req.body ?? {};
  if (!title || !time) return res.status(400).json({ error: 'title and time required' });
  const id = uid();
  db.prepare('INSERT INTO reminders (id, user_id, title, time, recurrence, condition) VALUES (?,?,?,?,?,?)')
    .run(id, req.userId!, title, time, recurrence || 'once', condition || null);
  const row = db.prepare('SELECT * FROM reminders WHERE id=?').get(id);
  res.json({ reminder: rowToApi(row) });
});

remindersRouter.put('/:id', (req: AuthedRequest, res) => {
  const existing: any = db.prepare('SELECT * FROM reminders WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, time, recurrence, enabled, condition } = req.body ?? {};
  db.prepare(`UPDATE reminders SET title=?, time=?, recurrence=?, enabled=?, condition=? WHERE id=?`)
    .run(title ?? existing.title, time ?? existing.time, recurrence ?? existing.recurrence,
         enabled === undefined ? existing.enabled : (enabled ? 1 : 0),
         condition ?? existing.condition, req.params.id);
  const row = db.prepare('SELECT * FROM reminders WHERE id=?').get(req.params.id);
  res.json({ reminder: rowToApi(row) });
});

remindersRouter.delete('/:id', (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM reminders WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});
