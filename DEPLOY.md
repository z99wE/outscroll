# OutScroll — Deployment Guide

## Prerequisites

Before deploying, you need these configured:

### 1. Supabase (Database)

**What I need from you:**
- Go to https://supabase.com → Create a new project
- Name: `outscroll`
- Database password: (choose something strong)
- Region: (closest to your users)

**Then run the schema:**
1. Go to SQL Editor in Supabase dashboard
2. Paste contents of `backend/schema.sql`
3. Click "Run"

**Get the connection string:**
1. Go to Settings → Database → Connection Pooling
2. Transaction mode connection string (port 6543)
3. Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 2. Environment Variables

Create these in your deployment environment:

| Variable | Where to get it | Example |
|----------|----------------|---------|
| `DATABASE_URL` | Supabase Settings → Database → Connection string | `postgresql://postgres.xxx:password@host:6543/postgres` |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` | `a1b2c3d4e5...` |
| `JWT_REFRESH_SECRET` | Generate with `openssl rand -base64 32` | `f6g7h8i9j0...` |
| `FRONTEND_URL` | Your Vercel deployment URL | `https://outscroll.vercel.app` |
| `PORT` | Set to `3000` for Emergent | `3000` |
| `NODE_ENV` | Set to `production` | `production` |

### 3. GitHub Repo

Already done: https://github.com/z99wE/outscroll.git

---

## Deploy to Emergent

### Step 1: Install Emergent CLI
```bash
npm install -g @emergentco/cli
emergent login
```

### Step 2: Configure emergent.json

The `backend/emergent.json` is already configured:
```json
{
  "runtime": "node18",
  "handler": "server.js",
  "memory": 512,
  "environment": {
    "DATABASE_URL": "${DATABASE_URL}",
    "JWT_SECRET": "${JWT_SECRET}",
    "JWT_REFRESH_SECRET": "${JWT_REFRESH_SECRET}",
    "FRONTEND_URL": "${FRONTEND_URL}",
    "PORT": "3000",
    "NODE_ENV": "production"
  }
}
```

### Step 3: Deploy
```bash
cd backend
emergent deploy
```

### Step 4: Set Environment Variables on Emergent
```bash
emergent env set DATABASE_URL="postgresql://..."
emergent env set JWT_SECRET="$(openssl rand -base64 32)"
emergent env set JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
emergent env set FRONTEND_URL="https://outscroll.vercel.app"
emergent env set NODE_ENV="production"
```

### Step 5: Get Your Backend URL
```bash
emergent logs
# Or check the Emergent dashboard for your deployment URL
```

---

## Deploy Frontend to Vercel

### Step 1: Update API URL
In `frontend/src/App.jsx`, change:
```javascript
const API = '/api'; // ← For local dev with proxy
```
To:
```javascript
const API = 'https://your-emergent-url.emergent.app/api'; // ← Production
```

### Step 2: Deploy
```bash
# Push changes to GitHub
git add -A && git commit -m "Configure production API URL" && git push

# Deploy to Vercel
npx vercel --prod
```

Or connect the GitHub repo to Vercel dashboard for auto-deploys.

---

## Admin Dashboard

After deployment, you'll see the `ADMIN_KEY` in the deploy script output.

**To access the admin dashboard:**
1. Go to your deployed app → Click "Admin" in the nav (or navigate to `/#admin`)
2. Enter the `ADMIN_KEY`
3. You can now:
   - Review pending business submissions
   - Approve or reject businesses (with reason)
   - View all users, stats, and platform metrics

**Admin API endpoints (protected by `X-Admin-Key` header):**
- `GET /api/admin/pending` — List pending business submissions
- `GET /api/admin/users` — List all users
- `GET /api/admin/stats` — Platform statistics
- `PUT /api/admin/review` — Approve/reject a business `{ user_id, action: 'approve'|'reject', rejection_reason? }`

**⚠️ Keep your ADMIN_KEY secret. Anyone with it can approve/reject businesses.**

---

## Security Checklist (Already Implemented)

- [x] JWT access tokens (15min expiry)
- [x] Refresh tokens in httpOnly cookies (7d expiry)
- [x] Password hashing with bcrypt (12 rounds)
- [x] Rate limiting (auth: 20/15min, tracking: 30/min, submissions: 5/hr)
- [x] Account lockout after 5 failed logins (15min)
- [x] Helmet security headers (CSP, X-Frame-Options, etc)
- [x] CORS restricted to frontend domain
- [x] Input validation and sanitization
- [x] Database transactions for atomic operations
- [x] SQL injection prevention (parameterized queries)
- [x] Request logging with morgan
- [x] Graceful shutdown handlers
- [x] Health check endpoint
- [x] Platform URL whitelist for video submissions
- [x] Password strength requirements (8+ chars, uppercase, lowercase, number)
- [x] Admin key authentication (X-Admin-Key header)
- [x] Admin-only endpoints for business approval
