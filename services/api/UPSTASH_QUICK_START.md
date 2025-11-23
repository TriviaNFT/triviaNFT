# Upstash Redis Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Create Database
1. Go to https://console.upstash.com/
2. Click "Create Database"
3. Name: `trivia-nft-redis`
4. Type: **Global** (for edge caching)
5. Click "Create"

### 2. Copy Credentials
From the database details page, copy:
- **UPSTASH_REDIS_REST_URL**
- **UPSTASH_REDIS_REST_TOKEN**

### 3. Set Environment Variables
Create or update `services/api/.env.local`:
```bash
REDIS_URL=https://your-endpoint.upstash.io
REDIS_TOKEN=AXXXabc...your-token-here
```

### 4. Test Connection
```bash
cd services/api
pnpm test:upstash
```

### 5. Expected Output
```
✅ Initialize Upstash Redis client
✅ Health check (PING)
✅ Set and Get string value
✅ Set with TTL (expire)
✅ Delete key
... (15 tests total)

Test Summary
============
Total: 15
Passed: 15 ✅
Failed: 0 ❌
Success Rate: 100.0%
```

## 📊 Performance Targets

- **Global Database**: < 20ms average latency
- **Regional Database**: < 50ms average latency
- **All tests**: Should pass in < 30 seconds

## 🔧 Troubleshooting

**Tests fail?**
- Check environment variables are set correctly
- Verify URL starts with `https://`
- Ensure token is copied completely (no spaces)

**High latency?**
- Use Global database for edge caching
- Check your internet connection
- Verify region selection

## 📚 Full Documentation

- Setup Guide: `UPSTASH_SETUP.md`
- Verification Results: `UPSTASH_VERIFICATION_RESULTS.md`
- Service Code: `src/services/upstash-redis-service.ts`
- Test Script: `src/scripts/test-upstash-redis.ts`

## ✅ Task Completion

Once all tests pass, mark task 2 as complete and proceed to task 6 (Update Redis client to Upstash).
