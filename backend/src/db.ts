// SQLite via sql.js (pure-JS WASM build).
// We wrap sql.js with a tiny better-sqlite3-compatible API so the rest of the
// codebase keeps using `db.prepare(sql).run/get/all(...args)` unchanged.
//
// Persistence: the database lives in memory; after every mutating call we
// serialize the DB to `data.db` on disk. On startup we load that file if it
// exists. This is fine for a small student-project workload.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH env var lets Render/Railway users point to a persistent disk.
// Fallback: store alongside the backend root (outside dist/).
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', 'data.db');
if (process.env.DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  console.log(`[db] Using persistent path: ${dbPath}`);
}

const SQL = await initSqlJs();

const raw: SqlJsDatabase = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database();

// ─── Persistence ─────────────────────────────────────────────────────────────
let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = raw.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e) {
      console.error('Failed to persist sql.js database:', e);
    }
  }, 50);
}

// ─── better-sqlite3-compatible wrapper ──────────────────────────────────────
function flatten(args: any[]): any[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

class Statement {
  constructor(private sql: string) {}

  run(...args: any[]) {
    const stmt = raw.prepare(this.sql);
    try {
      stmt.run(flatten(args));
    } finally {
      stmt.free();
    }
    scheduleSave();
    return { changes: raw.getRowsModified() };
  }

  get(...args: any[]) {
    const stmt = raw.prepare(this.sql);
    try {
      stmt.bind(flatten(args));
      return stmt.step() ? stmt.getAsObject() : undefined;
    } finally {
      stmt.free();
    }
  }

  all(...args: any[]) {
    const stmt = raw.prepare(this.sql);
    const rows: any[] = [];
    try {
      stmt.bind(flatten(args));
      while (stmt.step()) rows.push(stmt.getAsObject());
    } finally {
      stmt.free();
    }
    return rows;
  }
}

export const db = {
  prepare(sql: string) {
    return new Statement(sql);
  },
  exec(sql: string) {
    raw.exec(sql);
    scheduleSave();
  },
  pragma(_p: string) {
    // no-op: sql.js doesn't support WAL; foreign_keys handled below
  },
};

// Enable FK enforcement (PRAGMA via run is supported in sql.js)
raw.run('PRAGMA foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  university TEXT NOT NULL DEFAULT 'Adekunle Ajasin University (AAUA)',
  avatar TEXT,
  study_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size TEXT NOT NULL,
  text_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  upload_date TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  material_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  references_json TEXT NOT NULL DEFAULT '[]',
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL,
  options_json TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'once',
  enabled INTEGER NOT NULL DEFAULT 1,
  condition TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  url TEXT NOT NULL,
  duration TEXT,
  rating REAL DEFAULT 0,
  bookmarked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_date TEXT NOT NULL,
  subject TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  activity_type TEXT,
  score INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ─── Migrations ──────────────────────────────────────────────────────────────
try { db.exec('ALTER TABLE recommendations ADD COLUMN url TEXT'); } catch {}

// Flush on shutdown
function flushSync() {
  try {
    fs.writeFileSync(dbPath, Buffer.from(raw.export()));
  } catch {}
}
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });
process.on('exit', flushSync);
