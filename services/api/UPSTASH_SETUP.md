# Upstash Redis Setup Guide

## Overview

This guide walks you through setting up Upstash Redis for the TriviaNFT application. Upstash provides serverless Redis with REST API access, making it perfect for Vercel deployments.

## Prerequisites

- Upstash account (free tier available)
- Access to Vercel project settings (for environment variables)

## Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign in or create a new account
3. Click "Create Database"
4. Configure your database:
   - **Name**: `trivia-nft-redis` (or your preferred name)
   - **Type**: Regional (for lower latency) or Global (for edge caching)
   - **Region**: Choose closest to your primary users
   - **TLS**: Enabled (recommended)
5. Click "Create"

## Step 2: Get Connection Credentials

After creating the database, you'll see the database details page with:

- **UPSTASH_REDIS_REST_URL**: The REST API endpoint
- **UPSTASH_REDIS_REST_TOKEN**: The authentication token

Copy both values - you'll need them for environment variables.

## Step 3: Configure Environment Variables

### For Local Development

Add to `services/api/.env.local`:

```bash
REDIS_URL=https://your-database.upstash.io
REDIS_TOKEN=your-token-here
```


### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `REDIS_URL`: Your Upstash REST URL
   - `REDIS_TOKEN`: Your Upstash REST token
4. Set scope to all environments (Production, Preview, Development)

## Step 4: Test the Connection

Run the test script to verify everything is working:

```bash
cd services/api
pnpm tsx src/scripts/test-upstash-redis.ts
```

This will run comprehensive tests including:
- Connection and health check
- Basic operations (set, get, delete)
- TTL and expiration
- Hash operations
- Set operations
- Edge caching verification
- Error handling

## Step 5: Verify Edge Caching

The test script includes a latency test. For optimal performance:
- Regional databases: < 50ms average latency
- Global databases: < 20ms average latency (with edge caching)

If latency is higher, consider:
1. Using a Global database for edge caching
2. Choosing a region closer to your users
3. Checking your network connection

## Features

### Automatic Retries with Exponential Backoff

The Upstash client is configured with automatic retries:
- Up to 3 retry attempts
- Exponential backoff: 1s, 2s, 4s (max 10s)
- Validates Requirement 2.4

### Edge Caching

Upstash Global databases provide automatic edge caching:
- Data cached at edge locations worldwide
- Sub-10ms latency for cached reads
- Validates Requirement 2.2

### REST API Compatibility

Uses REST API instead of Redis protocol:
- Works in edge functions and serverless environments
- No persistent connections required
- Compatible with Vercel Edge Runtime

## Migration from Traditional Redis

The `UpstashRedisService` maintains API compatibility with the existing `RedisService`:
- All methods have the same signatures
- Drop-in replacement in existing code
- No changes needed to calling code

## Troubleshooting

### Connection Errors

If you see connection errors:
1. Verify REDIS_URL and REDIS_TOKEN are set correctly
2. Check that the URL includes `https://`
3. Ensure the token is copied completely

### High Latency

If latency is higher than expected:
1. Check if you're using a Regional vs Global database
2. Verify the region is close to your deployment
3. Consider upgrading to a Global database for edge caching

### Rate Limiting

Free tier limits:
- 10,000 commands per day
- 256 MB storage

If you hit limits, consider upgrading your Upstash plan.

## Next Steps

After successful setup:
1. Update application code to use `UpstashRedisService`
2. Deploy to Vercel preview environment
3. Monitor performance in Upstash dashboard
4. Configure alerts for errors or rate limits
