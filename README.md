<div align="center">

# 🧠 Latent — AI Learning Companion

**The gap between what students *think* they understand and what they *actually* understand goes undetected until exam day. Latent makes it visible, early.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Functions-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[Live Demo](https://latent-5uk.pages.dev) · [Report Bug](https://github.com/yeshwanth-T-22/Latent/issues)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Domain](#-domain)
- [Features & Social Impact](#-features--social-impact)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Deploying to Cloudflare Pages](#-deploying-to-cloudflare-pages)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🎯 Problem Statement

Students routinely overestimate their own understanding — a well-documented cognitive phenomenon known as the [Dunning–Kruger effect](https://en.wikipedia.org/wiki/Dunning%E2%80%93Kruger_effect). Traditional study tools measure *effort* (time spent, pages read) but not *comprehension quality*. A student can feel 80% confident about a topic while genuinely understanding only 40% of it. This gap only surfaces at exams, when it's too late.

**Latent detects the confidence-understanding gap in real time**, session by session, giving students and their mentors an honest, AI-assessed picture of where learning is solid and where it is fragile.

---

## 🌍 Domain

**Open Innovation with AI / Education Technology**

Latent targets students in secondary and pre-university education (Years 9–12). The platform is designed for independent student use, with a read-only mentor/parent view for accountability.

---

## ✨ Features & Social Impact

| Feature | What it does | Measurable Impact |
|---|---|---|
| **Doubt Solver** | Students ask questions; Gemini answers calibrated to their confidence level | Always-available AI tutor, reduces study friction |
| **Confidence Check** | 2-question AI quiz; evaluates *reasoning quality*, not just answer correctness | Detects false confidence before exams |
| **Explain-Back Mode** | Student explains in their own words; Gemini scores clarity and completeness | Activates the [protégé effect](https://en.wikipedia.org/wiki/Prot%C3%A9g%C3%A9_effect) — teaching is the deepest learning |
| **Weekly Weak-Spot Report** | Auto-generates personalised revision plans where confidence and understanding diverge | Converts vague "study more" into specific tasks |
| **Voice Input** | Students speak their questions or explanations | Lowers barrier for verbal thinkers |
| **Mentor/Parent View** | Read-only dashboard with understanding trends and AI progress note | Enables informed, encouraging conversations |
| **Session Persistence** | Active sessions (chats, quizzes, explanations) are saved to the database in real time | Students can pick up exactly where they left off across devices |
| **Error Boundaries** | Graceful fallback UI when unexpected errors occur | No blank white screens — users always see actionable feedback |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vite + React 18 + TypeScript                        │  │
│  │  • SPA with client-side routing                      │  │
│  │  • Supabase Auth (JWT)                               │  │
│  │  • Real-time state sync                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │  HTTPS + Bearer JWT
                      ▼
┌────────────────────────────────────────────────────────────┐
│              Cloudflare Pages (Edge Network)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Static Assets (dist/)                               │  │
│  │  • index.html, CSS, JS bundles                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pages Functions (functions/api/)                    │  │
│  │  • /api/doubt          → Gemini AI chat              │  │
│  │  • /api/confidence/*   → Quiz generation + grading   │  │
│  │  • /api/explain        → Explain-back evaluation     │  │
│  │  • /api/report         → Weekly weak-spot report     │  │
│  │  • /api/mentor         → Mentor dashboard data       │  │
│  │  • /api/profile        → User profile CRUD           │  │
│  │  • /api/dashboard      → Overview statistics         │  │
│  │  • /api/voice          → Speech-to-text proxy        │  │
│  │  • /api/topics/state   → Session state persistence   │  │
│  └──────────┬──────────────────────────┬────────────────┘  │
└─────────────┼──────────────────────────┼───────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│   Google Gemini API  │   │      Supabase (PostgreSQL)   │
│                      │   │                              │
│  • gemini-2.0-flash  │   │  • profiles table            │
│  • Content generation│   │  • topics table (with JSONB) │
│  • Quiz evaluation   │   │  • history table             │
│  • Explanation       │   │  • Row Level Security (RLS)  │
│    scoring           │   │  • Auth (email + JWT)        │
│                      │   │  • Auto-create profile       │
│                      │   │    trigger on signup         │
└──────────────────────┘   └──────────────────────────────┘
```

**Key architectural decisions:**
- **Edge-first**: All API logic runs on Cloudflare's edge network (<50ms latency worldwide) via [Pages Functions](https://developers.cloudflare.com/pages/functions/)
- **Zero backend servers**: No Express, no Node.js server — just serverless functions
- **JWT-based auth**: Every API request is authenticated via Supabase JWT tokens
- **JSONB state columns**: Active session data is stored as JSON directly in the `topics` table, enabling instant cross-device sync without a separate sessions table

---

## 🛠️ Tech Stack

| Layer | Technology | Official Link |
|---|---|---|
| **Frontend** | React 18 + TypeScript | [react.dev](https://react.dev/) |
| **Build Tool** | Vite 6 | [vite.dev](https://vite.dev/) |
| **Icons** | Lucide React | [lucide.dev](https://lucide.dev/) |
| **API / Backend** | Cloudflare Pages Functions | [developers.cloudflare.com/pages/functions](https://developers.cloudflare.com/pages/functions/) |
| **Database** | Supabase PostgreSQL | [supabase.com](https://supabase.com/) |
| **Auth** | Supabase Auth | [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth) |
| **AI** | Google Gemini 2.0 Flash | [ai.google.dev](https://ai.google.dev/) |
| **AI SDK** | @google/generative-ai | [npmjs.com/package/@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) |
| **Voice** | Google Cloud Speech-to-Text | [cloud.google.com/speech-to-text](https://cloud.google.com/speech-to-text) |
| **Hosting** | Cloudflare Pages | [pages.cloudflare.com](https://pages.cloudflare.com/) |
| **Testing** | Vitest + Testing Library | [vitest.dev](https://vitest.dev/) |
| **Error Handling** | react-error-boundary | [npmjs.com/package/react-error-boundary](https://www.npmjs.com/package/react-error-boundary) |
| **Linting** | ESLint + typescript-eslint | [eslint.org](https://eslint.org/) |

---

## 📁 Project Structure

```
latent/
├── src/                          # Vite + React frontend
│   ├── App.tsx                   # All pages (wired to real API + auth)
│   ├── api.ts                    # Typed API client with Supabase Auth
│   ├── types.ts                  # TypeScript interfaces
│   ├── ErrorBoundaryFallback.tsx  # Graceful error UI
│   ├── main.tsx                  # React entry point with ErrorBoundary
│   ├── index.css                 # Custom design system (no Tailwind)
│   ├── api.test.ts               # Unit tests
│   └── setupTests.ts             # Vitest setup
├── functions/                    # Cloudflare Pages Functions (API routes)
│   ├── _middleware.ts            # CORS middleware
│   └── api/
│       ├── _shared/
│       │   ├── supabase.ts       # Supabase helpers, auth, DB CRUD
│       │   └── gemini.ts         # Gemini prompt helpers with timeout
│       ├── doubt.ts              # POST /api/doubt
│       ├── explain.ts            # POST /api/explain
│       ├── report.ts             # GET  /api/report
│       ├── mentor.ts             # GET  /api/mentor
│       ├── profile.ts            # GET/PATCH /api/profile
│       ├── dashboard.ts          # GET  /api/dashboard
│       ├── voice.ts              # POST /api/voice
│       ├── confidence/
│       │   ├── quiz.ts           # GET  /api/confidence/quiz
│       │   └── submit.ts         # POST /api/confidence/submit
│       └── topics/
│           └── state.ts          # GET/PATCH /api/topics/state
├── supabase/
│   └── schema.sql                # Full database schema + RLS + triggers
├── public/                       # Static assets (favicon, icons)
├── vite.config.ts                # Vite + Vitest config
├── wrangler.toml                 # Cloudflare Pages build config
├── tsconfig.json                 # TypeScript config
├── eslint.config.js              # ESLint config
├── LICENSE                       # MIT License
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| **Node.js** | 20+ (22 recommended) | [nodejs.org](https://nodejs.org/) |
| **npm** | 10+ (comes with Node) | — |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

You will also need:
- A free [Supabase](https://supabase.com/) project
- A free [Google AI Studio](https://aistudio.google.com/) API key

### Step 1: Clone the repository

```bash
git clone https://github.com/yeshwanth-T-22/Latent.git
cd Latent
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor** and paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Click **Run** — this creates all tables, RLS policies, and triggers
4. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon / public key** (starts with `eyJhbGci...`)
   - **service_role key** (starts with `eyJhbGci...` — keep this secret!)

### Step 4: Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Create `.dev.vars` for the backend (Cloudflare Workers):

```env
GEMINI_API_KEY=your_google_ai_studio_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
```

### Step 5: Build & run locally

```bash
# Build the frontend
npm run build

# Start the full-stack local server (frontend + API)
npx wrangler pages dev dist --compatibility-date=2024-01-01
```

The app will be available at **http://localhost:8788**.

> **Tip:** For frontend-only development with hot reload, use `npm run dev`. API calls will fail until Wrangler is also running.

---

## 🗄️ Database Setup

The database schema is defined in [`supabase/schema.sql`](./supabase/schema.sql). It creates:

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profile data | `display_name`, `year_group`, `avatar_color` |
| `topics` | Per-student topic tracking | `confidence_score`, `true_understanding_score`, `doubt_state` (JSONB), `quiz_state` (JSONB), `explain_state` (JSONB) |
| `history` | Interaction log | `interaction_type` (doubt/quiz/explainback), `true_score`, `notes` |

### Security

- **Row Level Security (RLS)** is enabled on all tables
- Each user can only read/write their own data
- Backend uses the `service_role` key to bypass RLS for admin operations

### Triggers

- `handle_new_user()` — automatically creates a `profiles` row when a user signs up via Supabase Auth
- `update_updated_at()` — automatically sets `updated_at` on row updates

---

## ☁️ Deploying to Cloudflare Pages

### Step 1: Connect GitHub

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click **Create a project** → **Connect to Git**
3. Select your `Latent` repository

### Step 2: Configure build settings

| Setting | Value |
|---|---|
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### Step 3: Set environment variables

In **Settings → Environment variables**, add all of the following (no quotes around values):

| Variable | Purpose |
|---|---|
| `NODE_VERSION` | `22` |
| `VITE_SUPABASE_URL` | Your Supabase project URL (build-time, baked into frontend bundle) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (build-time) |
| `SUPABASE_URL` | Your Supabase project URL (runtime, used by Functions) |
| `SUPABASE_ANON_KEY` | Your Supabase anon key (runtime, for JWT verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (runtime, bypasses RLS) |
| `GEMINI_API_KEY` | Your Google AI Studio API key (runtime) |

> **Why duplicates?** `VITE_` prefixed variables are embedded at build time by Vite into the JS bundle. Non-prefixed variables are read at runtime by the Cloudflare Workers backend. Both are required.

### Step 4: Configure Supabase redirect

In your **Supabase Dashboard → Authentication → URL Configuration**, set the **Site URL** to your Cloudflare Pages URL (e.g. `https://latent-5uk.pages.dev`).

### Step 5: Deploy

Push to `main` — Cloudflare auto-deploys on every push. 🚀

---

## 📡 API Reference

All endpoints require an `Authorization: Bearer <supabase_jwt>` header.

| Method | Path | Description | Request Body |
|---|---|---|---|
| `POST` | `/api/doubt` | Ask a question | `{ topic, question, confidence }` |
| `GET` | `/api/confidence/quiz?topic=X` | Generate a 2-question quiz | — |
| `POST` | `/api/confidence/submit` | Submit quiz answers | `{ topic, questions, answers }` |
| `POST` | `/api/explain` | Submit an explanation | `{ topic, explanation, confidence }` |
| `GET` | `/api/report` | Weekly weak-spot report | — |
| `GET` | `/api/mentor` | Mentor dashboard data | — |
| `GET` | `/api/dashboard` | Overview stats + streak | — |
| `GET` | `/api/profile` | Fetch user profile | — |
| `PATCH` | `/api/profile` | Update profile | `{ display_name?, year_group?, avatar_color? }` |
| `GET` | `/api/topics/state?topic=X` | Fetch session state | — |
| `PATCH` | `/api/topics/state` | Save session state | `{ topic, feature, state }` |
| `POST` | `/api/voice` | Transcribe audio | `FormData` with audio file |

---

## 🔐 Environment Variables

### Build-time (frontend — `VITE_` prefix)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Runtime (Cloudflare Workers Functions)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Supabase anon key (for JWT verification) |
| `GOOGLE_SPEECH_API_KEY` | *(Optional)* [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text) API key |

---

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/) for unit testing.

```bash
# Run all tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run linting
npm run lint

# Type-check without emitting
npm run typecheck
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- `npm run lint` passes with zero errors
- `npm run test` passes
- `npm run build` succeeds

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgements

- [React](https://react.dev/) — UI library
- [Vite](https://vite.dev/) — Frontend build tool
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Supabase](https://supabase.com/) — Open-source Firebase alternative (Auth + PostgreSQL)
- [Google Gemini](https://ai.google.dev/) — Generative AI model
- [Cloudflare Pages](https://pages.cloudflare.com/) — Edge deployment platform
- [Lucide](https://lucide.dev/) — Icon library
- [Vitest](https://vitest.dev/) — Unit testing framework
- [react-error-boundary](https://www.npmjs.com/package/react-error-boundary) — Declarative error boundaries
- [Dunning–Kruger Effect](https://en.wikipedia.org/wiki/Dunning%E2%80%93Kruger_effect) — The cognitive bias that inspired this project
- [Protégé Effect](https://en.wikipedia.org/wiki/Prot%C3%A9g%C3%A9_effect) — The learning science behind Explain-Back mode
