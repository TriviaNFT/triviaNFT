# TriviaNFT - Vercel Deployment Script (PowerShell)
# This script deploys your app to Vercel (FREE tier)
# Cost: $0/month for low-medium traffic

Write-Host "🚀 TriviaNFT Vercel Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "📝 Checking Vercel CLI..." -ForegroundColor Yellow
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI found!" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Check if logged in to Vercel
Write-Host "📝 Checking Vercel authentication..." -ForegroundColor Yellow
try {
    vercel whoami | Out-Null
    Write-Host "✅ Logged in to Vercel!" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please log in to Vercel:" -ForegroundColor Yellow
    vercel login
}

Write-Host ""

# Build the web app
Write-Host "🔨 Building web app..." -ForegroundColor Yellow
Set-Location apps/web
pnpm install
pnpm build

Write-Host ""
Write-Host "📦 Deploying web app to Vercel..." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "✅ Web app deployed!" -ForegroundColor Green
Write-Host ""

# Note about API deployment
Write-Host "⚠️  API Deployment Note:" -ForegroundColor Yellow
Write-Host "   Your API uses Step Functions which aren't supported on Vercel."
Write-Host "   Options:"
Write-Host "   1. Deploy API to AWS Lambda (recommended)"
Write-Host "   2. Refactor to use Vercel Functions (no Step Functions)"
Write-Host "   3. Use Railway.app for API (`$5/month)"
Write-Host ""

# Database setup reminder
Write-Host "📊 Database Setup:" -ForegroundColor Cyan
Write-Host "   1. Sign up at https://neon.tech (FREE)"
Write-Host "   2. Create a PostgreSQL database"
Write-Host "   3. Copy connection string"
Write-Host "   4. Set in Vercel: vercel env add DATABASE_URL"
Write-Host "   5. Run migrations: pnpm --filter @trivia-nft/api migrate:up"
Write-Host ""

# Redis setup reminder
Write-Host "💾 Redis Setup:" -ForegroundColor Cyan
Write-Host "   1. Sign up at https://upstash.com (FREE)"
Write-Host "   2. Create a Redis database"
Write-Host "   3. Copy connection string"
Write-Host "   4. Set in Vercel: vercel env add REDIS_URL"
Write-Host ""

# Blockfrost setup reminder
Write-Host "⛓️  Blockfrost Setup:" -ForegroundColor Cyan
Write-Host "   1. Sign up at https://blockfrost.io (FREE)"
Write-Host "   2. Create a project (Preprod)"
Write-Host "   3. Copy API key"
Write-Host "   4. Set in Vercel: vercel env add BLOCKFROST_PROJECT_ID"
Write-Host ""

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Set up environment variables in Vercel dashboard"
Write-Host "   2. Configure custom domain (optional)"
Write-Host "   3. Enable analytics (free on Vercel)"
Write-Host ""
Write-Host "🎉 Your app is live!" -ForegroundColor Green
