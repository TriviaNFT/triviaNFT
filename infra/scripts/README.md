# Infrastructure Scripts

This directory contains utility scripts for managing the TriviaNFT infrastructure.

## Available Scripts

### deploy-staging.sh

Deploys all infrastructure stacks to the staging environment.

**Usage**:
```bash
./scripts/deploy-staging.sh
```

**What it does**:
- Checks prerequisites (AWS CLI, CDK, credentials)
- Installs dependencies and builds TypeScript
- Bootstraps CDK if needed
- Synthesizes CloudFormation templates
- Shows diff of changes
- Deploys all stacks with confirmation
- Saves outputs to `.staging-outputs.json`
- Provides next steps

**Requirements**:
- AWS CLI configured
- AWS CDK installed globally
- Appropriate AWS permissions
- Run from `infra` directory

### configure-secrets.sh

Configures all required secrets in AWS Secrets Manager.

**Usage**:
```bash
./scripts/configure-secrets.sh [staging|production]
```

**What it configures**:
- JWT secret (auto-generated or custom)
- Blockfrost API key
- IPFS/NFT.Storage API key (optional)
- Database credentials
- Redis auth token
- Cardano policy signing key

**Interactive**: Prompts for each secret value with option to auto-generate.

---

## Production Validation Scripts

### production-validation.sh

**Purpose:** Comprehensive production validation suite  
**Tests:** 20 automated tests covering all critical components  
**Duration:** ~5 minutes  

**Usage:**
```bash
cd infra
chmod +x scripts/production-validation.sh
./scripts/production-validation.sh
```

**What it tests:**
- **Smoke tests (8):** Frontend, API, database, Redis, WAF, CORS
- **Monitoring (4):** Dashboards, logs, X-Ray, metrics
- **Alarms (3):** Configuration, SNS topics, subscriptions
- **Traffic (5):** Errors, latency, connections, cache performance

**Output:**
- Color-coded test results (✓ pass, ✗ fail, ⚠ warning)
- Pass/fail summary with counts
- Warnings and recommendations
- Troubleshooting guidance
- Next steps for monitoring

**Exit codes:**
- `0` - All tests passed
- `1` - One or more tests failed

### validate-production-monitoring.sh

**Purpose:** Focused monitoring validation  
**Tests:** 10 monitoring-specific tests  
**Duration:** ~2 minutes  

**Usage:**
```bash
cd infra
chmod +x scripts/validate-production-monitoring.sh
./scripts/validate-production-monitoring.sh
```

**What it tests:**
- CloudWatch dashboards existence and configuration
- CloudWatch alarms and their states
- SNS topics and subscriptions
- Lambda function logs and retention
- X-Ray tracing enabled on functions
- Recent errors in logs
- API Gateway metrics
- Database connection metrics

**Use when:**
- Verifying monitoring setup after deployment
- Troubleshooting monitoring issues
- Checking alarm configuration
- Validating observability stack

### verify-production.sh

**Purpose:** Quick deployment verification  
**Tests:** Basic deployment status  
**Duration:** ~1 minute  

**Usage:**
```bash
cd infra
chmod +x scripts/verify-production.sh
./scripts/verify-production.sh
```

**What it checks:**
- CloudFormation stack status (all stacks)
- Secrets Manager configuration
- API Gateway endpoint accessibility
- CloudFront distribution status
- Database cluster status
- Redis cluster status
- Lambda functions count
- Step Functions count
- EventBridge rules count
- CloudWatch dashboards count
- CloudWatch alarms count

**Use when:**
- Quick health check after deployment
- Verifying all resources deployed
- Troubleshooting deployment issues
- Before running full validation

---

## Validation Documentation

For detailed validation procedures, see:

- **[VALIDATION_QUICK_START.md](../VALIDATION_QUICK_START.md)** - 5-minute quick validation
- **[PRODUCTION_VALIDATION_EXECUTION.md](../PRODUCTION_VALIDATION_EXECUTION.md)** - Step-by-step execution guide
- **[PRODUCTION_VALIDATION_GUIDE.md](../PRODUCTION_VALIDATION_GUIDE.md)** - Comprehensive validation guide
- **[PRODUCTION_VALIDATION_CHECKLIST.md](../PRODUCTION_VALIDATION_CHECKLIST.md)** - Quick checklist

---

### deploy-frontend.sh

Builds and deploys the Expo Web application to S3/CloudFront.

**Usage**:
```bash
./scripts/deploy-frontend.sh [staging|production]
```

**What it does**:
- Gets deployment configuration from CloudFormation
- Installs dependencies if needed
- Creates environment configuration
- Builds Expo Web application
- Uploads to S3 with appropriate cache headers
- Invalidates CloudFront cache
- Tests deployment
- Saves deployment info

**Requirements**:
- Infrastructure must be deployed first
- pnpm installed
- Run from `infra` directory

### deploy-frontend-production.sh 🚀

Deploys frontend to production with additional safety checks and verification.

**Usage**:
```bash
./scripts/deploy-frontend-production.sh
```

**What it does**:
- Verifies production infrastructure is deployed
- Checks API stack is deployed
- Shows deployment summary with warnings
- **Requires explicit confirmation: "DEPLOY FRONTEND TO PRODUCTION"**
- Calls deploy-frontend.sh with production parameter
- Runs PWA verification after deployment
- Provides detailed next steps

**Safety Features**:
- Red warning colors for production
- Explicit confirmation required
- Infrastructure verification before deployment
- Post-deployment PWA verification
- Detailed next steps guidance

**Requirements**:
- Production infrastructure deployed (Task 35.1)
- AWS CLI configured with production credentials
- pnpm installed
- Run from `infra` directory

⚠️ **RECOMMENDED**: Use this script instead of `deploy-frontend.sh production` for additional safety checks.

### verify-deployment.sh

Verifies that all infrastructure resources are properly deployed.

**Usage**:
```bash
./scripts/verify-deployment.sh [staging|production]
```

**What it checks**:
- All CloudFormation stacks are deployed
- Secrets are configured
- API Gateway endpoint exists
- CloudFront distribution is deployed
- VPC and networking are set up
- Aurora database is running
- Redis cluster is running
- AppConfig is configured

### verify-pwa.sh

Verifies that the Progressive Web App is properly configured.

**Usage**:
```bash
./scripts/verify-pwa.sh [staging|production]
```

**What it checks**:
- Site is accessible
- Web app manifest is valid
- Service worker is registered
- PWA icons are accessible
- HTTPS is working
- Security headers are present
- Caching is configured correctly
- Compression is enabled
- Mobile viewport is configured

### smoke-test.sh

Runs comprehensive smoke tests to verify the deployment.

**Usage**:
```bash
./scripts/smoke-test.sh [staging|production]
```

**What it tests**:
- Frontend accessibility
- API health check
- Categories endpoint
- Session start endpoint
- Leaderboard endpoint
- CORS configuration
- CloudWatch logs and alarms
- Database and Redis connectivity
- WAF configuration
- Secrets configuration

**Exit codes**:
- 0: All tests passed
- 1: One or more tests failed

### verify-webstack.sh

Verifies that the WebStack is properly configured and deployed.

**Usage**:
```bash
# Verify staging environment
./scripts/verify-webstack.sh staging

# Verify production environment
./scripts/verify-webstack.sh production
```

**What it checks**:
- ✅ S3 bucket versioning is enabled
- ✅ S3 bucket public access is blocked
- ✅ S3 bucket encryption is enabled
- ✅ CloudFront distribution is configured
- ✅ WAF WebACL is attached
- ✅ Origin Shield is enabled
- ✅ Compression is enabled
- ✅ HTTP redirects to HTTPS
- ✅ HTTPS is accessible
- ✅ Compression is working
- ✅ Security headers are present

**Requirements**:
- AWS CLI installed and configured
- Appropriate AWS credentials
- Stack must be deployed

**Example output**:
```
🔍 Verifying WebStack for environment: staging

📋 Getting stack outputs...
✓ Stack found: TriviaNFT-Web-staging
  Bucket: trivia-nft-web-staging-123456789012
  Distribution: d123456.cloudfront.net
  Distribution ID: E1234567890ABC

🪣 Verifying S3 bucket...
✓ Versioning is enabled
✓ Public access is blocked
✓ Encryption is enabled

🌐 Verifying CloudFront distribution...
✓ Distribution configuration retrieved
✓ WAF WebACL is attached
✓ Origin Shield is configured
✓ Compression is enabled

🧪 Testing distribution...
✓ HTTP redirects to HTTPS
✓ HTTPS is accessible (status: 403)
✓ Security headers are present
    x-frame-options: DENY
    strict-transport-security: max-age=31536000; includeSubDomains; preload
    x-content-type-options: nosniff

✅ Verification complete!

📝 Next steps:
  1. Build your frontend application
  2. Upload to S3: aws s3 sync dist/ s3://trivia-nft-web-staging-123456789012/ --delete
  3. Invalidate cache: aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths '/*'
```

## Making Scripts Executable

On Unix-based systems (Linux, macOS):
```bash
chmod +x scripts/*.sh
```

On Windows with Git Bash:
```bash
git update-index --chmod=+x scripts/*.sh
```

## Adding New Scripts

When adding new scripts:

1. Create the script in this directory
2. Add a shebang line at the top (e.g., `#!/bin/bash`)
3. Make it executable (see above)
4. Document it in this README
5. Follow the naming convention: `verb-noun.sh` (e.g., `deploy-stack.sh`)

## Best Practices

- Always include error handling (`set -e`)
- Provide clear output with colors and emojis
- Accept environment as a parameter
- Validate inputs before executing
- Provide helpful error messages
- Include usage examples in comments


## Production Deployment Scripts

### deploy-production.sh 🚀

Deploys all infrastructure stacks to the production environment with enhanced safety features.

**Usage**:
```bash
./scripts/deploy-production.sh
```

**What it does**:
- Checks prerequisites (AWS CLI, CDK, credentials)
- **Verifies staging deployment exists**
- Installs dependencies and builds TypeScript
- Bootstraps CDK if needed
- Synthesizes CloudFormation templates
- Shows diff of changes
- **Requires explicit confirmation: "DEPLOY TO PRODUCTION"**
- Deploys all stacks to production
- Saves outputs to `.production-outputs.json`
- Provides critical next steps

**Safety Features**:
- Red warning colors throughout
- Requires exact phrase confirmation (not just "yes")
- Verifies staging deployment exists first
- Shows comprehensive diff before deployment
- Uses Cardano MAINNET configuration

**Requirements**:
- AWS CLI configured with production credentials
- AWS CDK installed globally
- Appropriate AWS permissions
- **Staging deployment tested and verified**
- **MAINNET Blockfrost API key**
- **Production policy signing keys**
- Run from `infra` directory

⚠️ **CRITICAL**: This deploys to Cardano MAINNET. Real ADA will be used for transactions.

### verify-production.sh 🔍

Comprehensive verification of production deployment with detailed checks.

**Usage**:
```bash
./scripts/verify-production.sh
```

**What it checks**:
- All 7 CloudFormation stacks deployed successfully
- All secrets configured in Secrets Manager
- API Gateway endpoint accessible
- CloudFront distribution deployed and accessible
- Aurora database cluster status
- Redis cluster status
- WAF WebACL configuration
- AppConfig application
- Lambda functions deployed
- Step Functions state machines
- EventBridge rules
- CloudWatch dashboards
- CloudWatch alarms

**Exit codes**:
- 0: All checks passed
- 1: One or more checks failed

### validate-production-monitoring.sh 📊

Validates that all monitoring and alerting is properly configured for production.

**Usage**:
```bash
./scripts/validate-production-monitoring.sh
```

**What it validates**:
- CloudWatch dashboards exist and are configured
- CloudWatch alarms configured with correct states
- SNS topics for alarm notifications
- SNS topic subscriptions (email, etc.)
- Lambda function logs and retention policies
- X-Ray tracing enabled on all functions
- CloudWatch Logs Insights saved queries
- Recent Lambda errors (last hour)
- API Gateway metrics
- Aurora database metrics
- Provides instructions for testing alarm notifications

**Exit codes**:
- 0: All validation passed
- 1: One or more validation checks failed

## Production Deployment Workflow

### Initial Production Deployment

⚠️ **CRITICAL**: Always test in staging first!

1. **Deploy infrastructure**:
   ```bash
   ./scripts/deploy-production.sh
   ```
   - Type "DEPLOY TO PRODUCTION" to confirm

2. **Configure secrets** (use MAINNET keys!):
   ```bash
   ./scripts/configure-secrets.sh production
   ```
   - Use **MAINNET** Blockfrost API key (not preprod)
   - Use **production** policy signing keys (not test keys)

3. **Run database migrations**:
   ```bash
   cd ../services/api
   pnpm migrate:production
   pnpm seed:production
   ```

4. **Deploy frontend**:
   ```bash
   cd ../../infra
   ./scripts/deploy-frontend.sh production
   ```

5. **Verify deployment**:
   ```bash
   ./scripts/verify-production.sh
   ./scripts/smoke-test.sh production
   ./scripts/validate-production-monitoring.sh
   ```

6. **Configure SNS subscriptions**:
   ```bash
   # Get SNS topic ARNs from CloudFormation outputs
   aws cloudformation describe-stacks \
     --stack-name TriviaNFT-Observability-production \
     --query 'Stacks[0].Outputs'
   
   # Subscribe to critical alerts
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production \
     --protocol email \
     --notification-endpoint oncall@trivianft.com
   ```

7. **Monitor closely for 24 hours!**

### Updating Production

⚠️ **CRITICAL**: Always test in staging first!

1. **Deploy infrastructure changes**:
   ```bash
   ./scripts/deploy-production.sh
   ```

2. **Deploy frontend changes**:
   ```bash
   ./scripts/deploy-frontend.sh production
   ```

3. **Verify and test**:
   ```bash
   ./scripts/verify-production.sh
   ./scripts/smoke-test.sh production
   ```

4. **Monitor closely!**

## Key Differences: Staging vs Production

| Aspect | Staging | Production |
|--------|---------|------------|
| Cardano Network | Preprod | **MAINNET** |
| Blockfrost API | Preprod key | **MAINNET key** |
| Policy Keys | Test keys | **Production keys** |
| Confirmation | "yes" | **"DEPLOY TO PRODUCTION"** |
| Monitoring | Basic | **Enhanced with alerts** |
| Costs | $50-150/month | **$200-500/month** |
| Backup Retention | 7 days | **35 days** |
| Aurora Scaling | 0.5-8 ACUs | **0.5-16 ACUs** |
| Redis | Smaller nodes | **Production-grade nodes** |
| WAF | Testing mode | **Strict enforcement** |
| Alarms | Warnings only | **Critical + Warning** |

## Documentation

For detailed deployment guides, see:

- **Staging**: [STAGING_DEPLOYMENT_GUIDE.md](../STAGING_DEPLOYMENT_GUIDE.md)
- **Staging Checklist**: [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
- **Production Guide**: [PRODUCTION_DEPLOYMENT_GUIDE.md](../PRODUCTION_DEPLOYMENT_GUIDE.md)
- **Production Checklist**: [PRODUCTION_DEPLOYMENT_CHECKLIST.md](../PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- **Production Summary**: [PRODUCTION_DEPLOYMENT_SUMMARY.md](../PRODUCTION_DEPLOYMENT_SUMMARY.md)
- **Production Quick Reference**: [PRODUCTION_QUICK_REFERENCE.md](../PRODUCTION_QUICK_REFERENCE.md)

## Troubleshooting Production

### Production Deployment Fails

1. Check CloudWatch Logs for errors
2. Review CloudFormation events
3. Verify secrets are configured correctly
4. Check that **MAINNET** Blockfrost API key is used
5. Verify production policy signing keys are correct
6. Ensure staging deployment was successful

### Rollback Production

If critical issues occur:

```bash
# Rollback specific stack
aws cloudformation rollback-stack --stack-name TriviaNFT-STACK-production

# Or full rollback
cdk destroy --all --context environment=production
git checkout <previous-tag>
cdk deploy --all --context environment=production
```

## Safety Reminders

- ⚠️ **Never use staging/test keys in production**
- ⚠️ **Always use MAINNET Blockfrost API key**
- ⚠️ **Use production policy signing keys only**
- ⚠️ **Never commit secrets to version control**
- ⚠️ **Store all secrets in password manager**
- ⚠️ **Monitor closely for first 24 hours**
- ⚠️ **Have rollback plan ready**

---

**Remember**: Production is live. Real users, real money, real consequences. Deploy carefully and monitor closely!


## Production Validation Scripts ⭐ NEW

### production-validation.sh 🎯

**Comprehensive production validation suite** that performs automated testing across all critical systems.

**Usage**:
```bash
./scripts/production-validation.sh
```

**What it does**:
Runs 20 automated tests across 4 sections:

**Section 1: Smoke Tests (8 tests)**
- ✅ Frontend accessibility (HTTP 200)
- ✅ API health check
- ✅ Categories endpoint with valid JSON
- ✅ Leaderboard endpoint
- ✅ CORS configuration
- ✅ WAF protection enabled
- ✅ Database cluster available
- ✅ Redis cluster available

**Section 2: Monitoring Dashboards (4 tests)**
- ✅ CloudWatch dashboards exist
- ✅ Lambda function logs accessible
- ✅ X-Ray tracing enabled on all functions
- ✅ Recent API metrics available

**Section 3: Alarm Notifications (3 tests)**
- ✅ CloudWatch alarms configured
- ✅ SNS topics and subscriptions
- ℹ️ Manual alarm notification testing guidance

**Section 4: Initial Traffic Monitoring (5 tests)**
- ✅ Recent Lambda errors check (last hour)
- ✅ API Gateway error rate < 1%
- ✅ API latency < 500ms average
- ✅ Database connections healthy
- ✅ CloudFront cache performance

**Output Features**:
- Color-coded test results (green/red/yellow)
- Emoji indicators for quick scanning
- Detailed error messages
- Pass/fail summary with counts
- Actionable recommendations
- Links to AWS console resources
- Monitoring schedule guidance

**Expected Runtime**: 2-3 minutes

**Exit codes**:
- 0: All tests passed (warnings acceptable)
- 1: One or more critical tests failed

**Example Output**:
```
🚀 Production Validation Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Retrieving production endpoints...
✓ API Endpoint: https://xxx.execute-api.us-east-1.amazonaws.com
✓ CloudFront: https://xxx.cloudfront.net

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SECTION 1: Smoke Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 1.1: Frontend Accessibility
✓ Frontend accessible (HTTP 200)

[... more tests ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VALIDATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Results:
  Total Tests: 20
  Passed: 20
  Failed: 0
  Warnings: 2

✓ Production Validation PASSED

📝 Recommended Next Steps:
  [Detailed monitoring schedule and actions]
```

**When to Run**:
- ✅ After initial production deployment
- ✅ After any infrastructure updates
- ✅ After frontend deployments
- ✅ Daily during first week
- ✅ Weekly thereafter
- ✅ Before major releases
- ✅ After incident resolution

**Requirements**:
- Production infrastructure deployed
- Frontend deployed
- AWS CLI configured
- jq installed (optional but recommended)

## Complete Production Validation Workflow

### Recommended Validation Sequence

After deploying to production, run these scripts in order:

```bash
# 1. Verify infrastructure deployment
./scripts/verify-production.sh

# 2. Run comprehensive validation suite
./scripts/production-validation.sh

# 3. Validate monitoring and alerting
./scripts/validate-production-monitoring.sh

# 4. Run smoke tests
./scripts/smoke-test.sh production

# 5. Verify PWA functionality
./scripts/verify-pwa.sh production
```

**Expected Total Time**: 10-15 minutes

### Monitoring Schedule

**First Hour (Critical)**:
```bash
# Run every 15 minutes
./scripts/production-validation.sh
```

**First 24 Hours (Important)**:
```bash
# Run every 2-4 hours
./scripts/production-validation.sh
./scripts/validate-production-monitoring.sh
```

**First Week (Ongoing)**:
```bash
# Run daily
./scripts/production-validation.sh
./scripts/smoke-test.sh production
```

**Ongoing (Maintenance)**:
```bash
# Run weekly
./scripts/production-validation.sh

# Run after each deployment
./scripts/verify-production.sh
./scripts/smoke-test.sh production
```

## Validation Documentation

For detailed validation procedures, see:

- **Validation Guide**: [PRODUCTION_VALIDATION_GUIDE.md](../PRODUCTION_VALIDATION_GUIDE.md) ⭐ NEW
  - Comprehensive validation procedures
  - Manual testing instructions
  - Monitoring schedule
  - Troubleshooting guide
  - Success criteria

- **Validation Checklist**: [PRODUCTION_VALIDATION_CHECKLIST.md](../PRODUCTION_VALIDATION_CHECKLIST.md) ⭐ NEW
  - Quick reference checklist
  - 100+ validation items
  - Sign-off section
  - Quick commands

- **Task Summary**: [TASK_35.3_VALIDATION_SUMMARY.md](../TASK_35.3_VALIDATION_SUMMARY.md) ⭐ NEW
  - Implementation details
  - Requirements mapping
  - Usage instructions

## Troubleshooting Validation Failures

### Frontend Not Accessible
**Symptoms**: Test 1.1 fails with HTTP error

**Investigation**:
```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Check S3 bucket
aws s3 ls s3://YOUR_BUCKET_NAME/

# Check CloudFront logs
aws logs tail /aws/cloudfront/YOUR_DISTRIBUTION_ID --follow
```

**Resolution**:
- Verify frontend is deployed
- Check CloudFront distribution status
- Verify S3 bucket has content
- Check WAF rules aren't blocking

### API Endpoints Failing
**Symptoms**: Tests 1.2-1.4 fail with HTTP errors

**Investigation**:
```bash
# Check API Gateway
aws apigateway get-rest-api --rest-api-id YOUR_API_ID

# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `TriviaNFT-production`)]'

# Check recent errors
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow --filter-pattern "ERROR"
```

**Resolution**:
- Verify API stack is deployed
- Check Lambda function logs
- Verify secrets are configured
- Check VPC and security groups

### Monitoring Not Configured
**Symptoms**: Section 2 tests fail

**Investigation**:
```bash
# Check ObservabilityStack
aws cloudformation describe-stacks --stack-name TriviaNFT-Observability-production

# List dashboards
aws cloudwatch list-dashboards

# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix "TriviaNFT-production"
```

**Resolution**:
- Verify ObservabilityStack is deployed
- Check CloudFormation stack status
- Review stack outputs
- Redeploy if necessary

### High Error Rate
**Symptoms**: Section 4 tests show high error rate

**Investigation**:
```bash
# Check recent errors
./scripts/production-validation.sh

# Review CloudWatch Logs
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow --filter-pattern "ERROR"

# Check API metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

**Resolution**:
- Review error logs for patterns
- Check secrets configuration
- Verify database connectivity
- Check Redis connectivity
- Review recent deployments

## Quick Reference Commands

**Run full validation**:
```bash
cd infra && ./scripts/production-validation.sh
```

**Check alarm states**:
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

**Check recent errors**:
```bash
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart \
  --follow --filter-pattern "ERROR"
```

**Check API metrics**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

**View dashboards**:
```bash
# Open in browser
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:
```

**View X-Ray traces**:
```bash
# Open in browser
https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map
```

---

**Remember**: Production validation is not a one-time event. Run validation scripts regularly to ensure system health and catch issues early!

