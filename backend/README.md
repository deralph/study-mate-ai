# Study Mate AI — Backend

A free, lightweight Node.js + TypeScript backend for the Study Mate AI frontend.
Built with **Express + SQLite** so you can run the whole stack on one laptop with zero hosting cost.

## Stack (all free)

- **Express** – HTTP server
- **better-sqlite3** – embedded SQL database (single file `data.db`, no setup)
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

After deploy, set the frontend env var `VITE_API_BASE_URL` to your backend URL (or update `vite.config.ts` proxy / `src/lib/api.ts` BASE_URL).

## Database

A single file: `backend/data.db`. To reset, delete the file and restart. To inspect, use any SQLite viewer (DB Browser for SQLite is free).

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
