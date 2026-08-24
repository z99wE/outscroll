# OutScroll Dev Server

## How to reproduce artifacts
1. Ensure PostgreSQL is running locally (port 5432)
2. Copy `.env` from main checkout: `cp /Users/souvikchakraborty/outscroll/backend/.env /path/to/worktree/backend/.env`
3. Copy frontend `.env` if needed: `cp /Users/souvikchakraborty/outscroll/frontend/.env /path/to/worktree/frontend/.env`
4. Install dependencies: `cd backend && npm install && cd ../frontend && npm install`

## How to run the server
```bash
cd /Users/souvikchakraborty/outscroll
npx pm2 start ecosystem.config.js  # Backend on port 3456
cd frontend && npm run build && cd ..
npx pm2 start serve.js --name outscroll-frontend  # Frontend on port 5175
```

## Ports
- Backend API: 3456
- Frontend: 5175
- PostgreSQL: 5432

## Notes
- Backend uses pm2 ecosystem.config.js
- Frontend is served via a simple Node.js static server (serve.js) with API proxy to port 3456
- Both services managed by pm2
