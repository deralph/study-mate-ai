import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const studyPlanRouter = Router();
studyPlanRouter.use(requireAuth);

interface PlanDay {
  day: number; date: string; subject: string; focus: string; topics: string[];
  hours: number; type: 'study' | 'revision' | 'practice' | 'rest';
  notes?: string[];
  links?: Array<{ title: string; url: string }>;
  successSummary?: string;
}

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
    const q = encodeURIComponent(`${subject} ${isReview ? 'revision past questions' : isPractice ? 'practice problems' : `topic ${i + 1}`}`);
    out.push({
      day: i + 1,
      date: d.toISOString().slice(0, 10),
      subject,
      focus: isReview ? `${subject} revision and past questions` : isPractice ? `${subject} problem solving` : `${subject} core concept ${i + 1}`,
      topics: isReview ? [`Full ${subject} review`, `${subject} past questions`, 'Correct weak areas'] : isPractice ? [`${subject} worked examples`, 'Timed practice problems'] : [`${subject} topic ${i + 1}`, 'Make concise notes', 'Recall key definitions'],
      hours: isReview ? 3 : 2,
      type: isReview ? 'revision' : isPractice ? 'practice' : 'study',
      notes: isReview
        ? ['Review all key formulas and definitions', 'Attempt past exam questions under timed conditions', 'Note any weak areas for final review']
        : isPractice
        ? ['Work through at least 5 practice problems', 'Check solutions and understand each step', 'Redo any questions you got wrong']
        : [`Read your notes or textbook on ${subject} topic ${i + 1}`, 'Write a one-page summary of today\'s concepts', 'Create flashcards for key terms'],
      links: [
        { title: `${subject} – Wikipedia`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(subject)}` },
        { title: `${subject} tutorial – YouTube`, url: `https://www.youtube.com/results?search_query=${q}` },
        { title: `${subject} study guide – Google`, url: `https://www.google.com/search?q=${q}+study+guide` },
      ],
      successSummary: isReview
        ? `A successful day means you have reviewed all key topics, attempted past questions, and identified weak areas to address.`
        : isPractice
        ? `A successful day means you have solved practice problems, understood the solutions, and can explain your reasoning.`
        : `A successful day means you have read today\'s topic, written a summary, and created flashcards for the key terms.`,
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
      const prompt = `Create a detailed daily study plan for a Nigerian university student.
Subject: ${subject}
Today: ${today}
Exam date: ${examDate}

Return STRICT JSON array, one entry per day from today to exam day:
[{
  "day":1,
  "date":"YYYY-MM-DD",
  "subject":"${subject}",
  "focus":"specific daily focus for this ${subject} topic",
  "topics":["specific topic1","specific topic2"],
  "hours":2,
  "type":"study",
  "notes":["actionable note 1 for this day","actionable note 2"],
  "links":[{"title":"${subject} intro – Wikipedia","url":"https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(subject)}"},{"title":"${subject} YouTube tutorial","url":"https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' lecture')}"},{"title":"${subject} practice problems","url":"https://www.google.com/search?q=${encodeURIComponent(subject + ' practice problems')}"}],
  "successSummary":"One sentence describing what a successful completion of today looks like."
}]
Rules:
- type must be one of: study, revision, practice, rest
- Every topic, note, and link must be specific to the ${subject} content for that day
- Last 1-2 days must be type "revision"
- Be realistic about workload (1-4 hours/day)
- notes must be 2-3 actionable bullet points for that specific day
- links must include at least one YouTube search and one Wikipedia/Google link`;
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
        notes: Array.isArray(d.notes) && d.notes.length ? d.notes : [`Study ${subject} for today`, 'Review your notes', 'Test yourself on key concepts'],
        links: Array.isArray(d.links) && d.links.length ? d.links : [
          { title: `${subject} – Wikipedia`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(subject)}` },
          { title: `${subject} – YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' lecture')}` },
        ],
        successSummary: d.successSummary || `A successful day means you have covered all listed topics and reviewed your notes for ${subject}.`,
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
