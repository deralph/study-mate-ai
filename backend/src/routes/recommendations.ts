import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

interface Rec {
  topic: string; subject: string; estimated_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard'; reason: string; priority: 'high' | 'medium' | 'low';
}

function rowToApi(r: any) {
  return {
    id: r.id, topic: r.topic, subject: r.subject,
    estimated_time: r.estimated_time, difficulty: r.difficulty,
    reason: r.reason, priority: r.priority, completed: !!r.completed,
  };
}

recommendationsRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT * FROM recommendations WHERE user_id=? ORDER BY completed ASC, created_at DESC').all(req.userId!);
  res.json({ recommendations: rows.map(rowToApi) });
});

recommendationsRouter.post('/generate', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const materials: any[] = db.prepare('SELECT title, subject FROM materials WHERE user_id=? LIMIT 10').all(userId);
  const weakSubjects: any[] = db.prepare(`
    SELECT q.subject, AVG(qa.percentage) AS avg
    FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id
    WHERE qa.user_id=? GROUP BY q.subject ORDER BY avg ASC LIMIT 3`).all(userId);

  let recs: Rec[];
  if (hasAi() && materials.length > 0) {
    try {
      const prompt = `Generate 5 personalized study recommendations for an AAUA student.
Their materials: ${JSON.stringify(materials)}
Weak subjects (low quiz scores): ${JSON.stringify(weakSubjects)}
Return STRICT JSON array:
[{"topic":"...","subject":"...","estimated_time":"30 min","difficulty":"Easy|Medium|Hard","reason":"why this helps","priority":"high|medium|low"}]`;
      recs = await aiJson<Rec[]>(prompt);
    } catch {
      recs = defaultRecs(materials);
    }
  } else {
    recs = defaultRecs(materials);
  }

  // Replace existing
  db.prepare('DELETE FROM recommendations WHERE user_id=?').run(userId);
  const ins = db.prepare('INSERT INTO recommendations (id, user_id, topic, subject, estimated_time, difficulty, reason, priority) VALUES (?,?,?,?,?,?,?,?)');
  for (const r of recs) {
    ins.run(uid(), userId, r.topic, r.subject, r.estimated_time, r.difficulty, r.reason, r.priority);
  }
  const rows: any[] = db.prepare('SELECT * FROM recommendations WHERE user_id=? ORDER BY created_at DESC').all(userId);
  res.json({ recommendations: rows.map(rowToApi) });
});

function defaultRecs(materials: any[]): Rec[] {
  const subjects = [...new Set(materials.map(m => m.subject))];
  const base: Rec[] = [
    { topic: 'Review your latest material', subject: subjects[0] || 'General', estimated_time: '30 min', difficulty: 'Easy', reason: 'Reinforces recent learning', priority: 'high' },
    { topic: 'Take a practice quiz', subject: subjects[0] || 'General', estimated_time: '15 min', difficulty: 'Medium', reason: 'Test your understanding', priority: 'medium' },
    { topic: 'Summarize your notes', subject: subjects[1] || subjects[0] || 'General', estimated_time: '20 min', difficulty: 'Easy', reason: 'Active recall improves retention', priority: 'medium' },
  ];
  return base;
}

recommendationsRouter.patch('/:id/complete', (req: AuthedRequest, res) => {
  const r: any = db.prepare('SELECT id FROM recommendations WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE recommendations SET completed=1 WHERE id=?').run(req.params.id);
  db.prepare('UPDATE users SET points=points+10 WHERE id=?').run(req.userId!);
  db.prepare('UPDATE users SET level=(CAST(points / 250 AS INTEGER) + 1) WHERE id=?').run(req.userId!);
  const rec: any = db.prepare('SELECT subject, estimated_time FROM recommendations WHERE id=?').get(req.params.id);
  const minutes = Math.max(10, Number(String(rec?.estimated_time || '').match(/\d+/)?.[0]) || 20);
  db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type) VALUES (?,?,?,?,?)')
    .run(uid(), req.userId!, rec?.subject || 'General', minutes, 'recommendation');
  res.json({ message: 'Marked complete' });
});
