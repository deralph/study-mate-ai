import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const studyPlanRouter = Router();
studyPlanRouter.use(requireAuth);

interface PlanDay { day: number; date: string; topics: string[]; hours: number; type: string }

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
    out.push({
      day: i + 1,
      date: d.toISOString().slice(0, 10),
      topics: isReview ? [`Full ${subject} review`, 'Past questions'] : [`${subject} - Topic ${i + 1}`, 'Practice problems'],
      hours: isReview ? 3 : 2,
      type: isReview ? 'review' : 'study',
    });
  }
  return out;
}

studyPlanRouter.post('/generate', async (req: AuthedRequest, res) => {
  const { examDate, subject } = req.body ?? {};
  if (!examDate || !subject) return res.status(400).json({ error: 'examDate and subject required' });

  let plan: PlanDay[];
  if (hasAi()) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `Create a daily study plan for a Nigerian university student.
Subject: ${subject}
Today: ${today}
Exam date: ${examDate}

Return STRICT JSON array, one entry per day from today to exam day:
[{"day":1,"date":"YYYY-MM-DD","topics":["topic1","topic2"],"hours":2,"type":"study"}]
Last 1-2 days should be type "review". Be realistic about workload (1-4 hours/day).`;
      plan = await aiJson<PlanDay[]>(prompt);
      if (!Array.isArray(plan) || !plan.length) throw new Error('empty');
    } catch {
      plan = fallbackPlan(examDate, subject);
    }
  } else {
    plan = fallbackPlan(examDate, subject);
  }

  const id = uid();
  db.prepare('INSERT INTO study_plans (id, user_id, exam_date, subject, plan_json) VALUES (?,?,?,?,?)')
    .run(id, req.userId!, examDate, subject, JSON.stringify(plan));
  res.json({ plan: { id, examDate, subject, plan } });
});
