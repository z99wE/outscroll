# OutScroll

A free leaderboard for engagement. Post one short-form link per day. Climb the ladder by watching others' content.

## Core Loop

1. **Creators** post TikTok/Instagram/YouTube links (1/day, free)
2. **Watchers** earn points by watching others' content
3. **Leaderboard** ranks users by engagement points, not followers

## Points System

| Action | Points | Notes |
|--------|--------|-------|
| Click play | +5 | Start watching |
| Watch 50% | +70 | Halfway through |
| Full watch | +100 | Entire video |
| Skip before 50% | -5 | Penalty for abandoning |

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Emergent (backend) + Vercel (frontend)

## Quick Start

### Backend

```bash
cd backend
npm install
# Set up .env with your Supabase DATABASE_URL and JWT_SECRET
# Run schema.sql in Supabase SQL Editor
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deployment

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `schema.sql` in the SQL Editor
3. Copy your connection string to `backend/.env`

### 2. Backend (Emergent)

```bash
npm install -g @emergentco/cli
emergent login
cd backend
emergent deploy
```

### 3. Frontend (Vercel)

```bash
git push origin main
# Vercel auto-deploys, or:
npx vercel
```

Update the API URL in the frontend if needed.

## Design

Styled with the CRED NeoPop design system - dark neumorphic UI with serif headings, sharp corners, and high contrast.
