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
  url?: string;
}

function rowToApi(r: any) {
  return {
    id: r.id, topic: r.topic, subject: r.subject,
    estimated_time: r.estimated_time, difficulty: r.difficulty,
    reason: r.reason, priority: r.priority, completed: !!r.completed,
    url: r.url || null,
  };
}

recommendationsRouter.get('/', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare('SELECT * FROM recommendations WHERE user_id=? ORDER BY completed ASC, created_at DESC').all(req.userId!);
  res.json({ recommendations: rows.map(rowToApi) });
});

recommendationsRouter.post('/generate', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const materials: any[] = await db.prepare('SELECT title, subject FROM materials WHERE user_id=? LIMIT 10').all(userId);
  const weakSubjects: any[] = await db.prepare(`
    SELECT q.subject, AVG(qa.percentage) AS avg
    FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id
    WHERE qa.user_id=? GROUP BY q.subject ORDER BY avg ASC LIMIT 3`).all(userId);

  let recs: Rec[];
  if (hasAi() && materials.length > 0) {
    try {
      const prompt = `Generate 6 highly personalized study recommendations for a Nigerian university (AAUA) student.
Their uploaded materials: ${JSON.stringify(materials)}
Weak subjects (low quiz scores): ${JSON.stringify(weakSubjects)}
Return STRICT JSON array:
[{
  "topic":"specific topic to study e.g. Newton's Laws of Motion",
  "subject":"the course/subject name",
  "estimated_time":"30 min",
  "difficulty":"Easy|Medium|Hard",
  "reason":"specific reason why this helps based on their materials or weak areas",
  "priority":"high|medium|low",
  "url":"https://www.youtube.com/results?search_query=... OR https://en.wikipedia.org/wiki/... OR https://www.khanacademy.org/search?referer=%2F&page_search_query=..."
}]
Rules:
- Each recommendation must reference specific topics from their materials or weak subjects
- url must be a real working link (YouTube search, Wikipedia, Khan Academy, or Google Scholar)
- Mix YouTube videos, Wikipedia articles, and Khan Academy resources for variety`;
      recs = await aiJson<Rec[]>(prompt);
    } catch {
      recs = defaultRecs(materials);
    }
  } else {
    recs = defaultRecs(materials);
  }

  // Replace existing
  await db.prepare('DELETE FROM recommendations WHERE user_id=?').run(userId);
  const ins = await db.prepare('INSERT INTO recommendations (id, user_id, topic, subject, estimated_time, difficulty, reason, priority, url) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const r of recs) {
    await ins.run(uid(), userId, r.topic, r.subject, r.estimated_time, r.difficulty, r.reason, r.priority, r.url || null);
  }
  const rows: any[] = await db.prepare('SELECT * FROM recommendations WHERE user_id=? ORDER BY created_at DESC').all(userId);
  res.json({ recommendations: rows.map(rowToApi) });
});

function defaultRecs(materials: any[]): Rec[] {
  const subjects = [...new Set(materials.map(m => m.subject))];
  const s0 = subjects[0] || 'General Studies';
  const s1 = subjects[1] || s0;
  return [
    { topic: `Core concepts in ${s0}`, subject: s0, estimated_time: '30 min', difficulty: 'Easy', reason: 'Reinforces your most recent uploaded material', priority: 'high', url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(s0)}` },
    { topic: `${s0} video lectures`, subject: s0, estimated_time: '45 min', difficulty: 'Medium', reason: 'Video explanations improve understanding', priority: 'high', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(s0 + ' university lecture')}` },
    { topic: `Practice problems in ${s0}`, subject: s0, estimated_time: '20 min', difficulty: 'Medium', reason: 'Testing yourself reveals knowledge gaps', priority: 'medium', url: `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encodeURIComponent(s0)}` },
    { topic: `${s1} study notes`, subject: s1, estimated_time: '25 min', difficulty: 'Easy', reason: 'Summarising notes consolidates memory', priority: 'medium', url: `https://www.google.com/search?q=${encodeURIComponent(s1 + ' study notes university')}` },
    { topic: `${s1} past exam questions`, subject: s1, estimated_time: '40 min', difficulty: 'Hard', reason: 'Past questions improve exam readiness', priority: 'high', url: `https://www.google.com/search?q=${encodeURIComponent(s1 + ' past exam questions')}` },
  ];
}

recommendationsRouter.patch('/:id/complete', async (req: AuthedRequest, res) => {
  const r: any = await db.prepare('SELECT id FROM recommendations WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await db.prepare('UPDATE recommendations SET completed=1 WHERE id=?').run(req.params.id);
  await db.prepare('UPDATE users SET points=points+10 WHERE id=?').run(req.userId!);
  await db.prepare('UPDATE users SET level=(CAST(points / 250 AS INTEGER) + 1) WHERE id=?').run(req.userId!);
  const rec: any = await db.prepare('SELECT subject, estimated_time FROM recommendations WHERE id=?').get(req.params.id);
  const minutes = Math.max(10, Number(String(rec?.estimated_time || '').match(/\d+/)?.[0]) || 20);
  await db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type) VALUES (?,?,?,?,?)')
    .run(uid(), req.userId!, rec?.subject || 'General', minutes, 'recommendation');
  res.json({ message: 'Marked complete' });
});
