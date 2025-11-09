# Execute Task 35.2: Deploy Frontend to Production

## Quick Start

To deploy the frontend to production, follow these steps:

### Step 1: Verify Prerequisites

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify production infrastructure is deployed
aws cloudformation describe-stacks --stack-name TriviaNFT-Web-production
aws cloudformation describe-stacks --stack-name TriviaNFT-Api-production

# Check tools
node --version  # Should be v20.x.x or higher
pnpm --version
```

### Step 2: Run Deployment Script

```bash
cd infra
chmod +x scripts/deploy-frontend-production.sh
./scripts/deploy-frontend-production.sh
```

### Step 3: Confirm Deployment

When prompted, type exactly:
```
DEPLOY FRONTEND TO PRODUCTION
```

### Step 4: Wait for Completion

The script will:
1. Build the Expo Web application (~2-3 minutes)
2. Upload to S3 (~1-2 minutes)
3. Invalidate CloudFront cache (~1-2 minutes)
4. Verify deployment
5. Run PWA verification

**Total time: ~10-15 minutes**

### Step 5: Verify Deployment

The script will show the CloudFront domain. Open it in a browser:

```
https://<cloudfront-domain>/
```

Verify:
- ✅ Page loads without errors
- ✅ No console errors
- ✅ Environment shows "mainnet" (check console: `process.env.EXPO_PUBLIC_CARDANO_NETWORK`)
- ✅ Can connect mainnet wallet
- ✅ API connectivity works

### Step 6: Run Smoke Tests

```bash
./scripts/smoke-test.sh production
```

Expected: All tests pass

### Step 7: Monitor

Watch CloudWatch dashboards for:
- Error rates
- API calls
- CloudFront metrics
- User behavior

## If You Need AWS Credentials

If you see "Token has expired", you need to refresh your AWS credentials:

```bash
# If using SSO
aws sso login --profile production

# Or configure credentials
aws configure --profile production
```

## If Infrastructure Not Deployed

If you see "Production infrastructure not deployed", you need to deploy it first:

```bash
# Deploy infrastructure (Task 35.1)
./scripts/deploy-production.sh
```

This will take 20-30 minutes and requires typing "DEPLOY TO PRODUCTION" to confirm.

## Alternative: Manual Deployment

If you prefer to deploy manually without the wrapper script:

```bash
cd infra
./scripts/deploy-frontend.sh production
```

This skips the additional safety checks but works the same way.

## Troubleshooting

### Build Fails

```bash
cd apps/web
rm -rf node_modules dist .expo
pnpm install
pnpm build
```

### Upload Fails

Check AWS credentials and permissions:
```bash
aws sts get-caller-identity
aws s3 ls s3://<bucket-name>/
```

### Site Not Accessible

Wait 1-2 minutes for CloudFront invalidation to complete, then try again.

### Wrong Environment

Check the environment file:
```bash
cd apps/web
cat .env.production
```

Should show:
- `EXPO_PUBLIC_CARDANO_NETWORK=mainnet`
- `EXPO_PUBLIC_ENV=production`

## Documentation

For detailed information, see:

- [Task 35.2 Implementation Guide](./TASK_35.2_FRONTEND_DEPLOYMENT.md)
- [Frontend Deployment README](./FRONTEND_DEPLOYMENT_README.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)

## Support

If you encounter issues:
1. Check the troubleshooting section in the documentation
2. Review CloudWatch Logs for errors
3. Check AWS Health Dashboard
4. Contact team lead

---

**Remember**: This deploys to production with MAINNET integration. Monitor closely after deployment!
