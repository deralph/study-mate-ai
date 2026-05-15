import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const quizzesRouter = Router();
quizzesRouter.use(requireAuth);

interface GeneratedQuestion {
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

function quizSummary(q: any, userId: string) {
  const attempts: any = db.prepare('SELECT COUNT(*) AS c, MAX(percentage) AS best FROM quiz_attempts WHERE quiz_id=? AND user_id=?').get(q.id, userId);
  return {
    id: q.id, title: q.title, subject: q.subject,
    question_count: q.question_count, duration: q.duration,
    best_score: attempts.best ?? undefined,
    attempt_count: attempts.c,
    status: attempts.c > 0 ? 'completed' : 'available',
  };
}

quizzesRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT * FROM quizzes WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ quizzes: rows.map(r => quizSummary(r, req.userId!)) });
});

quizzesRouter.post('/generate', async (req: AuthedRequest, res) => {
  const { materialId, questionCount = 10 } = req.body ?? {};
  if (!materialId) return res.status(400).json({ error: 'materialId required' });
  const material: any = db.prepare('SELECT * FROM materials WHERE id=? AND user_id=?').get(materialId, req.userId!);
  if (!material) return res.status(404).json({ error: 'Material not found' });

  const count = Math.max(3, Math.min(20, Number(questionCount) || 10));
  const prompt = `Based on the following study material, generate exactly ${count} quiz questions STRICTLY about the content of this material. Every question must reference specific facts, concepts, or terms from the material below - do NOT generate generic study tips.
Mix multiple-choice, true-false, and short-answer types.
Return STRICT JSON array with this shape:
[{"question":"...","type":"multiple-choice","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."}]
For true-false: correctAnswer is "True" or "False", options must be ["True","False"].
For short-answer: omit options, correctAnswer is the key expected answer.

MATERIAL (${material.title}):
${(material.text_content || '').slice(0, 12000)}`;

  let questions: GeneratedQuestion[];
  if (hasAi() && material.text_content) {
    try {
      questions = await aiJson<GeneratedQuestion[]>(prompt);
      if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions returned');
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to generate quiz: ' + e.message });
    }
  } else {
    questions = fallbackQuestions(material.title, material.subject, count);
  }

  const quizId = uid();
  db.prepare('INSERT INTO quizzes (id, user_id, material_id, title, subject, question_count, duration) VALUES (?,?,?,?,?,?,?)')
    .run(quizId, req.userId!, materialId, `${material.title} Quiz`, material.subject, questions.length, Math.max(5, questions.length));

  const insertQ = db.prepare('INSERT INTO quiz_questions (id, quiz_id, question, type, options_json, correct_answer, explanation, position) VALUES (?,?,?,?,?,?,?,?)');
  questions.forEach((q, i) => {
    const opts = q.options ? q.options : (q.type === 'true-false' ? ['True', 'False'] : null);
    insertQ.run(uid(), quizId, q.question, q.type, opts ? JSON.stringify(opts) : null, q.correctAnswer, q.explanation || '', i);
  });

  return res.json({ quiz: { ...quizSummary(db.prepare('SELECT * FROM quizzes WHERE id=?').get(quizId), req.userId!), questions: getQuestions(quizId, true) } });
});

function getQuestions(quizId: string, includeAnswers: boolean) {
  const rows: any[] = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY position ASC').all(quizId);
  return rows.map(r => ({
    id: r.id,
    question: r.question,
    type: r.type,
    options: r.options_json ? JSON.parse(r.options_json) : (r.type === 'true-false' ? ['True', 'False'] : undefined),
    correctAnswer: includeAnswers ? r.correct_answer : '',
    explanation: includeAnswers ? r.explanation : '',
  }));
}

quizzesRouter.get('/:id', (req: AuthedRequest, res) => {
  const q: any = db.prepare('SELECT * FROM quizzes WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json({ quiz: { ...quizSummary(q, req.userId!), questions: getQuestions(q.id, false) } });
});

quizzesRouter.post('/:id/submit', (req: AuthedRequest, res) => {
  const q: any = db.prepare('SELECT * FROM quizzes WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const answers: Record<string, string> = req.body?.answers ?? {};
  const questions: any[] = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY position').all(q.id);

  let score = 0;
  for (const qq of questions) {
    const given = String(answers[qq.id] ?? '').trim().toLowerCase();
    const correct = String(qq.correct_answer).trim().toLowerCase();
    if (given && (given === correct || (qq.type === 'short-answer' && correct.includes(given) || given.includes(correct)))) {
      score++;
    }
  }
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const pointsEarned = score * 10;

  const attemptId = uid();
  db.prepare('INSERT INTO quiz_attempts (id, quiz_id, user_id, score, total, percentage, answers_json) VALUES (?,?,?,?,?,?,?)')
    .run(attemptId, q.id, req.userId!, score, total, percentage, JSON.stringify(answers));
  db.prepare('UPDATE users SET points = points + ? WHERE id=?').run(pointsEarned, req.userId!);
  db.prepare('UPDATE users SET level=(CAST(points / 250 AS INTEGER) + 1) WHERE id=?').run(req.userId!);
  db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type, score) VALUES (?,?,?,?,?,?)')
    .run(uid(), req.userId!, q.subject, q.duration, 'quiz', percentage);

  res.json({
    attempt: { id: attemptId, score, total, percentage, pointsEarned },
    questions: getQuestions(q.id, true),
  });
});

function fallbackQuestions(title: string, subject: string, count: number): GeneratedQuestion[] {
  const topics = [title, `${subject} key concepts`, `${subject} definitions`, `${subject} applications`, `${subject} revision`];
  return Array.from({ length: count }, (_, i) => {
    const topic = topics[i % topics.length];
    if (i % 3 === 1) {
      return { question: `True or False: Reviewing ${topic} with past questions improves exam preparation.`, type: 'true-false', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Active recall and practice questions improve retention.' };
    }
    if (i % 3 === 2) {
      return { question: `In one sentence, state why ${topic} is important in ${subject}.`, type: 'short-answer', correctAnswer: subject, explanation: `A good answer should connect the topic back to ${subject}.` };
    }
    return { question: `Which activity best helps you master ${topic}?`, type: 'multiple-choice', options: ['Skimming once', 'Active recall with practice', 'Ignoring weak areas', 'Only reading headings'], correctAnswer: 'Active recall with practice', explanation: 'Active recall and practice reveal weak areas and strengthen memory.' };
  });
}

quizzesRouter.get('/:id/attempts', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare('SELECT id, score, total, percentage, completed_at FROM quiz_attempts WHERE quiz_id=? AND user_id=? ORDER BY completed_at DESC')
    .all(req.params.id, req.userId!);
  res.json({ attempts: rows });
});
