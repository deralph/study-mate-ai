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

studyPlanRouter.get('/', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare('SELECT id, exam_date, subject, created_at FROM study_plans WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ plans: rows });
});

studyPlanRouter.get('/:id', async (req: AuthedRequest, res) => {
  const r: any = await db.prepare('SELECT * FROM study_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
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

interface ExamInput { date: string; subject: string; courseCode?: string; topics?: string[] }

const DAY_MS = 86400000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Builds a day-by-day schedule that covers EVERY selected exam/course.
// Each day gets up to 2 sessions; the course whose exam is nearest (and has had the
// fewest sessions so far) is picked first. The day before an exam is always revision
// for that course, and the exam day itself is a light review.
function buildSchedule(exams: ExamInput[]): PlanDay[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
  const lastExam = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
  const totalDays = Math.max(1, Math.round((lastExam.getTime() - today.getTime()) / DAY_MS) + 1);
  const given = new Map<string, number>(sorted.map(e => [e.subject, 0]));
  const out: PlanDay[] = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today.getTime() + i * DAY_MS);
    const dateStr = isoDay(d);
    const active = sorted.filter(e => e.date >= dateStr);
    if (!active.length) break;

    const picked: { exam: ExamInput; type: PlanDay['type'] }[] = [];
    // Forced: exam day -> light review, day before -> revision
    for (const e of active) {
      const diff = Math.round((new Date(e.date + 'T00:00:00').getTime() - d.getTime()) / DAY_MS);
      if (diff === 0) picked.push({ exam: e, type: 'revision' });
      else if (diff === 1) picked.push({ exam: e, type: 'revision' });
    }
    const maxSessions = Math.max(2, picked.length);
    const rest = active
      .filter(e => !picked.some(p => p.exam === e))
      .sort((a, b) => {
        const da = (new Date(a.date).getTime() - d.getTime()) / DAY_MS;
        const db_ = (new Date(b.date).getTime() - d.getTime()) / DAY_MS;
        return da / ((given.get(a.subject) || 0) + 1) - db_ / ((given.get(b.subject) || 0) + 1);
      });
    for (const e of rest) {
      if (picked.length >= maxSessions) break;
      const n = given.get(e.subject) || 0;
      const type: PlanDay['type'] = n > 0 && n % 3 === 2 ? 'practice' : 'study';
      picked.push({ exam: e, type });
    }

    for (const { exam, type } of picked) {
      const n = given.get(exam.subject) || 0;
      given.set(exam.subject, n + 1);
      const topicPool = exam.topics?.length ? exam.topics : [exam.subject];
      const t1 = topicPool[n % topicPool.length];
      const t2 = topicPool[(n + 1) % topicPool.length];
      const isExamDay = exam.date === dateStr;
      const q = encodeURIComponent(`${exam.subject} ${t1}`);
      out.push({
        day: i + 1, date: dateStr, subject: exam.subject,
        focus: isExamDay ? `Exam day: quick review before ${exam.subject}`
          : type === 'revision' ? `${exam.subject} final revision and past questions`
          : type === 'practice' ? `${exam.subject}: practice on ${t1}`
          : `${exam.subject}: ${t1}`,
        topics: isExamDay ? ['Skim key formulas/definitions', 'Rest well'] : type === 'revision' ? [`Full ${exam.subject} review`, 'Past questions', 'Weak areas'] : [t1, t2],
        hours: isExamDay ? 1 : type === 'revision' ? 2 : 2,
        type,
        notes: isExamDay
          ? ['Light review only', 'Arrive early with your materials']
          : type === 'practice'
          ? [`Solve at least 5 problems on ${t1}`, 'Check each solution and redo mistakes']
          : type === 'revision'
          ? ['Attempt past questions under time', 'List weak areas and fix them']
          : [`Read your notes on ${t1}`, 'Write a short summary', 'Make flashcards for key terms'],
        links: [
          { title: `${t1} – Wikipedia`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(t1)}` },
          { title: `${t1} – YouTube`, url: `https://www.youtube.com/results?search_query=${q}` },
        ],
        successSummary: type === 'revision' ? `You have reviewed all key ${exam.subject} topics and tried past questions.` : `You have covered ${t1} and can explain it in your own words.`,
      });
    }
  }
  return out;
}

studyPlanRouter.post('/generate', async (req: AuthedRequest, res) => {
  // New format: exams[] (multiple dates + courses). Old format (examDate + subject) still works.
  let exams: ExamInput[] = Array.isArray(req.body?.exams) ? req.body.exams : [];
  if (!exams.length && req.body?.examDate) {
    const user: any = await db.prepare('SELECT department FROM users WHERE id=?').get(req.userId!);
    const recent: any = await db.prepare('SELECT subject FROM materials WHERE user_id=? ORDER BY upload_date DESC LIMIT 1').get(req.userId!);
    exams = [{ date: String(req.body.examDate), subject: String(req.body?.subject || recent?.subject || user?.department || 'General Studies').trim() }];
  }
  exams = exams
    .filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)) && String(e.subject || '').trim())
    .map(e => ({ date: e.date, subject: String(e.subject).trim(), courseCode: e.courseCode, topics: Array.isArray(e.topics) ? e.topics.slice(0, 12) : [] }));
  if (!exams.length) return res.status(400).json({ error: 'Add at least one exam with a date and a course' });

  let plan = buildSchedule(exams);

  // Optional AI enrichment: one call fills in specific focus/topics/notes for every session.
  if (hasAi() && plan.length <= 60) {
    try {
      const skeleton = plan.map((d, i) => ({ i, date: d.date, subject: d.subject, type: d.type }));
      const syllabus = Object.fromEntries(exams.map(e => [e.subject, e.topics || []]));
      const enriched = await aiJson<{ i: number; focus: string; topics: string[]; notes: string[] }[]>(
`You are helping a Nigerian university student prepare for several exams. Syllabus topics per course: ${JSON.stringify(syllabus)}.
Here is the fixed schedule (one item per study session): ${JSON.stringify(skeleton)}.
For EACH item return specific content. Spread the syllabus topics across a course's sessions without repeating. Revision sessions revisit earlier topics and past questions.
Return STRICT JSON array only: [{"i":0,"focus":"short specific focus","topics":["topic1","topic2"],"notes":["actionable note 1","actionable note 2"]}]`);
      if (Array.isArray(enriched)) {
        for (const e of enriched) {
          const d = plan[Number(e?.i)];
          if (!d) continue;
          if (e.focus) d.focus = String(e.focus);
          if (Array.isArray(e.topics) && e.topics.length) d.topics = e.topics.map(String).slice(0, 5);
          if (Array.isArray(e.notes) && e.notes.length) d.notes = e.notes.map(String).slice(0, 3);
        }
      }
    } catch { /* keep the deterministic plan */ }
  }

  const subjectLabel = [...new Set(exams.map(e => e.subject))].join(', ');
  const lastDate = exams.map(e => e.date).sort().slice(-1)[0];
  const id = uid();
  await db.prepare('INSERT INTO study_plans (id, user_id, exam_date, subject, plan_json) VALUES (?,?,?,?,?)')
    .run(id, req.userId!, lastDate, subjectLabel, JSON.stringify(plan));
  await db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type) VALUES (?,?,?,?,?)')
    .run(uid(), req.userId!, subjectLabel.slice(0, 120), 10, 'study_plan');
  res.json({ plan: { id, examDate: lastDate, subject: subjectLabel, exams, plan } });
});
