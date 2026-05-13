import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import './db.js';
import { authRouter } from './routes/auth.js';
import { materialsRouter } from './routes/materials.js';
import { chatRouter } from './routes/chat.js';
import { quizzesRouter } from './routes/quizzes.js';
import { progressRouter } from './routes/progress.js';
import { remindersRouter } from './routes/reminders.js';
import { resourcesRouter } from './routes/resources.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { studyPlanRouter } from './routes/studyPlan.js';
import { summarizerRouter } from './routes/summarizer.js';
import { recommendationsRouter } from './routes/recommendations.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/study-plan', studyPlanRouter);
app.use('/api/summarizer', summarizerRouter);
app.use('/api/recommendations', recommendationsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`✅ Study Mate backend listening on http://localhost:${PORT}`);
  console.log(`   API base: /api  ·  Health: /api/health`);
});
