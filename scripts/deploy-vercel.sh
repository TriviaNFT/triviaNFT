#!/bin/bash

# TriviaNFT - Vercel Deployment Script
# This script deploys your app to Vercel (FREE tier)
# Cost: $0/month for low-medium traffic

set -e

echo "🚀 TriviaNFT Vercel Deployment"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in to Vercel
echo "📝 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo ""
echo "✅ Vercel CLI ready!"
echo ""

# Build the web app
echo "🔨 Building web app..."
cd apps/web
pnpm install
pnpm build

echo ""
echo "📦 Deploying web app to Vercel..."
vercel --prod

echo ""
echo "✅ Web app deployed!"
echo ""

# Note about API deployment
echo "⚠️  API Deployment Note:"
echo "   Your API uses Step Functions which aren't supported on Vercel."
echo "   Options:"
echo "   1. Deploy API to AWS Lambda (recommended)"
echo "   2. Refactor to use Vercel Functions (no Step Functions)"
echo "   3. Use Railway.app for API ($5/month)"
echo ""

# Database setup reminder
echo "📊 Database Setup:"
echo "   1. Sign up at https://neon.tech (FREE)"
echo "   2. Create a PostgreSQL database"
echo "   3. Copy connection string"
echo "   4. Set in Vercel: vercel env add DATABASE_URL"
echo "   5. Run migrations: pnpm --filter @trivia-nft/api migrate:up"
echo ""

# Redis setup reminder
echo "💾 Redis Setup:"
echo "   1. Sign up at https://upstash.com (FREE)"
echo "   2. Create a Redis database"
echo "   3. Copy connection string"
echo "   4. Set in Vercel: vercel env add REDIS_URL"
echo ""

# Blockfrost setup reminder
echo "⛓️  Blockfrost Setup:"
echo "   1. Sign up at https://blockfrost.io (FREE)"
echo "   2. Create a project (Preprod)"
echo "   3. Copy API key"
echo "   4. Set in Vercel: vercel env add BLOCKFROST_PROJECT_ID"
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Set up environment variables in Vercel dashboard"
echo "   2. Configure custom domain (optional)"
echo "   3. Enable analytics (free on Vercel)"
echo ""
echo "🎉 Your app is live!"
