# Quick Deploy Guide

Fast reference for deploying to staging. For detailed instructions, see [STAGING_DEPLOYMENT_GUIDE.md](STAGING_DEPLOYMENT_GUIDE.md).

## Prerequisites

```bash
# Install tools
npm install -g aws-cdk
npm install -g pnpm

# Configure AWS
aws configure
```

## Deploy Infrastructure (15-20 min)

```bash
cd infra
pnpm install
pnpm build
./scripts/deploy-staging.sh
```

## Configure Secrets (5-10 min)

```bash
./scripts/configure-secrets.sh staging
```

Get your Blockfrost API key from: https://blockfrost.io/ (use preprod project)

## Verify Infrastructure (2 min)

```bash
./scripts/verify-deployment.sh staging
```

## Setup Database (5 min)

```bash
cd ../services/api
pnpm install
pnpm migrate:staging
pnpm seed:staging
```

## Deploy Frontend (5-10 min)

```bash
cd ../../infra
./scripts/deploy-frontend.sh staging
```

## Verify PWA (2 min)

```bash
./scripts/verify-pwa.sh staging
```

## Run Smoke Tests (5 min)

```bash
./scripts/smoke-test.sh staging
```

## Get URLs

```bash
# API Endpoint
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Api-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text

# Frontend URL
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Web-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
  --output text
```

## Manual Testing

1. Open frontend URL in browser
2. Connect preprod wallet
3. Create profile
4. Complete a session
5. Check leaderboard

## Troubleshooting

### Deployment fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name TriviaNFT-STACK-staging \
  --max-items 20
```

### API errors
```bash
# Check Lambda logs
aws logs tail /aws/lambda/TriviaNFT-Api-staging-FUNCTION --follow
```

### Frontend issues
```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id DISTRIBUTION_ID
```

## Rollback

```bash
cdk destroy --all --context environment=staging
```

## Full Documentation

- [STAGING_DEPLOYMENT_GUIDE.md](STAGING_DEPLOYMENT_GUIDE.md) - Complete guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Detailed checklist
- [scripts/README.md](scripts/README.md) - Script documentation
- [TASK_34_DEPLOYMENT_SUMMARY.md](TASK_34_DEPLOYMENT_SUMMARY.md) - Implementation details

## Support

Check CloudWatch Logs for errors:
```bash
aws logs tail /aws/lambda/TriviaNFT-Api-staging-SessionStart --follow
```

