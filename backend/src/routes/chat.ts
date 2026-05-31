import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid, nowIso } from '../util.js';
import { aiText, hasAi } from '../ai.js';

export const chatRouter = Router();
chatRouter.use(requireAuth);

async function getMaterialContext(userId: string, materialIds: string[]): Promise<{ context: string; refs: string[] }> {
  if (!materialIds.length) return { context: '', refs: [] };
  const placeholders = materialIds.map(() => '?').join(',');
  const rows: any[] = await db.prepare(
    `SELECT id, title, text_content FROM materials WHERE user_id=? AND id IN (${placeholders})`
  ).all(userId, ...materialIds);
  const context = rows.map(r => `--- ${r.title} ---\n${(r.text_content || '').slice(0, 8000)}`).join('\n\n');
  return { context, refs: rows.map(r => r.title) };
}

async function generateReply(userId: string, content: string, materialIds: string[]) {
  const { context, refs } = await getMaterialContext(userId, materialIds);
  const system = `You are Study Mate AI, a helpful study companion for university students at AAUA (Adekunle Ajasin University). Be friendly, concise, and encouraging. Use Nigerian English naturally where appropriate.`;
  let prompt = content;
  if (context) prompt = `Use these study materials as context:\n\n${context}\n\n---\nStudent question: ${content}`;
  if (!hasAi()) {
    return {
      content: `I'd love to answer "${content}" but the AI is not configured yet. Ask the developer to add a GEMINI_API_KEY (free at https://aistudio.google.com/apikey).`,
      references: refs,
    };
  }
  try {
    const text = await aiText(prompt, system);
    return { content: text, references: refs };
  } catch (e: any) {
    return { content: `Sorry, AI error: ${e.message}`, references: refs };
  }
}

chatRouter.get('/sessions', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare(`
    SELECT s.id, s.title, s.updated_at,
      (SELECT content FROM chat_messages WHERE session_id=s.id ORDER BY timestamp DESC LIMIT 1) AS last_message
    FROM chat_sessions s WHERE user_id=? ORDER BY updated_at DESC`).all(req.userId!);
  res.json({ sessions: rows });
});

chatRouter.post('/sessions', async (req: AuthedRequest, res) => {
  const materialIds: string[] = Array.isArray(req.body?.materialIds) ? req.body.materialIds : [];
  const id = uid();
  await db.prepare('INSERT INTO chat_sessions (id, user_id, title, material_ids) VALUES (?,?,?,?)')
    .run(id, req.userId!, 'New chat', JSON.stringify(materialIds));
  res.json({ session: { id, title: 'New chat' } });
});

chatRouter.get('/sessions/:id/messages', async (req: AuthedRequest, res) => {
  const session: any = await db.prepare('SELECT * FROM chat_sessions WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const messages: any[] = await db.prepare('SELECT * FROM chat_messages WHERE session_id=? ORDER BY timestamp ASC').all(req.params.id);
  res.json({
    session: { id: session.id, title: session.title, material_ids: session.material_ids },
    messages: messages.map(m => ({
      id: m.id, role: m.role, content: m.content,
      references: JSON.parse(m.references_json || '[]'), timestamp: m.timestamp,
    })),
  });
});

chatRouter.post('/sessions/:id/messages', async (req: AuthedRequest, res) => {
  const session: any = await db.prepare('SELECT * FROM chat_sessions WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'Empty message' });

  const materialIds: string[] = JSON.parse(session.material_ids || '[]');
  const userId = uid();
  const ts = nowIso();
  await db.prepare('INSERT INTO chat_messages (id, session_id, role, content, timestamp) VALUES (?,?,?,?,?)')
    .run(userId, session.id, 'user', content, ts);

  const reply = await generateReply(req.userId!, content, materialIds);
  const aiId = uid();
  const aiTs = nowIso();
  await db.prepare('INSERT INTO chat_messages (id, session_id, role, content, references_json, timestamp) VALUES (?,?,?,?,?,?)')
    .run(aiId, session.id, 'ai', reply.content, JSON.stringify(reply.references), aiTs);

  // Update session title from first user message if still default
  if (session.title === 'New chat') {
    await db.prepare('UPDATE chat_sessions SET title=?, updated_at=? WHERE id=?')
      .run(content.slice(0, 50), aiTs, session.id);
  } else {
    await db.prepare('UPDATE chat_sessions SET updated_at=? WHERE id=?').run(aiTs, session.id);
  }

  res.json({
    userMessage: { id: userId, role: 'user', content, references: [], timestamp: ts },
    aiMessage: { id: aiId, role: 'ai', content: reply.content, references: reply.references, timestamp: aiTs },
  });
});

chatRouter.post('/quick', async (req: AuthedRequest, res) => {
  const content = String(req.body?.content || '').trim();
  const materialIds: string[] = Array.isArray(req.body?.materialIds) ? req.body.materialIds : [];
  if (!content) return res.status(400).json({ error: 'Empty message' });
  const reply = await generateReply(req.userId!, content, materialIds);
  res.json({ content: reply.content, references: reply.references, timestamp: nowIso() });
});

chatRouter.delete('/sessions/:id', async (req: AuthedRequest, res) => {
  await db.prepare('DELETE FROM chat_sessions WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});
