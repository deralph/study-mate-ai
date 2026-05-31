// Database adapter.
//
// Production: set DATABASE_URL to a Neon/Postgres connection string. The backend
// will use Postgres so data survives Render restarts/redeploys.
// Local/default fallback: SQLite via sql.js persisted to data.db, so the app can
// still run without a cloud database during development.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

type QueryValue = string | number | boolean | Uint8Array | null | undefined;
type QueryResult = { changes: number };

type Queryable = {
  prepare(sql: string): {
    run(...args: QueryValue[]): Promise<QueryResult>;
    get(...args: QueryValue[]): Promise<any | undefined>;
    all(...args: QueryValue[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
  pragma(p: string): Promise<void>;
};

const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
const usingPostgres = Boolean(postgresUrl);

function flatten(args: any[]): any[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function toPostgresSql(sql: string): string {
  let index = 0;
  return sql
    .replace(/\?/g, () => `$${++index}`)
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/date\('now','-13 days'\)/gi, "(CURRENT_DATE - INTERVAL '13 days')")
    .replace(/date\(created_at\)/gi, '(created_at::date)')
    .replace(/strftime\('%Y-W%W',\s*completed_at\)/gi, `to_char(completed_at::timestamp, 'IYYY-\"W\"IW')`)
    .replace(/completed=1/g, 'completed = 1')
    .replace(/enabled=1/g, 'enabled = 1');
}

async function createPostgresDb(): Promise<Queryable> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
  const { Pool } = await dynamicImport('pg');
  const pool = new Pool({
    connectionString: postgresUrl,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  console.log('[db] Using Postgres database from DATABASE_URL/POSTGRES_URL/NEON_DATABASE_URL');

  return {
    prepare(sql: string) {
      const text = toPostgresSql(sql);
      return {
        async run(...args: QueryValue[]) {
          const result = await pool.query(text, flatten(args));
          return { changes: result.rowCount ?? 0 };
        },
        async get(...args: QueryValue[]) {
          const result = await pool.query(text, flatten(args));
          return result.rows[0];
        },
        async all(...args: QueryValue[]) {
          const result = await pool.query(text, flatten(args));
          return result.rows;
        },
      };
    },
    async exec(sql: string) {
      await pool.query(toPostgresSql(sql));
    },
    async pragma(_p: string) {
      // no-op for Postgres
    },
  };
}

async function createSqliteDb(): Promise<Queryable> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // DB_PATH env var lets Render/Railway users point to a persistent disk.
  // Fallback: store alongside the backend root (outside dist/).
  const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', 'data.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  if (process.env.DB_PATH) {
    console.log(`[db] Using SQLite persistent path: ${dbPath}`);
  } else if (process.env.NODE_ENV === 'production') {
    console.warn(
      `[db] DATABASE_URL and DB_PATH are not set; using ${dbPath}. ` +
        'On hosts with ephemeral filesystems (for example Render without a persistent disk), data will be lost after restarts or redeploys.',
    );
  }

  const SQL = await initSqlJs();
  const raw: SqlJsDatabase = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

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

  function flushSync() {
    try {
      fs.writeFileSync(dbPath, Buffer.from(raw.export()));
    } catch {}
  }

  process.on('SIGINT', () => { flushSync(); process.exit(0); });
  process.on('SIGTERM', () => { flushSync(); process.exit(0); });
  process.on('exit', flushSync);

  raw.run('PRAGMA foreign_keys = ON');

  return {
    prepare(sql: string) {
      return {
        async run(...args: QueryValue[]) {
          const stmt = raw.prepare(sql);
          try {
            stmt.run(flatten(args));
          } finally {
            stmt.free();
          }
          scheduleSave();
          return { changes: raw.getRowsModified() };
        },
        async get(...args: QueryValue[]) {
          const stmt = raw.prepare(sql);
          try {
            stmt.bind(flatten(args));
            return stmt.step() ? stmt.getAsObject() : undefined;
          } finally {
            stmt.free();
          }
        },
        async all(...args: QueryValue[]) {
          const stmt = raw.prepare(sql);
          const rows: any[] = [];
          try {
            stmt.bind(flatten(args));
            while (stmt.step()) rows.push(stmt.getAsObject());
          } finally {
            stmt.free();
          }
          return rows;
        },
      };
    },
    async exec(sql: string) {
      raw.exec(sql);
      scheduleSave();
    },
    async pragma(_p: string) {
      // no-op: sql.js doesn't support WAL; foreign_keys handled above
    },
  };
}

export const db: Queryable = usingPostgres ? await createPostgresDb() : await createSqliteDb();

const sqliteNow = "datetime('now')";
const postgresNow = 'CURRENT_TIMESTAMP::text';
const nowDefault = usingPostgres ? postgresNow : sqliteNow;

// ─── Schema ──────────────────────────────────────────────────────────────────
await db.exec(`
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
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  cloudinary_public_id TEXT,
  cloudinary_resource_type TEXT,
  file_size TEXT NOT NULL,
  text_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  upload_date TEXT NOT NULL DEFAULT (${nowDefault})
);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  material_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (${nowDefault}),
  updated_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  references_json TEXT NOT NULL DEFAULT '[]',
  timestamp TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
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
  completed_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'once',
  enabled INTEGER NOT NULL DEFAULT 1,
  condition TEXT,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
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
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
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
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_date TEXT NOT NULL,
  subject TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  activity_type TEXT,
  score INTEGER,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);

CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);
CREATE INDEX IF NOT EXISTS idx_timetables_user ON timetables(user_id);

CREATE TABLE IF NOT EXISTS exam_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_date TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${nowDefault})
);
CREATE INDEX IF NOT EXISTS idx_exam_plans_user ON exam_plans(user_id);
`);

// ─── Migrations ──────────────────────────────────────────────────────────────
try { await db.exec('ALTER TABLE recommendations ADD COLUMN url TEXT'); } catch {}
try { await db.exec('ALTER TABLE materials ADD COLUMN file_url TEXT'); } catch {}
try { await db.exec('ALTER TABLE materials ADD COLUMN cloudinary_public_id TEXT'); } catch {}
try { await db.exec('ALTER TABLE materials ADD COLUMN cloudinary_resource_type TEXT'); } catch {}
