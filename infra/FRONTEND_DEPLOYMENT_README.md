# Frontend Deployment Guide

## Overview

This guide covers deploying the TriviaNFT Expo Web application to both staging and production environments.

## Quick Start

### Deploy to Staging
```bash
cd infra
./scripts/deploy-frontend.sh staging
```

### Deploy to Production
```bash
cd infra
./scripts/deploy-frontend-production.sh
```

The production script includes additional safety checks and requires explicit confirmation.

## Prerequisites

### Required Tools
- **Node.js**: Version 20 or higher
- **pnpm**: Package manager
- **AWS CLI**: Configured with valid credentials
- **Expo CLI**: Installed via pnpm (automatic)

### Required Infrastructure
- CloudFormation stacks deployed (Web and API stacks)
- S3 bucket created
- CloudFront distribution deployed
- API Gateway deployed

### Verify Prerequisites
```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check pnpm
pnpm --version

# Check AWS credentials
aws sts get-caller-identity

# Check infrastructure
aws cloudformation describe-stacks --stack-name TriviaNFT-Web-production
aws cloudformation describe-stacks --stack-name TriviaNFT-Api-production
```

## Deployment Scripts

### 1. deploy-frontend.sh

**Purpose**: Deploy frontend to staging or production

**Usage**:
```bash
./scripts/deploy-frontend.sh [staging|production]
```

**What it does**:
1. Checks prerequisites (AWS CLI, pnpm)
2. Gets stack outputs (S3 bucket, CloudFront ID, API endpoint)
3. Creates environment configuration file
4. Builds Expo Web application
5. Uploads to S3 with appropriate cache headers
6. Invalidates CloudFront cache
7. Tests deployment
8. Saves deployment info

**Environment Configuration**:

For **staging**:
```env
EXPO_PUBLIC_API_URL=<staging-api-endpoint>
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_ENV=staging
```

For **production**:
```env
EXPO_PUBLIC_API_URL=<production-api-endpoint>
EXPO_PUBLIC_CARDANO_NETWORK=mainnet
EXPO_PUBLIC_ENV=production
```

### 2. deploy-frontend-production.sh

**Purpose**: Production deployment with additional safety checks

**Usage**:
```bash
./scripts/deploy-frontend-production.sh
```

**Additional Features**:
- Verifies production infrastructure is deployed
- Shows deployment summary
- Requires explicit confirmation: "DEPLOY FRONTEND TO PRODUCTION"
- Runs PWA verification after deployment
- Provides detailed next steps

**Safety Features**:
- Red warning colors
- Explicit confirmation required
- Infrastructure verification
- Post-deployment checks

## Build Process

### Build Command
```bash
cd apps/web
pnpm build
```

This runs: `expo export:web`

### Build Output
- **Directory**: `apps/web/dist/`
- **Contents**:
  - `index.html` - Main HTML file
  - `manifest.json` - PWA manifest
  - `service-worker.js` - Service worker for offline support
  - `static/` - JavaScript, CSS, and other assets
  - `assets/` - Images, fonts, and media files

### Build Configuration

The build uses environment variables from `.env.production`:

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://api.production.trivianft.com
EXPO_PUBLIC_API_TIMEOUT=30000

# Cardano Network
EXPO_PUBLIC_CARDANO_NETWORK=mainnet

# Feature Flags
EXPO_PUBLIC_ENABLE_WALLET_CONNECT=true
EXPO_PUBLIC_ENABLE_GUEST_MODE=true

# Environment
EXPO_PUBLIC_ENV=production
```

## Upload Strategy

### Two-Phase Upload

**Phase 1: Static Assets** (Long cache)
```bash
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "manifest.json" \
    --exclude "service-worker.js"
```

Files: JavaScript, CSS, images, fonts
Cache: 1 year (immutable)

**Phase 2: HTML Files** (Short cache)
```bash
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --exclude "*" \
    --include "*.html" \
    --include "manifest.json" \
    --include "service-worker.js" \
    --cache-control "public, max-age=0, must-revalidate"
```

Files: HTML, manifest, service worker
Cache: No cache (always fresh)

### Why Two Phases?

1. **Static Assets**: Can be cached forever because they have content hashes in filenames
2. **HTML Files**: Must be fresh to support SPA routing and updates
3. **Service Worker**: Must be fresh to detect updates

## CloudFront Cache Invalidation

### Automatic Invalidation
```bash
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

### Wait for Completion
```bash
aws cloudfront wait invalidation-completed \
    --distribution-id ${DISTRIBUTION_ID} \
    --id ${INVALIDATION_ID}
```

Typically takes 1-2 minutes.

### Manual Invalidation

If needed:
```bash
# Get distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

# Create invalidation
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

## Verification

### Automated Verification

The deployment script automatically:
1. Tests HTTP response (expects 200)
2. Displays CloudFront domain
3. Saves deployment info

### Manual Verification

#### 1. Test HTTP Response
```bash
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text)

curl -I "https://${CLOUDFRONT_DOMAIN}/"
```

Expected: `HTTP/2 200`

#### 2. Test in Browser
```bash
echo "https://${CLOUDFRONT_DOMAIN}/"
```

Open in browser and verify:
- Page loads without errors
- No console errors
- Responsive design works
- Timer displays correctly

#### 3. Verify Environment
Open browser console:
```javascript
// Check API endpoint
console.log(process.env.EXPO_PUBLIC_API_URL);

// Check Cardano network
console.log(process.env.EXPO_PUBLIC_CARDANO_NETWORK);
// Production should show: "mainnet"
// Staging should show: "preprod"
```

#### 4. Test API Connectivity
```javascript
fetch(process.env.EXPO_PUBLIC_API_URL + '/health')
  .then(r => r.json())
  .then(console.log);
```

Expected: `{ status: "ok", ... }`

#### 5. Verify PWA
```bash
cd infra
./scripts/verify-pwa.sh production
```

Checks:
- Manifest loads
- Service worker registers
- Icons are accessible
- Offline support works

#### 6. Test Wallet Connection
- Open application
- Click "Connect Wallet"
- Verify wallet detection
- Connect mainnet wallet (production) or preprod wallet (staging)
- Verify stake key extraction

### Run Smoke Tests
```bash
cd infra
./scripts/smoke-test.sh production
```

Tests:
- Frontend accessibility
- API endpoints
- CORS configuration
- CloudWatch logs
- Monitoring

## Troubleshooting

### Build Fails

**Symptom**: `pnpm build` fails with errors

**Solutions**:
1. Check Node.js version: `node --version` (must be 20+)
2. Clear cache:
   ```bash
   cd apps/web
   rm -rf node_modules dist .expo
   pnpm install
   ```
3. Check TypeScript errors: `pnpm type-check`
4. Check for missing dependencies: `pnpm install`

### Upload Fails

**Symptom**: S3 sync fails

**Solutions**:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Check bucket exists:
   ```bash
   aws s3 ls s3://${S3_BUCKET}/
   ```
3. Check IAM permissions for S3 write
4. Verify bucket name is correct

### CloudFront Invalidation Fails

**Symptom**: Invalidation creation fails

**Solutions**:
1. Check distribution exists:
   ```bash
   aws cloudfront get-distribution --id ${DISTRIBUTION_ID}
   ```
2. Check IAM permissions for CloudFront
3. Wait for previous invalidation to complete
4. Check invalidation limit (1000 free per month)

### Site Not Accessible

**Symptom**: HTTP 403 or 404 errors

**Solutions**:
1. Check CloudFront distribution status:
   ```bash
   aws cloudfront get-distribution \
       --id ${DISTRIBUTION_ID} \
       --query 'Distribution.Status' \
       --output text
   ```
   Should be: "Deployed"

2. Wait for invalidation to complete (1-2 minutes)

3. Check S3 bucket has files:
   ```bash
   aws s3 ls s3://${S3_BUCKET}/
   ```

4. Check CloudFront origin configuration in AWS Console

5. Check WAF rules aren't blocking:
   ```bash
   aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1
   ```

### Wrong API Endpoint

**Symptom**: Frontend connects to wrong API or shows errors

**Solutions**:
1. Check `.env.production` file:
   ```bash
   cd apps/web
   cat .env.production
   ```

2. Verify API endpoint is correct:
   ```bash
   aws cloudformation describe-stacks \
       --stack-name TriviaNFT-Api-production \
       --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
       --output text
   ```

3. Rebuild and redeploy:
   ```bash
   cd ../../infra
   ./scripts/deploy-frontend.sh production
   ```

4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Wallet Connection Fails

**Symptom**: Can't connect wallet or wrong network

**Solutions**:
1. Verify using correct network wallet:
   - Production: MAINNET wallet
   - Staging: Preprod wallet

2. Check browser console for errors

3. Verify CIP-30 wallet extension installed

4. Try different wallet (Lace, Nami, Eternl)

5. Check environment variable:
   ```javascript
   console.log(process.env.EXPO_PUBLIC_CARDANO_NETWORK);
   ```

### Cache Issues

**Symptom**: Old version still showing after deployment

**Solutions**:
1. Wait for invalidation to complete (1-2 minutes)

2. Hard refresh browser (Ctrl+Shift+R)

3. Clear browser cache completely

4. Try incognito/private window

5. Check CloudFront cache headers:
   ```bash
   curl -I "https://${CLOUDFRONT_DOMAIN}/index.html"
   ```

6. Create new invalidation:
   ```bash
   aws cloudfront create-invalidation \
       --distribution-id ${DISTRIBUTION_ID} \
       --paths "/*"
   ```

## Rollback Procedure

### Quick Rollback

If critical issues found after deployment:

```bash
# 1. Checkout previous version
git log --oneline apps/web/
git checkout <previous-commit> apps/web/

# 2. Redeploy
cd infra
./scripts/deploy-frontend.sh production

# 3. Verify
curl -I "https://${CLOUDFRONT_DOMAIN}/"
```

### Deploy Maintenance Page

For immediate downtime:

```bash
# 1. Create maintenance page
cat > maintenance.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>TriviaNFT - Maintenance</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #1a1a2e;
            color: #fff;
        }
        h1 { color: #16213e; font-size: 2.5em; }
        p { font-size: 1.2em; color: #ccc; }
        .emoji { font-size: 4em; }
    </style>
</head>
<body>
    <div class="emoji">🔧</div>
    <h1>Maintenance in Progress</h1>
    <p>We're making improvements to TriviaNFT.</p>
    <p>We'll be back shortly. Thank you for your patience!</p>
</body>
</html>
EOF

# 2. Upload to S3
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text)

aws s3 cp maintenance.html "s3://${S3_BUCKET}/index.html" \
    --cache-control "public, max-age=0, must-revalidate"

# 3. Invalidate cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/index.html"
```

## Best Practices

### Before Deployment

1. ✅ Test in staging first
2. ✅ Run type checking: `pnpm type-check`
3. ✅ Run linting: `pnpm lint`
4. ✅ Test build locally: `pnpm build`
5. ✅ Review changes: `git diff`
6. ✅ Notify team of deployment
7. ✅ Have rollback plan ready

### During Deployment

1. ✅ Monitor deployment output for errors
2. ✅ Wait for invalidation to complete
3. ✅ Test immediately after deployment
4. ✅ Check browser console for errors
5. ✅ Verify environment variables

### After Deployment

1. ✅ Run smoke tests
2. ✅ Test critical user flows
3. ✅ Monitor CloudWatch dashboards
4. ✅ Check error logs
5. ✅ Monitor user feedback
6. ✅ Document any issues
7. ✅ Update team on status

### Production-Specific

1. ✅ Always use mainnet configuration
2. ✅ Never use test/staging keys
3. ✅ Test with real mainnet wallet
4. ✅ Monitor costs closely
5. ✅ Have on-call engineer ready
6. ✅ Document deployment time
7. ✅ Notify stakeholders

## Deployment Checklist

### Pre-Deployment
- [ ] Staging deployment successful
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds locally
- [ ] Team notified
- [ ] Rollback plan ready

### Deployment
- [ ] AWS credentials valid
- [ ] Infrastructure deployed
- [ ] Run deployment script
- [ ] Monitor output for errors
- [ ] Wait for invalidation
- [ ] Test HTTP response

### Post-Deployment
- [ ] Site accessible
- [ ] No console errors
- [ ] Environment variables correct
- [ ] API connectivity works
- [ ] Wallet connection works
- [ ] PWA features work
- [ ] Smoke tests pass
- [ ] Monitoring active

### Production-Specific
- [ ] Using mainnet configuration
- [ ] Mainnet wallet tested
- [ ] CloudWatch dashboards checked
- [ ] Error logs reviewed
- [ ] Team notified of completion
- [ ] Documentation updated

## Cost Implications

### Per Deployment
- S3 PUT requests: ~$0.005 per 1000 requests
- CloudFront invalidation: First 1000/month free
- **Estimated cost**: <$0.01 per deployment

### Ongoing Costs
- S3 storage: ~$0.023 per GB/month (typically <$0.01)
- CloudFront: Included in distribution cost
- Data transfer: Included in CloudFront pricing

## Timeline

- Build application: 2-3 minutes
- Upload to S3: 1-2 minutes
- CloudFront invalidation: 1-2 minutes
- Verification: 5-10 minutes
- **Total: 10-15 minutes**

## Related Documentation

- [Task 35.2 Implementation Guide](./TASK_35.2_FRONTEND_DEPLOYMENT.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [WebStack Deployment Guide](./WEBSTACK_DEPLOYMENT_GUIDE.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review CloudWatch Logs
3. Check AWS Health Dashboard
4. Contact team lead
5. Escalate to AWS Support if needed

---

**Remember**: Always test in staging first, monitor closely after deployment, and have a rollback plan ready.
