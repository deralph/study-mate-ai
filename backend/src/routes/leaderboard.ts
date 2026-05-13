import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';

export const leaderboardRouter = Router();
leaderboardRouter.use(requireAuth);

leaderboardRouter.get('/', (req: AuthedRequest, res) => {
  const rows: any[] = db.prepare(`
    SELECT u.id, u.name, u.department, u.points, u.study_streak AS streak, u.level, u.avatar,
      (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id=u.id) AS quizzes
    FROM users u ORDER BY u.points DESC, u.study_streak DESC LIMIT 50`).all();
  const leaderboard = rows.map((r, i) => ({
    id: r.id, name: r.name, department: r.department, points: r.points,
    streak: r.streak, level: r.level, quizzes: r.quizzes, avatar: r.avatar || '',
    rank: i + 1,
  }));
  const me = leaderboard.find(r => r.id === req.userId);
  const myRank = me ? { rank: me.rank, points: me.points } : null;
  res.json({ leaderboard, myRank });
});
