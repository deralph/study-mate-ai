import { randomUUID } from 'node:crypto';
import { db } from './db.js';

export const uid = () => randomUUID();
export const nowIso = () => new Date().toISOString();

// Date as YYYY-MM-DD in Nigerian time (so the day changes at midnight in Lagos, not UTC)
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

// Call whenever the user is active. Adds +1 for a new consecutive day,
// resets to 1 after a missed day, and does nothing if already counted today.
export async function touchStreak(userId: string) {
  const user: any = await db.prepare('SELECT study_streak, last_active_date FROM users WHERE id=?').get(userId);
  if (!user) return;
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (user.last_active_date === today) return;
  const next = user.last_active_date === yesterday ? Number(user.study_streak || 0) + 1 : 1;
  await db.prepare('UPDATE users SET study_streak=?, last_active_date=? WHERE id=?').run(next, today, userId);
}