# Task 35.2: Deploy Frontend to Production - Implementation Guide

## Overview

Task 35.2 focuses on deploying the Expo Web application to the production S3 bucket and CloudFront distribution. This task assumes that Task 35.1 (infrastructure deployment) has been completed successfully.

## Prerequisites

Before deploying the frontend to production, ensure:

1. ✅ **Task 35.1 Completed**: Production infrastructure deployed
   - All CloudFormation stacks deployed successfully
   - Production outputs saved in `.production-outputs.json`
   - Secrets configured with MAINNET values

2. ✅ **AWS Credentials**: Valid AWS credentials configured
   ```bash
   aws sts get-caller-identity
   ```

3. ✅ **Production Stack Exists**: Verify Web stack is deployed
   ```bash
   aws cloudformation describe-stacks --stack-name TriviaNFT-Web-production
   ```

4. ✅ **Build Tools**: Required tools installed
   - Node.js 20+
   - pnpm
   - AWS CLI

## Deployment Script

The deployment is handled by the existing `deploy-frontend.sh` script, which already supports production:

```bash
cd infra
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh production
```

## What the Script Does

### 1. Prerequisites Check
- Verifies AWS CLI is installed
- Verifies pnpm is installed
- Checks AWS credentials are valid

### 2. Get Deployment Configuration
Retrieves from CloudFormation outputs:
- S3 bucket name
- CloudFront distribution ID
- CloudFront domain
- API endpoint

### 3. Build Configuration
Creates `.env.production` file with:
```env
# API Configuration
EXPO_PUBLIC_API_URL=<production-api-endpoint>
EXPO_PUBLIC_API_TIMEOUT=30000

# Cardano Network
EXPO_PUBLIC_CARDANO_NETWORK=mainnet

# Feature Flags
EXPO_PUBLIC_ENABLE_WALLET_CONNECT=true
EXPO_PUBLIC_ENABLE_GUEST_MODE=true

# Environment
EXPO_PUBLIC_ENV=production
```

**Key Difference**: Uses `mainnet` for Cardano network (vs `preprod` for staging)

### 4. Build Application
```bash
cd apps/web
pnpm install  # If needed
pnpm build    # Runs: expo export:web
```

Outputs to `apps/web/dist/` directory

### 5. Upload to S3
Two-phase upload with different cache policies:

**Phase 1: Static Assets** (24-hour cache)
```bash
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "manifest.json" \
    --exclude "service-worker.js"
```

**Phase 2: HTML Files** (short cache for SPA)
```bash
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --exclude "*" \
    --include "*.html" \
    --include "manifest.json" \
    --include "service-worker.js" \
    --cache-control "public, max-age=0, must-revalidate"
```

### 6. Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

Waits for invalidation to complete (typically 1-2 minutes)

### 7. Test Deployment
```bash
curl -s -o /dev/null -w "%{http_code}" https://${CLOUDFRONT_DOMAIN}/
```

Expects HTTP 200 response

### 8. Save Deployment Info
Creates `.production-frontend-deployment.json`:
```json
{
  "environment": "production",
  "s3Bucket": "trivia-nft-web-production-123456789012",
  "cloudfrontDomain": "d1234567890abc.cloudfront.net",
  "distributionId": "E1234567890ABC",
  "apiEndpoint": "https://api.production.trivianft.com",
  "cardanoNetwork": "mainnet",
  "buildSize": "2.5M",
  "deployedAt": "2024-01-15T10:30:00Z"
}
```

## Manual Deployment Steps

If you need to deploy manually without the script:

### Step 1: Get Stack Outputs
```bash
cd infra

# Get S3 bucket name
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text)

# Get Distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

echo "S3 Bucket: $S3_BUCKET"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "API Endpoint: $API_ENDPOINT"
```

### Step 2: Create Environment File
```bash
cd ../apps/web

cat > .env.production <<EOF
EXPO_PUBLIC_API_URL=${API_ENDPOINT}
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_CARDANO_NETWORK=mainnet
EXPO_PUBLIC_ENABLE_WALLET_CONNECT=true
EXPO_PUBLIC_ENABLE_GUEST_MODE=true
EXPO_PUBLIC_ENV=production
EOF
```

### Step 3: Build Application
```bash
pnpm install
pnpm build
```

### Step 4: Upload to S3
```bash
# Upload static assets with long cache
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "manifest.json" \
    --exclude "service-worker.js"

# Upload HTML files with short cache
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
    --exclude "*" \
    --include "*.html" \
    --include "manifest.json" \
    --include "service-worker.js" \
    --cache-control "public, max-age=0, must-revalidate"
```

### Step 5: Invalidate CloudFront
```bash
aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*"
```

### Step 6: Test
```bash
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text)

curl -I "https://${CLOUDFRONT_DOMAIN}/"
```

## Custom Domain Configuration

If you want to use a custom domain (e.g., `app.trivianft.com`):

### Prerequisites
1. Domain registered and Route 53 hosted zone created
2. ACM certificate created in `us-east-1` region
3. Certificate validated

### Deploy with Custom Domain

Update the CDK context or use CLI parameters:

```bash
cd infra

cdk deploy TriviaNFT-Web-production \
  -c environment=production \
  -c domainName=app.trivianft.com \
  -c hostedZoneId=Z1234567890ABC \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

Or update `cdk.json`:
```json
{
  "context": {
    "production": {
      "domainName": "app.trivianft.com",
      "hostedZoneId": "Z1234567890ABC",
      "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/..."
    }
  }
}
```

Then redeploy the Web stack:
```bash
cdk deploy TriviaNFT-Web-production --context environment=production
```

After redeployment, run the frontend deployment script again:
```bash
./scripts/deploy-frontend.sh production
```

## Verification

After deployment, verify the following:

### 1. Frontend Accessibility
```bash
# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text)

# Test HTTP response
curl -I "https://${CLOUDFRONT_DOMAIN}/"
# Expected: HTTP/2 200

# Test in browser
echo "Open: https://${CLOUDFRONT_DOMAIN}/"
```

### 2. PWA Functionality
Open in browser and verify:
- ✅ Manifest loads correctly
- ✅ Service worker registers
- ✅ Install prompt appears (on supported browsers)
- ✅ App works in standalone mode after install
- ✅ Offline shell loads when offline

### 3. API Connectivity
In browser console:
```javascript
// Check environment
console.log(process.env.EXPO_PUBLIC_API_URL);
// Expected: Production API endpoint

console.log(process.env.EXPO_PUBLIC_CARDANO_NETWORK);
// Expected: "mainnet"

// Test API call
fetch(process.env.EXPO_PUBLIC_API_URL + '/health')
  .then(r => r.json())
  .then(console.log);
// Expected: { status: "ok", ... }
```

### 4. Wallet Connection
- ✅ CIP-30 wallet detection works
- ✅ Can connect mainnet wallet
- ✅ Stake key extracted correctly
- ✅ Profile creation works

### 5. CloudFront Configuration
```bash
# Check distribution status
aws cloudfront get-distribution \
    --id ${DISTRIBUTION_ID} \
    --query 'Distribution.Status' \
    --output text
# Expected: "Deployed"

# Check cache behavior
curl -I "https://${CLOUDFRONT_DOMAIN}/static/js/main.js"
# Expected: cache-control: public, max-age=31536000, immutable

curl -I "https://${CLOUDFRONT_DOMAIN}/index.html"
# Expected: cache-control: public, max-age=0, must-revalidate
```

### 6. Security Headers
```bash
curl -I "https://${CLOUDFRONT_DOMAIN}/" | grep -i "x-"
```

Expected headers:
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `x-xss-protection: 1; mode=block`
- `strict-transport-security: max-age=31536000; includeSubDomains; preload`

### 7. Run Verification Script
```bash
cd infra
./scripts/verify-pwa.sh production
```

## Post-Deployment Testing

### Manual Testing Checklist

1. **Homepage**
   - [ ] Page loads correctly
   - [ ] No console errors
   - [ ] Responsive on mobile and desktop
   - [ ] Timer displays correctly

2. **Guest Session**
   - [ ] Can start guest session
   - [ ] Questions display correctly
   - [ ] Timer counts down
   - [ ] Can submit answers
   - [ ] Results display correctly

3. **Wallet Connection**
   - [ ] Wallet detection works
   - [ ] Can connect mainnet wallet
   - [ ] Profile creation works
   - [ ] JWT token stored correctly

4. **Authenticated Session**
   - [ ] Can start session as authenticated user
   - [ ] Daily limit displays correctly
   - [ ] Cooldown works correctly
   - [ ] Perfect score shows mint eligibility

5. **NFT Minting** (⚠️ Uses real ADA)
   - [ ] Mint eligibility displays
   - [ ] Countdown timer works
   - [ ] Can initiate mint
   - [ ] Transaction submits to mainnet
   - [ ] NFT appears in wallet

6. **Leaderboard**
   - [ ] Global leaderboard loads
   - [ ] Category leaderboards load
   - [ ] Pagination works
   - [ ] Current user highlighted

7. **Profile**
   - [ ] Profile displays correctly
   - [ ] Owned NFTs display
   - [ ] Activity log displays
   - [ ] Stats are accurate

8. **PWA Features**
   - [ ] Install prompt appears
   - [ ] Can install to home screen
   - [ ] Works in standalone mode
   - [ ] Offline shell works

### Automated Testing
```bash
cd infra
./scripts/smoke-test.sh production
```

Expected: All tests pass

## Troubleshooting

### Build Fails

**Issue**: `pnpm build` fails

**Solutions**:
1. Check Node.js version: `node --version` (should be 20+)
2. Clear cache: `rm -rf node_modules dist .expo`
3. Reinstall: `pnpm install`
4. Check for TypeScript errors: `pnpm type-check`

### Upload Fails

**Issue**: S3 sync fails

**Solutions**:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Check bucket exists: `aws s3 ls s3://${S3_BUCKET}/`
3. Check IAM permissions for S3 write
4. Verify bucket name is correct

### CloudFront Invalidation Fails

**Issue**: Invalidation creation fails

**Solutions**:
1. Check distribution exists: `aws cloudfront get-distribution --id ${DISTRIBUTION_ID}`
2. Check IAM permissions for CloudFront
3. Wait for previous invalidation to complete
4. Try manual invalidation in console

### Site Not Accessible

**Issue**: HTTP 403 or 404 errors

**Solutions**:
1. Check CloudFront distribution status: Should be "Deployed"
2. Wait for invalidation to complete (1-2 minutes)
3. Check S3 bucket has files: `aws s3 ls s3://${S3_BUCKET}/`
4. Check CloudFront origin configuration
5. Check WAF rules aren't blocking

### Wrong API Endpoint

**Issue**: Frontend connects to wrong API

**Solutions**:
1. Check `.env.production` file has correct API endpoint
2. Rebuild application: `pnpm build`
3. Redeploy: `./scripts/deploy-frontend.sh production`
4. Clear browser cache and hard refresh

### Wallet Connection Fails

**Issue**: Can't connect mainnet wallet

**Solutions**:
1. Verify using mainnet wallet (not preprod)
2. Check browser console for errors
3. Verify CIP-30 wallet extension installed
4. Try different wallet (Lace, Nami, Eternl)

## Rollback Procedure

If critical issues are found after deployment:

### Option 1: Rollback to Previous Version

```bash
# Get previous deployment info
cat infra/.production-frontend-deployment.json

# Checkout previous version
git log --oneline apps/web/
git checkout <previous-commit> apps/web/

# Rebuild and redeploy
cd infra
./scripts/deploy-frontend.sh production
```

### Option 2: Deploy Maintenance Page

```bash
# Create maintenance page
cat > maintenance.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>TriviaNFT - Maintenance</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #1a1a2e; }
    </style>
</head>
<body>
    <h1>🔧 Maintenance in Progress</h1>
    <p>We'll be back shortly. Thank you for your patience.</p>
</body>
</html>
EOF

# Upload to S3
aws s3 cp maintenance.html "s3://${S3_BUCKET}/index.html" \
    --cache-control "public, max-age=0, must-revalidate"

# Invalidate cache
aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/index.html"
```

## Cost Implications

Frontend deployment costs:
- **S3 Storage**: ~$0.023 per GB/month (typically <100MB = <$0.01/month)
- **S3 Requests**: ~$0.005 per 1000 PUT requests (one-time deployment cost)
- **CloudFront**: Included in distribution cost (already deployed)
- **CloudFront Invalidations**: First 1000/month free, then $0.005 per path

**Estimated cost per deployment**: <$0.01

## Success Criteria

Frontend deployment is successful when:

- ✅ Build completes without errors
- ✅ All files uploaded to S3
- ✅ CloudFront cache invalidated
- ✅ Site accessible via CloudFront domain
- ✅ HTTP 200 response on homepage
- ✅ No console errors in browser
- ✅ PWA manifest loads correctly
- ✅ Service worker registers
- ✅ API connectivity works
- ✅ Wallet connection works with mainnet
- ✅ Environment variables correct (mainnet)
- ✅ All manual tests pass
- ✅ Smoke tests pass

## Timeline

- Build application: 2-3 minutes
- Upload to S3: 1-2 minutes
- CloudFront invalidation: 1-2 minutes
- Verification: 5-10 minutes
- **Total: 10-15 minutes**

## Next Steps

After successful frontend deployment:

1. **Run Smoke Tests**
   ```bash
   cd infra
   ./scripts/smoke-test.sh production
   ```

2. **Verify PWA**
   ```bash
   ./scripts/verify-pwa.sh production
   ```

3. **Manual Testing**
   - Test all critical user flows
   - Verify wallet connection with mainnet
   - Test one complete session
   - Verify leaderboard updates

4. **Monitor**
   - Watch CloudWatch dashboards
   - Check CloudFront metrics
   - Monitor error logs
   - Track user behavior

5. **Proceed to Task 35.3**
   - Perform production validation
   - Run comprehensive smoke tests
   - Verify monitoring and alarms
   - Monitor initial traffic

## Related Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Production Quick Reference](./PRODUCTION_QUICK_REFERENCE.md)
- [WebStack Deployment Guide](./WEBSTACK_DEPLOYMENT_GUIDE.md)

## Support

If you encounter issues:

1. Check CloudWatch Logs for errors
2. Review troubleshooting section above
3. Check AWS Health Dashboard
4. Contact AWS Support if infrastructure issue
5. Review deployment logs in terminal

---

**Remember**: This deploys to production with mainnet integration. Test thoroughly and monitor closely after deployment.

**Task Status**: Ready for execution  
**Requirements**: 40, 41  
**Dependencies**: Task 35.1 (Infrastructure deployment)
