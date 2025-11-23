# Quick Verification Guide for Preview Deployment

This guide provides quick commands to verify the preview deployment is working correctly.

## Prerequisites

1. Preview deployment is live on Vercel
2. You have the preview URL (e.g., `https://trivia-nft-git-vercel-inngest-migration-*.vercel.app`)

## Quick Health Check

### 1. Check Overall Health

```bash
# Replace with your actual preview URL
export PREVIEW_URL="https://your-preview-url.vercel.app"

# Quick health check
curl $PREVIEW_URL/api/health | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "preview",
  "checks": {
    "database": true,
    "redis": true,
    "inngest": true,
    "envVars": {
      "configured": [
        "DATABASE_URL",
        "REDIS_URL",
        "REDIS_TOKEN",
        "INNGEST_EVENT_KEY",
        "INNGEST_SIGNING_KEY",
        "BLOCKFROST_PROJECT_ID",
        "NFT_POLICY_ID",
        "JWT_SECRET",
        "JWT_ISSUER"
      ],
      "missing": []
    }
  }
}
```

### 2. Run Full Test Suite

```bash
# Set your preview URL
export PREVIEW_URL="https://your-preview-url.vercel.app"

# Run the comprehensive test script
tsx scripts/test-preview-deployment.ts
```

This will test:
- ✅ Environment variables configuration
- ✅ Database connectivity and queries
- ✅ Redis connectivity and operations
- ✅ Inngest endpoint accessibility
- ✅ Critical user flows (guest auth, sessions, leaderboard)

## Manual Verification Steps

### Subtask 20.1: Environment Variables

```bash
# Check environment variables via health endpoint
curl $PREVIEW_URL/api/health | jq '.checks.envVars'
```

**What to verify:**
- All required variables in `configured` array
- `missing` array is empty

### Subtask 20.2: Database Connectivity

```bash
# Test database connection
curl $PREVIEW_URL/api/health | jq '.checks.database'

# Test actual database query (leaderboard)
curl $PREVIEW_URL/api/leaderboard/global
```

**What to verify:**
- `database: true` in health check
- Leaderboard returns data or 401 (auth required)
- No 500 errors

### Subtask 20.3: Redis Connectivity

```bash
# Test Redis via guest user creation (uses Redis for session)
curl -X POST $PREVIEW_URL/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{}'
```

**What to verify:**
- Returns 200/201 status
- Response includes `token` and `player` fields
- No Redis connection errors

### Subtask 20.4: Inngest Integration

```bash
# Check Inngest endpoint
curl $PREVIEW_URL/api/inngest

# Should return Inngest registration info or 405 for GET
```

**What to verify:**
- Endpoint responds (not 404)
- Status is 200, 405, or similar (not 500)
- Check Inngest dashboard for webhook registration

**Inngest Dashboard Checks:**
1. Go to https://app.inngest.com
2. Select your app
3. Check "Environments" tab
4. Verify sandbox environment for preview
5. Check "Functions" tab - should show 2 functions:
   - `mint-workflow`
   - `forge-workflow`

### Subtask 20.5: E2E Critical Flows

```bash
# Test complete guest user flow
# 1. Create guest user
TOKEN=$(curl -s -X POST $PREVIEW_URL/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.token')

echo "Token: $TOKEN"

# 2. Start a session
curl -X POST $PREVIEW_URL/api/sessions/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"categoryId": 1}'

# 3. Check leaderboard
curl $PREVIEW_URL/api/leaderboard/global
```

**What to verify:**
- Guest user creation succeeds
- Token is generated
- Session can be started
- Leaderboard is accessible

## Vercel Dashboard Checks

### 1. Deployment Status

1. Go to https://vercel.com/dashboard
2. Select TriviaNFT project
3. Go to "Deployments" tab
4. Find your preview deployment
5. Verify:
   - ✅ Status: Ready
   - ✅ Build time: < 5 minutes
   - ✅ No build errors in logs

### 2. Environment Variables

1. In Vercel Dashboard → Settings → Environment Variables
2. Verify all required variables are set for Preview environment:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `REDIS_TOKEN`
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
   - `BLOCKFROST_PROJECT_ID`
   - `NFT_POLICY_ID`
   - `JWT_SECRET`
   - `JWT_ISSUER`

### 3. Function Logs

1. In deployment details, click "Functions" tab
2. Check recent invocations
3. Look for any errors or warnings

## Neon Dashboard Checks

### 1. Database Branch

1. Go to https://console.neon.tech
2. Select TriviaNFT project
3. Go to "Branches" tab
4. Verify:
   - ✅ Branch exists for preview deployment
   - ✅ Status: Active
   - ✅ Connection string available

### 2. Query Performance

1. In Neon Console → Monitoring
2. Check query performance metrics
3. Verify no slow queries or errors

## Inngest Dashboard Checks

### 1. Environment Setup

1. Go to https://app.inngest.com
2. Select TriviaNFT app
3. Go to "Environments" tab
4. Verify:
   - ✅ Sandbox environment exists
   - ✅ Webhook URL matches preview URL
   - ✅ Status: Connected

### 2. Function Registration

1. Go to "Functions" tab
2. Verify 2 functions registered:
   - ✅ `mint-workflow`
   - ✅ `forge-workflow`
3. Check function details for correct configuration

## Troubleshooting

### Issue: Health check returns "unhealthy"

**Solution:**
1. Check Vercel function logs for errors
2. Verify environment variables are set
3. Check Neon database is accessible
4. Verify Upstash Redis is configured

### Issue: Database connection fails

**Solution:**
1. Verify `DATABASE_URL` is set in Vercel
2. Check Neon database branch is active
3. Verify connection string format
4. Check Vercel function logs for specific error

### Issue: Redis connection fails

**Solution:**
1. Verify `REDIS_URL` and `REDIS_TOKEN` are set
2. Check Upstash Redis dashboard
3. Verify REST API is enabled
4. Test Redis connection from Upstash console

### Issue: Inngest endpoint not accessible

**Solution:**
1. Verify `/api/inngest` route exists in deployment
2. Check `INNGEST_SIGNING_KEY` is set
3. Verify Inngest webhook is registered
4. Check Inngest dashboard for connection status

### Issue: E2E tests fail

**Solution:**
1. Run health check first to identify failing component
2. Check Vercel function logs for specific errors
3. Verify all environment variables are correct
4. Test individual endpoints manually
5. Check database migrations ran successfully

## Success Criteria

All of the following should be true:

- ✅ Health endpoint returns `"status": "healthy"`
- ✅ All required environment variables configured
- ✅ Database queries execute successfully
- ✅ Redis operations work
- ✅ Inngest endpoint responds correctly
- ✅ Guest user creation works
- ✅ Session creation works
- ✅ Leaderboard accessible
- ✅ No 500 errors in any endpoint
- ✅ Vercel deployment status: Ready
- ✅ Neon database branch: Active
- ✅ Inngest functions: Registered

## Next Steps

Once all verifications pass:

1. ✅ Mark task 20 as complete
2. ⏭️ Proceed to task 21: Checkpoint
3. 📝 Document any issues or learnings
4. 🎉 Celebrate successful preview deployment!

## Full Playwright E2E Tests

To run the complete E2E test suite against the preview deployment:

```bash
# Set the base URL to your preview deployment
export PLAYWRIGHT_BASE_URL=$PREVIEW_URL

# Run E2E tests
cd apps/web
pnpm test:e2e
```

This will run all existing Playwright tests against the preview deployment.
