# EventPulse

> Your personalized live event calendar — F1, sports, movies, gaming & more.

EventPulse is a full-stack event discovery platform that aggregates live data from multiple external APIs into a single, personalized feed. Users can browse, search, bookmark, and receive push notifications for events across categories like motorsport, football, cricket, movies, TV shows, gaming, esports, and music.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

- **Live Data Aggregation** — Cron-powered refresh from TMDB, football-data.org, CricketData, Jolpica F1, and RAWG APIs
- **Personalized Feed** — User preference-based event filtering with My Feed and Explore views
- **Search & Explore** — Full-text search across all events with category/subcategory filters
- **Calendar View** — Browse events by date with a monthly calendar interface
- **Authentication** — JWT-based auth with email/password and Google OAuth, refresh token rotation
- **Bookmarks & Reminders** — Save events and get timed email/push reminders before they start
- **Push Notifications** — Web Push via VAPID keys with subscription management
- **Live Events Banner** — Real-time SSE-powered banner highlighting events happening now
- **PWA Support** — Installable with offline shell caching and service worker
- **Redis Caching** — Tiered cache TTLs per data source for fast responses
- **Rate Limiting** — Per-IP and per-route rate limiting via express-rate-limit
- **Monitoring** — Sentry error tracking on both frontend and backend, structured Pino logging
- **Dark/Light Theme** — Client-side theme toggle with system preference detection

---

## Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| **Frontend**   | Next.js 14, React 18, Tailwind CSS 3 |
| **State**      | Zustand                               |
| **Backend**    | Node.js, Express 4, TypeScript        |
| **Database**   | PostgreSQL (via Prisma ORM)           |
| **Cache**      | Redis (Upstash / ioredis)             |
| **Auth**       | JWT + bcrypt + Google OAuth           |
| **Validation** | Zod                                   |
| **Scheduler**  | node-cron                             |
| **Push**       | web-push (VAPID)                      |
| **Email**      | Nodemailer                            |
| **Monitoring** | Sentry, Pino                          |
| **Testing**    | Vitest, Supertest                     |
| **Hosting**    | Railway (API), Vercel (Frontend)      |

---

## Architecture

```
Browser ──► Next.js Frontend (Vercel)
                  │
                  │  /api/* rewrite
                  ▼
            Express API (Railway)
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   PostgreSQL   Redis    External APIs
   (Prisma)    (Cache)   (TMDB, F1, Football,
                          Cricket, RAWG, etc.)
                               ▲
                          node-cron
                       (auto-refresh)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 LTS
- **npm** ≥ 9
- **PostgreSQL** 15+ (local or managed — Supabase, Neon, etc.)
- **Redis** (optional for dev — Upstash free tier recommended)

### Backend Setup

```bash
cd backend
cp .env.example .env        # Fill in your API keys and database URL
npm install
npx prisma generate         # Generate Prisma Client
npx prisma db push          # Create/sync database schema
npm run db:seed             # Seed categories and static events
npm run dev                 # Starts on http://localhost:3001
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:3000
```

The frontend proxies `/api/*` requests to the backend at `localhost:3001` via Next.js rewrites.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable             | Description                          | Required |
| -------------------- | ------------------------------------ | -------- |
| `DATABASE_URL`       | PostgreSQL connection string         | Yes      |
| `REDIS_URL`          | Redis connection string              | No       |
| `JWT_SECRET`         | Secret for signing JWTs              | Yes      |
| `PORT`               | Server port (default: 3001)          | No       |
| `NODE_ENV`           | `development` or `production`        | No       |
| `CORS_ORIGINS`       | Comma-separated allowed origins      | No       |
| `TMDB_API_KEY`       | The Movie Database API key           | No       |
| `FOOTBALL_DATA_KEY`  | football-data.org API key            | No       |
| `CRICKET_API_KEY`    | CricketData.org API key              | No       |
| `RAWG_API_KEY`       | RAWG Video Games Database API key    | No       |
| `VAPID_PUBLIC_KEY`   | Web Push VAPID public key            | No       |
| `VAPID_PRIVATE_KEY`  | Web Push VAPID private key           | No       |
| `VAPID_EMAIL`        | Contact email for VAPID              | No       |
| `EMAIL_HOST`         | SMTP host for email reminders        | No       |
| `EMAIL_PORT`         | SMTP port (default: 587)             | No       |
| `EMAIL_USER`         | SMTP username                        | No       |
| `EMAIL_PASS`         | SMTP password                        | No       |
| `SENTRY_DSN`         | Sentry DSN for backend               | No       |

### Frontend (`frontend/.env.local`)

| Variable                   | Description                     | Required |
| -------------------------- | ------------------------------- | -------- |
| `NEXT_PUBLIC_API_URL`      | Backend URL (default: localhost) | No       |
| `NEXT_PUBLIC_SENTRY_DSN`   | Sentry DSN for frontend          | No       |

---

## Available Scripts

### Backend

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start dev server with hot reload (tsx)   |
| `npm run build`        | Compile TypeScript to `dist/`            |
| `npm start`            | Start production server                  |
| `npm test`             | Run tests with Vitest                    |
| `npm run test:watch`   | Run tests in watch mode                  |
| `npm run test:coverage`| Run tests with coverage report           |
| `npm run db:generate`  | Regenerate Prisma Client                 |
| `npm run db:push`      | Push schema changes to database          |
| `npm run db:migrate`   | Run pending Prisma migrations            |
| `npm run db:seed`      | Seed categories and static events        |
| `npm run db:seed:live` | Fetch & seed live data from external APIs|
| `npm run db:studio`    | Open Prisma Studio GUI                   |
| `npm run db:reset`     | Reset DB and re-seed                     |
| `npm run vapid:generate` | Generate VAPID key pair               |

### Frontend

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start Next.js dev server     |
| `npm run build`   | Create production build      |
| `npm start`       | Start production server      |
| `npm run lint`    | Run ESLint                   |

---

## API Routes

### Public

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/api/health`                | Health check                       |
| GET    | `/api/categories`            | List all categories & subcategories|
| GET    | `/api/events`                | List events (paginated, filterable)|
| GET    | `/api/events/live`           | SSE stream of live events          |
| GET    | `/api/events/:id`            | Get single event by ID             |
| GET    | `/api/events/search`         | Search events by query             |

### Auth

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| POST   | `/api/auth/register`         | Register with email/password       |
| POST   | `/api/auth/login`            | Login and receive tokens           |
| POST   | `/api/auth/google`           | Google OAuth login                 |
| POST   | `/api/auth/refresh`          | Refresh access token               |
| POST   | `/api/auth/logout`           | Revoke refresh token               |

### Authenticated

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/api/user/preferences`      | Get user preferences               |
| PUT    | `/api/user/preferences`      | Update category preferences        |
| GET    | `/api/user/bookmarks`        | List bookmarked events             |
| POST   | `/api/user/bookmarks`        | Bookmark an event                  |
| DELETE | `/api/user/bookmarks/:eventId` | Remove bookmark                  |
| GET    | `/api/user/reminders`        | List reminders                     |
| POST   | `/api/user/reminders`        | Set a reminder for an event        |
| DELETE | `/api/user/reminders/:eventId` | Remove reminder                  |
| POST   | `/api/push/subscribe`        | Register push subscription         |
| DELETE | `/api/push/subscribe`        | Unregister push subscription       |

---

## Database Schema

The PostgreSQL database is managed by Prisma and contains the following models:

- **Category / Subcategory** — Event taxonomy (F1, Football, Movies, etc.)
- **CachedEvent** — Events fetched from external APIs, indexed by date, category, and source
- **User** — Accounts with email/password or Google OAuth
- **UserPreference** — Per-user category subscriptions
- **Bookmark** — Saved events per user
- **Reminder** — Timed reminders with email/push delivery tracking
- **PushSubscription** — Web Push endpoints per user
- **RefreshToken** — Revocable refresh tokens (hashed)

See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) for the full schema.

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to Railway
2. Set all required environment variables (see above)
3. Railway auto-detects the `railway.toml` config:
   - Builds with Nixpacks: `npm ci && npx prisma generate`
   - Starts with: `npx prisma migrate deploy && node src/server.js`
   - Health check at `/api/health`

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. Update the rewrite destination in `vercel.json` to your Railway URL
4. Vercel auto-builds with `next build`

### Generate VAPID Keys

```bash
cd backend && npm run vapid:generate
```

Copy the output public/private keys into your environment variables.

For the full deployment guide, see [`DEPLOY.md`](DEPLOY.md).

---

## Project Structure

```
Event-Schedule/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.ts                # Category & event seeder
│   │   └── events.json            # Static fallback events
│   ├── src/
│   │   ├── server.ts              # Express app entry point
│   │   ├── config.ts              # Environment configuration
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── types.ts               # Shared TypeScript types
│   │   ├── routes/                # API route handlers
│   │   │   ├── events.ts          # Event CRUD + search + SSE
│   │   │   ├── categories.ts      # Category listing
│   │   │   ├── auth.ts            # Auth (register/login/OAuth)
│   │   │   ├── user.ts            # User prefs/bookmarks/reminders
│   │   │   ├── push.ts            # Push subscription management
│   │   │   ├── admin.ts           # Admin refresh endpoints
│   │   │   └── health.ts          # Health check
│   │   ├── services/              # External API integrations
│   │   │   ├── f1Service.ts       # Jolpica F1 API
│   │   │   ├── tmdbService.ts     # TMDB Movies & TV
│   │   │   ├── footballService.ts # football-data.org
│   │   │   ├── cricketService.ts  # CricketData.org
│   │   │   ├── gamingService.ts   # RAWG API
│   │   │   ├── esportsService.ts  # Esports events
│   │   │   ├── musicService.ts    # Music/concert events
│   │   │   ├── liveService.ts     # SSE live event stream
│   │   │   ├── cacheService.ts    # Redis cache wrapper
│   │   │   ├── emailService.ts    # Nodemailer email sender
│   │   │   └── pushService.ts     # Web Push dispatcher
│   │   ├── middleware/             # Express middleware
│   │   │   ├── auth.ts            # JWT verification
│   │   │   ├── rateLimiter.ts     # Rate limiting
│   │   │   ├── validate.ts        # Zod request validation
│   │   │   └── errorHandler.ts    # Global error handler
│   │   ├── utils/
│   │   │   ├── logger.ts          # Pino structured logging
│   │   │   └── normalizer.ts      # API → CachedEvent normalizer
│   │   ├── cron/
│   │   │   └── scheduler.ts       # node-cron job definitions
│   │   └── __tests__/             # Vitest test suites
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── railway.toml
├── frontend/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                  # Service worker
│   │   └── icons/                 # App icons
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── page.tsx           # Home (redirects to /today)
│   │   │   ├── layout.tsx         # Root layout with sidebar
│   │   │   ├── today/             # Today's events
│   │   │   ├── my-feed/           # Personalized feed
│   │   │   ├── explore/           # Browse all events
│   │   │   ├── calendar/          # Calendar view
│   │   │   ├── search/            # Search results
│   │   │   ├── event/[id]/        # Event detail page
│   │   │   ├── preferences/       # Category preferences
│   │   │   ├── signin/            # Sign in page
│   │   │   └── signup/            # Sign up page
│   │   ├── components/            # Reusable React components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # API client & utilities
│   │   └── store/                 # Zustand state stores
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vercel.json
├── DEPLOY.md                      # Deployment guide
├── PLAN.md                        # Production roadmap
└── README.md                      # ← You are here
```

---

## License

This project is for educational and portfolio purposes.
