import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProd = process.env.NODE_ENV === 'production';
const PROD_URL = 'https://study-mate-ai-7cpy.onrender.com';

app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: isProd ? [PROD_URL] : true,
  credentials: true,
}));
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

// 404 for unmatched /api routes (must come after all API routers)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve React frontend in production
const distPath = path.resolve(__dirname, '..', '..', 'dist');
if (isProd && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`✅ Study Mate backend listening on port ${PORT}`);
  console.log(`   API base: /api  ·  Health: /api/health`);
  if (isProd) console.log(`   Serving React frontend from: ${distPath}`);
});
