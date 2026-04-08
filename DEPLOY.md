# EventPulse Deployment Guide

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/CosmicTH0R/Event-Schedule.git
cd Event-Schedule
```

## Backend (Railway)

### Environment Variables to set in Railway:
```
NODE_ENV=production
DATABASE_URL=postgresql://...  # Supabase/Railway Postgres connection string
REDIS_URL=rediss://...         # Upstash Redis connection string
JWT_SECRET=<random 64-char string>
CORS_ORIGINS=https://your-app.vercel.app
TMDB_API_KEY=...
FOOTBALL_DATA_KEY=...
CRICKET_API_KEY=...
RAWG_API_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=admin@yourdomain.com
```

### Switch from SQLite to PostgreSQL:
1. Edit `backend/prisma/schema.prisma` — change `provider = "sqlite"` → `provider = "postgresql"`
2. Run `npx prisma migrate dev --name init` locally with your Postgres URL
3. Railway runs `npx prisma migrate deploy` on startup automatically (see railway.toml)

### Generate VAPID keys:
```bash
cd backend && npm run vapid:generate
```
Copy the output into your Railway env vars.

## Frontend (Vercel)

### Environment Variables to set in Vercel:
```
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

### Update API rewrite in vercel.json:
Change `"destination"` to your Railway backend URL.

## Local Development

```bash
# Backend
cd backend && cp .env.example .env
# Fill in API keys in .env
npm install
npm run db:push     # creates SQLite dev.db
npm run db:seed     # seeds categories
npm start           # starts on port 3001

# Frontend (in another terminal)
cd frontend && npm install
npm run dev         # starts on port 3000 (or next available)
```

## CI/CD

GitHub Actions runs automatically on push to `main`:
1. Backend health check test
2. Frontend build test
3. Railway and Vercel auto-deploy (connected via GitHub integration)
