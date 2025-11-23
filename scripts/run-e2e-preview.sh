#!/bin/bash

# Run E2E tests against preview deployment
# Usage: ./scripts/run-e2e-preview.sh https://your-preview.vercel.app

set -e

PREVIEW_URL=$1

if [ -z "$PREVIEW_URL" ]; then
  echo "❌ Preview URL is required"
  echo "Usage: ./scripts/run-e2e-preview.sh https://your-preview.vercel.app"
  exit 1
fi

echo "🎭 Running E2E Tests Against Preview Deployment"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Preview URL: $PREVIEW_URL"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Set the base URL for Playwright
export PLAYWRIGHT_BASE_URL=$PREVIEW_URL

# Navigate to web app directory
cd apps/web

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "🧪 Running Playwright E2E tests..."
echo ""

# Run E2E tests
pnpm exec playwright test \
  --config=playwright.config.ts \
  --reporter=list \
  --max-failures=5

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo "🎉 All E2E tests passed!"
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
  exit 0
else
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo "❌ Some E2E tests failed"
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check preview deployment logs in Vercel"
  echo "2. Verify all environment variables are set"
  echo "3. Check database and Redis connectivity"
  echo "4. Review test output above for specific failures"
  echo ""
  exit 1
fi
