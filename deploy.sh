#!/bin/bash
# OutScroll Auto-Deploy Script
# Run this after configuring your environment variables

set -e

echo "🚀 OutScroll Auto-Deploy"
echo "========================"

# Check prerequisites
command -v emergent >/dev/null 2>&1 || { echo "❌ emergent CLI not found. Install: npm install -g @emergentco/cli"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "❌ vercel CLI not found. Install: npm install -g vercel"; exit 1; }

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Set it with:"
  echo "   export DATABASE_URL='postgresql://...'"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "🔑 Generating JWT_SECRET..."
  export JWT_SECRET=$(openssl rand -base64 32)
  echo "   JWT_SECRET=$JWT_SECRET"
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "🔑 Generating JWT_REFRESH_SECRET..."
  export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
fi

if [ -z "$ADMIN_KEY" ]; then
  echo "🔑 Generating ADMIN_KEY..."
  export ADMIN_KEY=$(openssl rand -hex 32)
  echo "   ADMIN_KEY=$ADMIN_KEY"
  echo "   ⚠️  Save this key! You need it to access the admin dashboard."
fi

# Step 1: Deploy backend to Emergent
echo ""
echo "📦 Deploying backend to Emergent..."
cd backend
emergent deploy
echo "✅ Backend deployed!"

# Step 2: Set environment variables
echo ""
echo "🔧 Setting environment variables..."
emergent env set DATABASE_URL="$DATABASE_URL"
emergent env set JWT_SECRET="$JWT_SECRET"
emergent env set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
emergent env set FRONTEND_URL="${FRONTEND_URL:-https://outscroll.vercel.app}"
emergent env set NODE_ENV="production"
emergent env set ADMIN_KEY="$ADMIN_KEY"

# Step 3: Get backend URL
echo ""
echo "📋 Backend URL:"
emergent logs | grep "running on port" || echo "   Check Emergent dashboard for URL"

# Step 4: Build frontend
echo ""
echo "🏗️  Building frontend..."
cd ../frontend
npm run build

# Step 5: Deploy frontend to Vercel
echo ""
echo "🌐 Deploying frontend to Vercel..."
cd ..
vercel --prod

echo ""
echo "✅ Deploy complete!"
echo "   Backend: Check Emergent dashboard"
echo "   Frontend: https://outscroll.vercel.app"
