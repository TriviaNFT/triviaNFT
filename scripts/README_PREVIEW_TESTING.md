# Preview Deployment Testing Guide

This directory contains comprehensive testing scripts for validating the Vercel preview deployment.

## Quick Start

### 1. Set Your Preview URL

```bash
export PREVIEW_URL="https://your-preview-url.vercel.app"
```

### 2. Run All Tests

```bash
# Comprehensive test suite (all subtasks)
tsx scripts/test-preview-deployment.ts
```

## Individual Test Scripts

### Environment Variables

Verify all required environment variables are configured:

```bash
tsx scripts/verify-env-vars.ts
```

**Checks:**
- DATABASE_URL
- REDIS_URL and REDIS_TOKEN
- INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY
- BLOCKFROST_PROJECT_ID
- NFT_POLICY_ID
- JWT_SECRET and JWT_ISSUER

### Database Connectivity

Test Neon PostgreSQL connection and operations:

```bash
export DATABASE_URL="postgresql://..."
tsx scripts/test-database-connectivity.ts
```

**Tests:**
- Basic connection
- Health check
- Query execution
- Connection pooling
- Table existence
- Indexes and constraints
- Performance benchmarks

### Redis Connectivity

Test Upstash Redis connection and operations:

```bash
export REDIS_URL="https://..."
export REDIS_TOKEN="..."
tsx scripts/test-redis-connectivity.ts
```

**Tests:**
- Basic connection (PING)
- GET/SET operations
- Expiration (TTL)
- JSON storage
- Hash operations
- List operations
- Performance test
- Session simulation

### Inngest Integration

Test Inngest endpoint and configuration:

```bash
export PREVIEW_URL="https://your-preview.vercel.app"
tsx scripts/test-inngest-integration.ts
```

**Tests:**
- Endpoint accessibility
- Introspection
- Environment variables
- Function registration
- CORS configuration

### E2E Tests

Run full Playwright E2E test suite:

```bash
# Bash
./scripts/run-e2e-preview.sh https://your-preview.vercel.app

# PowerShell
.\scripts\run-e2e-preview.ps1 https://your-preview.vercel.app
```

**Tests:**
- Landing page
- Authentication flows
- Session management
- Leaderboard
- Forging and minting
- Responsive design
- Accessibility
- Performance

## Health Check Endpoint

The preview deployment includes a health check endpoint:

```bash
curl https://your-preview.vercel.app/api/health | jq
```

**Response:**
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
      "configured": ["DATABASE_URL", "REDIS_URL", ...],
      "missing": []
    }
  }
}
```

## Test Workflow

### Recommended Order

1. **Health Check** - Quick overall status
   ```bash
   curl $PREVIEW_URL/api/health | jq
   ```

2. **Environment Variables** - Verify configuration
   ```bash
   tsx scripts/verify-env-vars.ts
   ```

3. **Database** - Test data layer
   ```bash
   tsx scripts/test-database-connectivity.ts
   ```

4. **Redis** - Test cache layer
   ```bash
   tsx scripts/test-redis-connectivity.ts
   ```

5. **Inngest** - Test workflow orchestration
   ```bash
   tsx scripts/test-inngest-integration.ts
   ```

6. **Comprehensive** - Run all automated tests
   ```bash
   tsx scripts/test-preview-deployment.ts
   ```

7. **E2E** - Full user flow testing
   ```bash
   ./scripts/run-e2e-preview.sh $PREVIEW_URL
   ```

## Manual Verification

### Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select TriviaNFT project
3. Check "Deployments" tab
4. Verify:
   - Status: Ready
   - Build time: < 5 minutes
   - No build errors

### Neon Console

1. Go to https://console.neon.tech
2. Select TriviaNFT project
3. Check "Branches" tab
4. Verify:
   - Branch exists for preview
   - Status: Active
   - Connection string available

### Inngest Dashboard

1. Go to https://app.inngest.com
2. Select TriviaNFT app
3. Check "Environments" tab
4. Verify:
   - Sandbox environment exists
   - Webhook URL matches preview
   - Status: Connected
5. Check "Functions" tab
6. Verify:
   - mint-workflow registered
   - forge-workflow registered

## Troubleshooting

### Common Issues

#### Health Check Returns "unhealthy"

**Solution:**
1. Check Vercel function logs
2. Verify environment variables in Vercel dashboard
3. Test database and Redis individually
4. Check service dashboards (Neon, Upstash)

#### Database Connection Fails

**Solution:**
1. Verify DATABASE_URL is set
2. Check Neon database branch is active
3. Verify connection string format
4. Check SSL mode is set to `require`

#### Redis Connection Fails

**Solution:**
1. Verify REDIS_URL and REDIS_TOKEN are set
2. Check Upstash Redis dashboard
3. Verify REST API is enabled
4. Test from Upstash console

#### Inngest Endpoint Not Accessible

**Solution:**
1. Verify INNGEST_SIGNING_KEY is set
2. Check /api/inngest route exists
3. Verify webhook registration in Inngest dashboard
4. Check Vercel function logs

#### E2E Tests Fail

**Solution:**
1. Run health check first
2. Check Vercel function logs
3. Verify environment variables
4. Test individual endpoints manually
5. Check database migrations

## Success Criteria

All tests should pass:

- ✅ Health endpoint returns "healthy"
- ✅ All required env vars configured
- ✅ Database queries execute successfully
- ✅ Redis operations work
- ✅ Inngest endpoint responds
- ✅ Guest user creation works
- ✅ Session creation works
- ✅ Leaderboard accessible
- ✅ No 500 errors
- ✅ E2E tests pass

## Documentation

For more detailed information, see:

- [Quick Verification Guide](../.kiro/specs/vercel-inngest-deployment/QUICK_VERIFICATION.md)
- [Task 20 Summary](../.kiro/specs/vercel-inngest-deployment/TASK_20_SUMMARY.md)
- [Deployment Guide](../.kiro/specs/vercel-inngest-deployment/DEPLOYMENT_GUIDE.md)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check service dashboards (Neon, Upstash, Inngest)
4. Review the comprehensive documentation
5. Run individual test scripts to isolate the issue

---

**Last Updated:** Task 20 completion
**Status:** All test scripts implemented and ready to use
