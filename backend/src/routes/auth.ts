import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { signToken, requireAuth, publicUser, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(6).max(200),
  department: z.string().trim().min(1).max(100),
  year: z.string().trim().min(1).max(50),
  university: z.string().trim().min(1).max(200).default('Adekunle Ajasin University (AAUA)'),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  const data = parsed.data;
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const id = uid();
  const hash = await bcrypt.hash(data.password, 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, department, year, university)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, data.name, data.email, hash, data.department, data.year, data.university);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ token: signToken(id), user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password' });
  const { email, password } = parsed.data;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  // Update study streak
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (user.last_active_date === today) {
    // already active today — no change
  } else if (user.last_active_date === yesterday) {
    db.prepare('UPDATE users SET study_streak = study_streak + 1, last_active_date = ? WHERE id = ?').run(today, user.id);
  } else {
    db.prepare('UPDATE users SET study_streak = 1, last_active_date = ? WHERE id = ?').run(today, user.id);
  }
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ token: signToken(user.id), user: publicUser(freshUser) });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId!);
  res.json({ user: publicUser(user) });
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  year: z.string().trim().min(1).max(50),
});

authRouter.put('/profile', requireAuth, (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  const { name, department, year } = parsed.data;
  db.prepare('UPDATE users SET name=?, department=?, year=? WHERE id=?')
    .run(name, department, year, req.userId!);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId!);
  res.json({ user: publicUser(user) });
});

authRouter.put('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const user: any = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId!);
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.userId!);
  res.json({ message: 'Password updated' });
});

authRouter.delete('/account', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId!);
  res.json({ message: 'Account deleted' });
});
