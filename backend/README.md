# Study Mate AI — Backend

A free, lightweight Node.js + TypeScript backend for the Study Mate AI frontend.
Built with **Express**, local **SQLite** for development, and optional **Neon/Postgres** for production persistence.

## Stack (all free)

- **Express** – HTTP server
- **SQLite via sql.js** – local development database (single file `data.db`, no setup)
- **Postgres/Neon via `pg`** – recommended production database when `DATABASE_URL` is set
- **JWT + bcryptjs** – authentication
- **multer** – file uploads (stored locally in `uploads/`)
- **pdf-parse** – extract text from PDF materials for AI context
- **Google Gemini (`@google/generative-ai`)** – AI for chat, quiz generation, summarizer, study plans, recommendations. **Free tier** at https://aistudio.google.com/apikey (no card needed).
- **zod, helmet, cors** – validation & basic security

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your free Gemini API key
npm run dev
```

Server starts on `http://localhost:5000`. The Vite dev server (frontend) already proxies `/api` to it (see `vite.config.ts`).

## Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with any Google account
3. Click "Create API Key" — free, no card
4. Paste into `backend/.env` as `GEMINI_API_KEY=...`

The app works without it (auth/quizzes/materials/etc.), but AI chat, quiz generation, summarizer, and study-plan generation will be disabled until you add it.

## Free deployment options

The frontend is static (deploy on Vercel/Netlify/Cloudflare Pages — all free).

For the backend pick one:

| Service | Free tier | Notes |
|---|---|---|
| **Render** | 750 hr/mo free web service | Sleeps after 15 min idle (cold start ~30s) |
| **Railway** | $5 free credit/mo | Stays warm; needs a card after credit runs out |
| **Fly.io** | 3 shared VMs free | No sleep; small learning curve |
| **Your own laptop / school server** | Free forever | Use [ngrok](https://ngrok.com) free tier to expose it |

After deploy, set the frontend env var `VITE_API_URL` (preferred) or `VITE_API_BASE_URL` to your backend URL plus `/api`, for example `https://your-backend.onrender.com/api`. The frontend falls back to `/api` only for local proxy/dev setups.

## Database

The backend now supports two database modes:

1. **Recommended production mode: Neon/Postgres.** Set `DATABASE_URL` to your Neon pooled connection string. The backend will use Postgres and create the required tables at startup. This avoids Render filesystem resets because user data lives in Neon, not inside the Render web-service container.
2. **Local fallback mode: SQLite.** If `DATABASE_URL` is not set, the backend stores SQLite data in `backend/data.db` or in `DB_PATH` if provided. Locally this works because the file stays on your computer. On Render, this file can disappear after a restart, redeploy, or free-instance spin-down unless you attach a persistent disk.

### Neon Postgres setup

1. Create a free Neon project at https://neon.tech.
2. In the Neon dashboard, open **Connection Details**.
3. Choose **Node.js** or **Postgres** and copy the pooled connection string. It usually looks like `postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require`.
4. In Render, open the backend web service and add this environment variable: `DATABASE_URL=<your Neon pooled connection string>`.
5. Keep `JWT_SECRET` set to a long random string and keep `FRONTEND_URL` set to your Vercel URL.
6. Redeploy the backend. The logs should show `[db] Using Postgres database from DATABASE_URL/POSTGRES_URL/NEON_DATABASE_URL`.
7. Create a test account, restart/redeploy the backend, then log in again. If login works, persistence is coming from Neon.

No Neon key is needed in the app code. The only Neon value this backend needs is the database connection string in `DATABASE_URL`.

### Alternative: Render persistent disk setup for SQLite

1. In Render, open the backend **Web Service** for this Express API.
2. Upgrade the service from the Free instance type to any paid instance type because Render does not attach persistent disks to Free web services.
3. Open the service **Disks** settings and add a disk. A small disk is enough for light student-project data; increase it later if file uploads grow.
4. Set the disk mount path to `/var/data`.
5. In the service **Environment** settings, add `DB_PATH=/var/data/studymate/data.db`. The backend creates the `studymate` directory automatically when it starts.
6. Redeploy the backend. In the logs, confirm that it prints `[db] Using SQLite persistent path: /var/data/studymate/data.db`.
7. Create a test account, log out, manually redeploy or restart the Render service, then log in again with the same account. If login still works after the restart, the database is using the persistent disk.

To reset a file-backed database, delete the file and restart. To inspect it, use any SQLite viewer (DB Browser for SQLite is free).

## Endpoints

All under `/api/*`. See `src/lib/api.ts` in the frontend for the full typed contract.

| Group | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/change-password`, `DELETE /auth/account` |
| Materials | `GET /materials`, `POST /materials/upload` (multipart), `GET /materials/:id`, `DELETE /materials/:id` |
| Chat | `GET /chat/sessions`, `POST /chat/sessions`, `GET /chat/sessions/:id/messages`, `POST /chat/sessions/:id/messages`, `POST /chat/quick`, `DELETE /chat/sessions/:id` |
| Quizzes | `GET /quizzes`, `POST /quizzes/generate`, `GET /quizzes/:id`, `POST /quizzes/:id/submit`, `GET /quizzes/:id/attempts` |
| Progress | `GET /progress/stats`, `POST /progress/session` |
| Reminders | `GET/POST /reminders`, `PUT/DELETE /reminders/:id` |
| Resources | `GET/POST /resources`, `PATCH /resources/:id/bookmark`, `DELETE /resources/:id` |
| Leaderboard | `GET /leaderboard` |
| Study Plan | `GET /study-plan`, `GET /study-plan/:id`, `POST /study-plan/generate` |
| Summarizer | `POST /summarizer/text`, `POST /summarizer/material/:id` |
| Recommendations | `GET /recommendations`, `POST /recommendations/generate`, `PATCH /recommendations/:id/complete` |

## Security notes

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with `JWT_SECRET` (change this in production!)
- All non-auth routes require `Authorization: Bearer <token>`
- File uploads limited to 20MB and a safe extension allow-list
- Helmet sets sensible default headers
- Inputs validated with zod
- Each user can only access their own data (enforced in every query via `user_id`)
