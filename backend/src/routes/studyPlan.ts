import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const studyPlanRouter = Router();
studyPlanRouter.use(requireAuth);

interface PlanDay { day: number; date: string; subject: string; focus: string; topics: string[]; hours: number; type: 'study' | 'revision' | 'practice' | 'rest' }

studyPlanRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT id, exam_date, subject, created_at FROM study_plans WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ plans: rows });
});

studyPlanRouter.get('/:id', (req: AuthedRequest, res) => {
  const r: any = db.prepare('SELECT * FROM study_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json({ plan: { id: r.id, exam_date: r.exam_date, subject: r.subject, plan: JSON.parse(r.plan_json) } });
});

function fallbackPlan(examDate: string, subject: string): PlanDay[] {
  const exam = new Date(examDate);
  const today = new Date();
  const daysUntil = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
  const out: PlanDay[] = [];
  for (let i = 0; i < daysUntil; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const isReview = i >= daysUntil - 2;
    const isPractice = i % 4 === 2 && !isReview;
    out.push({
      day: i + 1,
      date: d.toISOString().slice(0, 10),
      subject,
      focus: isReview ? `${subject} revision and past questions` : isPractice ? `${subject} problem solving` : `${subject} core concept ${i + 1}`,
      topics: isReview ? [`Full ${subject} review`, `${subject} past questions`, 'Correct weak areas'] : isPractice ? [`${subject} worked examples`, 'Timed practice problems'] : [`${subject} topic ${i + 1}`, 'Make concise notes', 'Recall key definitions'],
      hours: isReview ? 3 : 2,
      type: isReview ? 'revision' : isPractice ? 'practice' : 'study',
    });
  }
  return out;
}

studyPlanRouter.post('/generate', async (req: AuthedRequest, res) => {
  const { examDate } = req.body ?? {};
  if (!examDate) return res.status(400).json({ error: 'examDate required' });
  const user: any = db.prepare('SELECT department FROM users WHERE id=?').get(req.userId!);
  const recentMaterial: any = db.prepare('SELECT subject FROM materials WHERE user_id=? ORDER BY upload_date DESC LIMIT 1').get(req.userId!);
  const subject = String(req.body?.subject || recentMaterial?.subject || user?.department || 'General Studies').trim();

  let plan: PlanDay[];
  if (hasAi()) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `Create a daily study plan for a Nigerian university student.
Subject: ${subject}
Today: ${today}
Exam date: ${examDate}

Return STRICT JSON array, one entry per day from today to exam day:
[{"day":1,"date":"YYYY-MM-DD","subject":"${subject}","focus":"specific daily focus","topics":["topic1","topic2"],"hours":2,"type":"study"}]
type must be one of study, revision, practice, rest. Every topic must mention a concrete ${subject} task. Last 1-2 days should be type "revision". Be realistic about workload (1-4 hours/day).`;
      plan = await aiJson<PlanDay[]>(prompt);
      if (!Array.isArray(plan) || !plan.length) throw new Error('empty');
      plan = plan.map((d, i) => ({
        ...d,
        day: Number(d.day) || i + 1,
        subject: d.subject || subject,
        focus: d.focus || `${subject} study session`,
        topics: Array.isArray(d.topics) && d.topics.length ? d.topics : [`Review ${subject}`],
        hours: Math.max(1, Math.min(4, Number(d.hours) || 2)),
        type: ['study', 'revision', 'practice', 'rest'].includes(d.type) ? d.type : 'study',
      }));
    } catch {
      plan = fallbackPlan(examDate, subject);
    }
  } else {
    plan = fallbackPlan(examDate, subject);
  }

  const id = uid();
  db.prepare('INSERT INTO study_plans (id, user_id, exam_date, subject, plan_json) VALUES (?,?,?,?,?)')
    .run(id, req.userId!, examDate, subject, JSON.stringify(plan));
  db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type) VALUES (?,?,?,?,?)')
    .run(uid(), req.userId!, subject, 10, 'study_plan');
  res.json({ plan: { id, examDate, subject, plan } });
});
