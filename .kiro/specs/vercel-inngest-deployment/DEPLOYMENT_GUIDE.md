# Vercel Preview Deployment Guide

## Overview

This guide walks through deploying the TriviaNFT application to Vercel preview environment to verify the migration from AWS to Vercel + Inngest.

## Prerequisites

Before deploying, ensure:

1. ✅ All previous tasks (1-18) are completed
2. ✅ Vercel account is created and connected to GitHub repository
3. ✅ Neon PostgreSQL database is set up
4. ✅ Upstash Redis is configured
5. ✅ Inngest account is created and connected to Vercel
6. ✅ All environment variables are configured in Vercel

## Deployment Steps

### Step 1: Create Feature Branch

```bash
# Create and checkout feature branch
git checkout -b vercel-inngest-migration

# Stage all changes
git add .

# Commit changes
git commit -m "feat: migrate to Vercel + Inngest architecture"

# Push to remote
git push -u origin vercel-inngest-migration
```

### Step 2: Verify Vercel Preview Deployment

Once the branch is pushed, Vercel will automatically:

1. **Detect the push** and start a preview deployment
2. **Run the build** using the `vercel-build` script
3. **Deploy to preview URL** (e.g., `trivia-nft-git-vercel-inngest-migration-username.vercel.app`)

**Check deployment status:**
- Visit Vercel Dashboard: https://vercel.com/dashboard
- Navigate to your project
- Check the "Deployments" tab for the preview deployment
- Monitor build logs for any errors

### Step 3: Verify Neon Database Branch

Neon automatically creates a database branch for preview deployments:

1. **Visit Neon Console**: https://console.neon.tech
2. **Navigate to your project**
3. **Check "Branches" tab** - you should see a new branch named after your Git branch
4. **Verify connection string** is automatically provided to Vercel preview

**Expected behavior:**
- Branch name: `vercel-inngest-migration` (or similar)
- Status: Active
- Connection string: Automatically injected into preview environment

### Step 4: Verify Inngest Sandbox Environment

Inngest creates a sandbox environment for preview deployments:

1. **Visit Inngest Dashboard**: https://app.inngest.com
2. **Navigate to your app**
3. **Check "Environments" tab** - you should see a sandbox environment
4. **Verify webhook endpoint** is registered for the preview deployment

**Expected behavior:**
- Environment name: Based on preview deployment URL
- Webhook URL: `https://[preview-url].vercel.app/api/inngest`
- Status: Connected
- Functions registered: `mint-workflow`, `forge-workflow`

## Verification Checklist

After deployment completes, verify:

- [ ] Preview deployment URL is accessible
- [ ] Build completed successfully (check Vercel logs)
- [ ] Neon database branch was created
- [ ] Inngest sandbox environment was created
- [ ] Environment variables are accessible in preview
- [ ] API endpoints respond correctly
- [ ] Inngest endpoint is reachable at `/api/inngest`

## Troubleshooting

### Build Fails

**Check:**
- Build logs in Vercel dashboard
- Ensure all dependencies are installed
- Verify `vercel-build` script runs locally

**Common issues:**
- Missing environment variables
- TypeScript errors
- Missing dependencies

### Neon Branch Not Created

**Check:**
- Neon integration is enabled in Vercel
- Neon project is connected to Vercel project
- Database URL environment variable is set

**Fix:**
- Reconnect Neon integration in Vercel
- Manually create branch if needed

### Inngest Not Connected

**Check:**
- Inngest integration is enabled in Vercel
- Signing key is configured
- Webhook endpoint is accessible

**Fix:**
- Verify Inngest signing key in environment variables
- Check `/api/inngest` endpoint responds to GET requests
- Manually sync functions in Inngest dashboard

## Next Steps

After successful preview deployment:

1. Run task 20: Test preview deployment
2. Verify all functionality works in preview environment
3. Run E2E tests against preview URL
4. Address any issues found
5. Proceed to production deployment (task 22-24)

## Rollback

If issues occur:

```bash
# Delete the preview deployment in Vercel dashboard
# Or delete the feature branch
git checkout main
git branch -D vercel-inngest-migration
git push origin --delete vercel-inngest-migration
```

This will:
- Remove the preview deployment
- Delete the Neon database branch
- Remove the Inngest sandbox environment

## Resources

- [Vercel Deployments](https://vercel.com/docs/deployments/overview)
- [Neon Branching](https://neon.tech/docs/guides/branching)
- [Inngest Environments](https://www.inngest.com/docs/platform/environments)
