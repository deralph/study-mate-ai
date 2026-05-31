import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    year: u.year,
    university: u.university,
    avatar: u.avatar ?? undefined,
    study_streak: u.study_streak,
    level: u.level,
    points: u.points,
  };
}
