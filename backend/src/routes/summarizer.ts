import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { aiText, hasAi } from '../ai.js';

export const summarizerRouter = Router();
summarizerRouter.use(requireAuth);

const SYSTEM = `You summarize lecture notes for Nigerian university students. Be clear, concise, and use bullet points or numbered lists. Preserve key terminology. Output markdown.`;

summarizerRouter.post('/text', async (req: AuthedRequest, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Text required' });
  if (text.length > 50_000) return res.status(400).json({ error: 'Text too long (max 50k chars)' });
  if (!hasAi()) return res.status(503).json({ error: 'AI not configured. Add GEMINI_API_KEY in backend/.env' });
  try {
    const summary = await aiText(`Summarize the following notes:\n\n${text}`, SYSTEM);
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

summarizerRouter.post('/material/:id', async (req: AuthedRequest, res) => {
  const m: any = db.prepare('SELECT title, text_content FROM materials WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (!m.text_content) return res.status(400).json({ error: 'No extractable text in this material' });
  if (!hasAi()) return res.status(503).json({ error: 'AI not configured' });
  try {
    const summary = await aiText(`Summarize:\n\n${m.text_content.slice(0, 30000)}`, SYSTEM);
    res.json({ summary, materialTitle: m.title });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
