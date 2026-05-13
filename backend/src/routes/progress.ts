import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';

export const progressRouter = Router();
progressRouter.use(requireAuth);

progressRouter.get('/stats', (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const user: any = db.prepare('SELECT study_streak, level, points FROM users WHERE id=?').get(userId);
  const totals: any = db.prepare(`SELECT COALESCE(SUM(duration_minutes),0) AS minutes FROM study_sessions WHERE user_id=?`).get(userId);
  const materialCount: any = db.prepare('SELECT COUNT(*) AS c FROM materials WHERE user_id=?').get(userId);
  const quizCount: any = db.prepare('SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id=?').get(userId);
  const avg: any = db.prepare('SELECT COALESCE(AVG(percentage),0) AS a FROM quiz_attempts WHERE user_id=?').get(userId);

  const studyBySubject: any[] = db.prepare(`
    SELECT subject, ROUND(SUM(duration_minutes)/60.0, 1) AS hours
    FROM study_sessions WHERE user_id=? GROUP BY subject ORDER BY hours DESC LIMIT 8`).all(userId);

  const weeklyPerformance: any[] = db.prepare(`
    SELECT strftime('%Y-W%W', completed_at) AS week, ROUND(AVG(percentage)) AS score
    FROM quiz_attempts WHERE user_id=? GROUP BY week ORDER BY week DESC LIMIT 8`).all(userId);

  const subjectBreakdown: any[] = db.prepare(`
    SELECT s.subject,
      ROUND(SUM(s.duration_minutes)/60.0, 1) AS hours,
      COALESCE((SELECT ROUND(AVG(qa.percentage)) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id=q.id WHERE q.subject=s.subject AND qa.user_id=?), 0) AS avg_score,
      (SELECT COUNT(*) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id=q.id WHERE q.subject=s.subject AND qa.user_id=?) AS quiz_count
    FROM study_sessions s WHERE s.user_id=? GROUP BY s.subject`).all(userId, userId, userId);

  const radarData = subjectBreakdown.map(s => ({ subject: s.subject, score: s.avg_score }));

  const recentActivity: any[] = db.prepare(`
    SELECT activity_type AS type, subject AS text, created_at AS time
    FROM study_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 10`).all(userId);

  res.json({
    stats: {
      studyHours: (totals.minutes / 60).toFixed(1),
      materialCount: materialCount.c,
      quizCount: quizCount.c,
      avgScore: Math.round(avg.a),
      studyStreak: user.study_streak,
      level: user.level,
      points: user.points,
    },
    studyBySubject,
    weeklyPerformance: weeklyPerformance.reverse(),
    subjectBreakdown,
    radarData,
    recentActivity,
  });
});

progressRouter.post('/session', (req: AuthedRequest, res) => {
  const { subject, durationMinutes, activityType } = req.body ?? {};
  if (!subject || !durationMinutes) return res.status(400).json({ error: 'subject and durationMinutes required' });
  db.prepare('INSERT INTO study_sessions (id, user_id, subject, duration_minutes, activity_type) VALUES (?,?,?,?,?)')
    .run(uid(), req.userId!, subject, Number(durationMinutes), activityType || 'study');
  // Update streak (simple: if last session was yesterday or today, +1; else reset to 1)
  const user: any = db.prepare('SELECT study_streak, last_active_date FROM users WHERE id=?').get(req.userId!);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak = user.study_streak;
  if (user.last_active_date === today) {
    // same day, no change
  } else if (user.last_active_date === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }
  db.prepare('UPDATE users SET study_streak=?, last_active_date=?, points=points+5 WHERE id=?')
    .run(newStreak, today, req.userId!);
  res.json({ message: 'Logged' });
});
