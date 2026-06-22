# AI Study Companion

An academic learning platform for university students featuring AI-powered study tools: automated lecture summarization, flashcard generation with spaced repetition, quiz generation with scoring analytics, personalized study plans, and collaborative study groups.

---

## Features

- **PDF Lecture Upload** — Upload lecture PDFs; text is extracted and stored for AI processing
- **AI Lecture Summaries** — Generates structured summaries with key topics and important terms
- **Flashcard Generation** — AI creates flashcards from lecture summaries
- **Spaced Repetition** — SM-2 algorithm schedules flashcard reviews based on recall difficulty
- **Quiz Generation** — AI generates 10-question multiple-choice quizzes from lecture content
- **Quiz Scoring & History** — Tracks scores per quiz with per-question correctness and topic tagging
- **Study Plans** — AI-generated personalized study plans based on exam dates and weak areas
- **Study Groups** — Create groups, invite members via email, share flashcards/quizzes/lectures
- **Sharing** — Share flashcard and quiz sets via link (public or private); recipients can duplicate to their library
- **Analytics Dashboard** — Tracks study progress, quiz scores, flashcard review stats
- **Course Management** — Organize lectures by course with exam dates
- **Notes** — Per-lecture personal notes
- **Comments** — Discussion threads on shared content

---

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM (PostgreSQL)
- Groq API (LLaMA 3.3 70B) — AI generation (summaries, flashcards, quizzes, study plans)
- Supabase Storage — PDF file storage
- Nodemailer — Email invitations (Gmail SMTP)
- JWT (jsonwebtoken) — Authentication
- bcrypt — Password hashing
- multer — File upload handling
- pdf-parse — PDF text extraction
- express-rate-limit — API rate limiting
- Sentry — Error tracking

**Frontend:**
- React 18 + TypeScript
- Vite — Build tool and dev server
- Tailwind CSS — Styling
- React Router v6 — Client-side routing
- TanStack React Query — Server state management
- Zustand — Client state management
- Axios — HTTP client
- Lucide React — Icons

---

## System Dependencies

| Dependency | Required Version | Notes |
|------------|-----------------|-------|
| Node.js | >= 20 | Specified in `backend/package.json` engines |
| npm | >= 9 | Ships with Node 20+ |
| PostgreSQL | >= 14 | Via Supabase or local install |
| Git | Any recent | Version control |

No Docker required — the app runs directly with Node.js and connects to a remote PostgreSQL (Supabase).

---

## Prerequisites

1. **Supabase account** (free tier) — provides PostgreSQL database and file storage
2. **Groq API key** — for AI generation (free tier available at [console.groq.com](https://console.groq.com))
3. **Gmail account** (optional) — for sending study group invitation emails via app password
4. **Sentry DSN** (optional) — for error tracking in production

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd AI-Study-Companion

# Install backend dependencies
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooling) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection (for migrations) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key (frontend use) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side storage) |
| `GROQ_API_KEY` | Yes | Groq API key for LLM access |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `NODE_ENV` | No | `development` or `production` (default: development) |
| `PORT` | No | Server port (default: 3000) |
| `CORS_ORIGIN` | No | Comma-separated allowed origins |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 3600000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |
| `EMAIL_SERVICE` | No | Nodemailer service name (default: gmail) |
| `EMAIL_USER` | No | SMTP username (email address) |
| `EMAIL_PASSWORD` | No | SMTP password / app password |
| `EMAIL_FROM` | No | From address for outgoing emails |
| `FRONTEND_URL` | No | Frontend URL for email links (default: http://localhost:5173) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g., `http://localhost:3000`) |
| `VITE_SUPABASE_URL` | No | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anonymous key |

---

## Running the System

### Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev          # Starts Express with tsx watch (hot reload)

# Terminal 2 — Frontend
cd frontend
npm run dev          # Starts Vite dev server at http://localhost:5173
```

### Database Migrations

```bash
cd backend
npx prisma migrate dev          # Apply migrations (creates tables)
npx prisma studio               # Visual database browser
```

### Production

```bash
# Backend
cd backend
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output: node dist/index.js

# Frontend
cd frontend
npm run build        # Outputs to dist/ (static files)
npm run preview      # Preview production build locally
```

---

## Build Instructions

```bash
# Backend (TypeScript → JavaScript)
cd backend
npm run build                    # tsc → dist/

# Frontend (React → static bundle)
cd frontend
npm run build                    # tsc && vite build → dist/
```

---

## Testing Instructions

```bash
# Backend unit tests
cd backend
npm run test                     # vitest

# Type checking
cd backend
npm run type-check               # tsc --noEmit

cd frontend
npm run type-check               # tsc --noEmit

# Linting
cd backend
npm run lint                     # eslint src

cd frontend
npm run lint                     # eslint src
```

---

## Project Structure

```
AI-Study-Companion/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Express app entry, middleware setup, route registration
│   │   ├── lib/
│   │   │   └── prisma.ts            # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT auth middleware (required + optional variants)
│   │   │   └── errorHandler.ts      # Global error handler + asyncHandler utility
│   │   ├── routes/
│   │   │   ├── auth.ts              # Register, login, logout
│   │   │   ├── courses.ts           # CRUD courses
│   │   │   ├── lectures.ts          # PDF upload, summary generation
│   │   │   ├── flashcards.ts        # Generate, review (spaced repetition), CRUD
│   │   │   ├── quiz.ts              # Generate, submit, history
│   │   │   ├── analytics.ts         # User study analytics
│   │   │   ├── notes.ts             # Per-lecture notes
│   │   │   ├── study-plans.ts       # AI study plan generation
│   │   │   ├── study-groups.ts      # Group CRUD, invitations, material sharing
│   │   │   ├── sharing.ts           # Public/private sharing via tokens
│   │   │   └── comments.ts          # Discussion comments
│   │   ├── services/
│   │   │   ├── claude.service.ts    # Groq LLM integration (summaries, flashcards, quizzes, plans)
│   │   │   ├── pdf.service.ts       # PDF text extraction
│   │   │   ├── storage.service.ts   # Supabase Storage (PDF upload/delete)
│   │   │   ├── email.ts             # Nodemailer invitation emails
│   │   │   └── spaced-repetition.service.ts  # SM-2 scheduling algorithm
│   │   └── utils/
│   │       └── response.ts          # Standardized API response helpers
│   ├── prisma/
│   │   └── schema.prisma            # Database schema (all models)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root component, routing setup
│   │   ├── pages/                   # Page-level components
│   │   ├── components/              # Reusable UI components
│   │   ├── services/
│   │   │   └── api.ts              # Axios instance + API functions
│   │   └── store/
│   │       └── auth.ts             # Zustand auth state (persisted to localStorage)
│   ├── index.html
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## API Overview

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/logout` | Logout (client-side token removal) |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List user's courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/:id` | Get course details |
| PATCH | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course (cascades) |

### Lectures
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lectures?courseId=` | List lectures for course |
| POST | `/api/lectures/upload` | Upload PDF (multipart) |
| GET | `/api/lectures/:id` | Get lecture details |
| PATCH | `/api/lectures/:id` | Update lecture |
| GET | `/api/lectures/:id/summary` | Get or generate AI summary |
| DELETE | `/api/lectures/:id` | Delete lecture + storage file |

### Flashcards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flashcards?lectureId=` | Get flashcards for lecture |
| GET | `/api/flashcards/user/all` | Get all user's flashcards |
| GET | `/api/flashcards/due` | Get flashcards due for review |
| POST | `/api/flashcards/generate` | Generate flashcards from summary |
| PATCH | `/api/flashcards/:id/review` | Submit review (easy/hard/again) |
| DELETE | `/api/flashcards/:id` | Delete flashcard |

### Quiz
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quiz/generate` | Generate quiz from summary |
| POST | `/api/quiz/submit` | Submit quiz answers |
| GET | `/api/quiz/history` | Get all quiz history |
| GET | `/api/quiz/lecture/:lectureId` | Get quiz history for lecture |

### Study Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/study-plans` | Get current study plan |
| POST | `/api/study-plans/generate` | Generate AI study plan |
| DELETE | `/api/study-plans` | Delete study plan |

### Study Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/study-groups` | List user's groups |
| POST | `/api/study-groups` | Create group |
| GET | `/api/study-groups/:id` | Get group details |
| PATCH | `/api/study-groups/:id` | Update group |
| DELETE | `/api/study-groups/:id` | Delete group (owner only) |
| POST | `/api/study-groups/:id/invite` | Invite users by email/ID |
| POST | `/api/study-groups/invitations/accept/:token` | Accept invitation |
| POST | `/api/study-groups/:id/leave` | Leave group |
| DELETE | `/api/study-groups/:id/members/:userId` | Remove member |
| POST | `/api/study-groups/:id/flashcard-set` | Share flashcards to group |
| POST | `/api/study-groups/:id/quiz-set` | Share quizzes to group |
| POST | `/api/study-groups/:id/lecture` | Share lectures to group |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sharing/flashcard-set` | Create shareable flashcard set |
| POST | `/api/sharing/quiz-set` | Create shareable quiz set |
| PATCH | `/api/sharing/flashcard/:id/toggle-public` | Toggle public access |
| PATCH | `/api/sharing/quiz/:id/toggle-public` | Toggle public access |
| POST | `/api/sharing/flashcard/:id/share-with` | Share with specific users |
| POST | `/api/sharing/quiz/:id/share-with` | Share with specific users |
| GET | `/api/sharing/flashcard/:shareToken` | Get shared flashcard set |
| GET | `/api/sharing/quiz/:shareToken` | Get shared quiz set |
| GET | `/api/sharing/flashcard/public/:shareToken` | Get public flashcard set |
| GET | `/api/sharing/quiz/public/:shareToken` | Get public quiz set |
| POST | `/api/sharing/flashcard/:id/duplicate` | Duplicate to my library |
| POST | `/api/sharing/quiz/:id/duplicate` | Duplicate to my library |
| POST | `/api/sharing/quiz/:shareToken/submit` | Submit quiz attempt |
| GET | `/api/sharing/flashcards/shared-with-me` | Content shared with me |
| GET | `/api/sharing/quizzes/shared-with-me` | Content shared with me |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/me` | Get user analytics |

---

## Deployment Notes

### Backend

The backend is designed for deployment on platforms like **Railway**, **Render**, or any Node.js hosting:

1. Set all required environment variables (see table above)
2. Build: `npm run build`
3. Start: `npm start` (runs `node dist/index.js`)
4. Ensure `DATABASE_URL` points to a production PostgreSQL instance
5. Run migrations: `npx prisma migrate deploy`

### Frontend

The frontend is a static SPA suitable for **Vercel**, **Netlify**, or any static hosting:

1. Set `VITE_API_URL` to the production backend URL
2. Build: `npm run build`
3. Deploy the `dist/` directory
4. Configure SPA fallback (all routes → `index.html`)

### Database

- Uses **Supabase** for managed PostgreSQL and file storage
- The `DIRECT_URL` env var is used for Prisma migrations (bypasses connection pooling)
- Supabase Storage bucket `lecture-pdfs` must be created manually in the Supabase dashboard

---

## Troubleshooting

### Backend won't start
- Verify all required env vars are set (especially `DATABASE_URL`, `GROQ_API_KEY`)
- Run `npx prisma generate` if you see Prisma client errors
- Check port 3000 is not in use: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)

### Frontend won't load
- Verify `VITE_API_URL` in `.env.local` points to a running backend
- Clear browser cache / hard reload
- Check browser console for CORS errors — ensure `CORS_ORIGIN` includes your frontend URL

### PDF upload fails
- Check file is a valid PDF under 10MB (JSON body limit)
- Verify Supabase Storage bucket `lecture-pdfs` exists
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)

### AI generation fails / returns empty
- Verify `GROQ_API_KEY` is valid at [console.groq.com](https://console.groq.com)
- Check Groq rate limits (free tier: ~30 requests/minute)
- The service retries with exponential backoff on 429 errors; persistent failures return fallback data

### Email invitations not sending
- `EMAIL_USER` and `EMAIL_PASSWORD` must be set (use Gmail app password, not account password)
- Enable "Less secure apps" or create an app password at https://myaccount.google.com/apppasswords
- The app still functions without email — existing users are added directly to groups

### Database migration errors
- Ensure `DIRECT_URL` is set (some hosts block direct connections)
- Run `npx prisma migrate reset` for a clean slate (destroys data)

---

## Known Limitations

- **Single LLM provider** — Only Groq (LLaMA 3.3 70B) is supported; no fallback to other providers
- **No real-time updates** — Study groups don't have WebSocket/SSE; members must refresh to see new shared content
- **Stateless JWT** — Tokens cannot be revoked server-side (logout is client-side only)
- **PDF-only uploads** — No support for DOCX, PPT, or other file formats
- **No pagination** — Large flashcard/quiz sets load fully (may be slow for heavy users)
- **Email-bound invitations** — Study group invitations are tied to the invited email; the accepting user must have registered with that exact email
- **Single study plan** — Each user has at most one active plan (new generation replaces the old)

---

## License

MIT
