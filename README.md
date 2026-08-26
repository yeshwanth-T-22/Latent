# Latent — AI Learning Companion

> **The gap between what students *think* they understand and what they *actually* understand goes undetected until exam day. Latent makes it visible, early.**

---

## Problem Statement

Students routinely overestimate their own understanding — a well-documented cognitive phenomenon. Traditional study tools measure *effort* (time spent, pages read) but not *comprehension quality*. A student can feel 80% confident about a topic while genuinely understanding only 40% of it. This gap only surfaces at exams, when it's too late.

**Latent detects the confidence–understanding gap in real time**, session by session, giving students and their mentors an honest, AI-assessed picture of where learning is solid and where it is fragile.

---

## Domain

**Open Innovation with AI / Education Technology**

Latent targets students in secondary and pre-university education (Years 9–12). The platform is designed for independent student use, with a read-only mentor/parent view for accountability.

---

## Features & Social Impact

| Feature | What it does | Measurable impact |
|---|---|---|
| **Doubt Solver** | Students ask questions; Gemini answers calibrated to their confidence level | Always-available AI tutor, reduces study friction |
| **Confidence Check** | 2-question AI quiz; evaluates *reasoning quality*, not just answer correctness | Detects false confidence before exams |
| **Explain-Back Mode** | Student explains in their own words; Gemini scores clarity and completeness | Activates the protégé effect — teaching is the deepest learning |
| **Weekly Weak-Spot Report** | Auto-generates personalised revision plans where confidence and understanding diverge | Converts vague "study more" into specific tasks |
| **Voice Input** | Students speak their questions or explanations | Lowers barrier for verbal thinkers |
| **Mentor/Parent View** | Read-only dashboard with understanding trends and AI progress note | Enables informed, encouraging conversations |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React + TypeScript |
| **API / Backend** | Cloudflare Pages Functions (Workers) |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **AI** | Google Gemini 2.0 Flash |
| **Voice** | Google Cloud Speech-to-Text REST API |
| **Hosting** | Cloudflare Pages |

---

## Project Structure

```
latent/
├── src/                          # Vite + React frontend
│   ├── App.tsx                   # All pages (wired to real API + auth)
│   ├── api.ts                    # Typed API client with Supabase Auth
│   ├── types.ts                  # TypeScript types
│   └── index.css                 # Custom design system
├── functions/                    # Cloudflare Pages Functions (API routes)
│   ├── _middleware.ts            # CORS middleware
│   └── api/
│       ├── _shared/
│       │   ├── supabase.ts       # Supabase helpers + DB CRUD
│       │   └── gemini.ts         # Gemini prompt helpers
│       ├── doubt.ts              # POST /api/doubt
│       ├── explain.ts            # POST /api/explain
│       ├── report.ts             # GET /api/report
│       ├── mentor.ts             # GET /api/mentor
│       ├── voice.ts              # POST /api/voice
│       └── confidence/
│           ├── quiz.ts           # GET /api/confidence/quiz
│           └── submit.ts         # POST /api/confidence/submit
├── supabase/
│   └── schema.sql                # Full database schema + RLS policies
├── public/                       # Static assets
├── wrangler.toml                 # Cloudflare Pages build config
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Clone and install deps
```bash
npm install
```

### 2. Set up Supabase database
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API

### 3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

`/.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Run locally with Wrangler (Pages Functions + frontend together)
```bash
npm run preview
# Or for live dev with Pages Functions:
npx wrangler pages dev dist --compatibility-date=2024-01-01 \
  --binding GEMINI_API_KEY=your_key \
  --binding SUPABASE_URL=https://xxx.supabase.co \
  --binding SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  --binding SUPABASE_ANON_KEY=your_anon_key
```

> **Tip for simple frontend dev:** Run `npm run dev` to use the Vite dev server. API calls will fail until Wrangler is running — that's expected.

---

## Deploy to Cloudflare Pages

### 1. Connect your GitHub repo to Cloudflare Pages
1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. **Create a project** → Connect to Git → Select your repo
3. Build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

### 2. Set environment variables in Cloudflare Pages dashboard
In your Pages project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → service_role key |
| `SUPABASE_ANON_KEY` | From Supabase → Settings → API → anon key |
| `GOOGLE_SPEECH_API_KEY` | (Optional) For voice transcription |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY |

> Note: `VITE_*` variables are used at **build time** for the frontend bundle. The non-prefixed ones are used at **runtime** by the Workers functions.

### 3. Deploy
Push to your main branch — Cloudflare auto-deploys on every push.

---

## API Endpoints

All endpoints require a `Authorization: Bearer <supabase_jwt>` header.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/doubt` | Ask a question; returns Gemini answer |
| `GET` | `/api/confidence/quiz?topic=` | Generate 2-question topic quiz |
| `POST` | `/api/confidence/submit` | Submit answers + reasoning; returns evaluation |
| `POST` | `/api/explain` | Submit explanation; returns structured feedback |
| `GET` | `/api/report` | Weekly report with revision plans |
| `GET` | `/api/mentor` | Mentor view with trends + AI note |
| `POST` | `/api/voice` | Transcribe audio to text |

---

## Database Schema (Supabase)

Three tables with Row Level Security (each user sees only their own data):

- **`profiles`** — display name, year group (auto-created on signup)
- **`topics`** — one row per (student, topic), stores `confidence_score` + `true_understanding_score`
- **`history`** — one row per interaction (doubt / quiz / explainback) with `true_score`

Run `supabase/schema.sql` in the Supabase SQL Editor to create all tables, policies, and triggers.

---

## Environment Variables Reference

### Build-time (frontend, VITE_ prefix)
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Runtime (Workers/Functions)
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Supabase anon key (for auth verification) |
| `GOOGLE_SPEECH_API_KEY` | Optional — Google Cloud Speech-to-Text API key |
