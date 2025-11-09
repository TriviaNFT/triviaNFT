# TriviaNFT Infrastructure

This directory contains the AWS CDK infrastructure code for the TriviaNFT platform.

## Stack Organization

The infrastructure is organized into six main stacks:

### 1. SecurityStack
- AWS Secrets Manager secrets for JWT, Blockfrost, IPFS, database, Redis, and policy signing keys
- AWS WAF WebACL with rate limiting and CAPTCHA rules
- S3 bucket for WAF logs

### 2. DataStack
- VPC with public, private, and isolated subnets
- Aurora Serverless v2 PostgreSQL cluster with RDS Proxy
- ElastiCache Redis cluster (cluster mode enabled)
- Security groups for Lambda, Aurora, and Redis

### 3. ApiStack
- API Gateway HTTP API with CORS configuration
- Placeholder for Lambda functions (to be added in future tasks)
- Access logging configuration

### 4. WorkflowStack
- Step Functions state machines for mint and forge workflows
- EventBridge rules for scheduled tasks:
  - Daily reset (midnight ET)
  - Eligibility expiration (every minute)
  - Leaderboard snapshot (1 AM ET)
  - Season transition (quarterly)

### 5. ObservabilityStack
- CloudWatch dashboard for monitoring
- SNS topic for alarms
- Log groups for API Gateway and Lambda functions

### 6. WebStack
- S3 bucket for static website hosting
- CloudFront distribution with WAF integration
- Origin Access Identity for secure S3 access

## Reusable Constructs

### TriviaNftLambda
A reusable construct for creating Lambda functions with common configuration:
- Node.js 20 runtime
- ARM64 architecture
- X-Ray tracing enabled
- VPC integration
- Secrets access
- CloudWatch Logs retention

### ApiEndpoint
A reusable construct for creating API Gateway routes with Lambda integrations:
- AWS_PROXY integration
- Automatic permission grants
- Optional JWT authorization

## Environment Configuration

The infrastructure supports two environments: `staging` and `production`.

### Deploy to Staging
```bash
pnpm cdk deploy --all --context environment=staging
```

### Deploy to Production
```bash
pnpm cdk deploy --all --context environment=production
```

### Synthesize CloudFormation Templates
```bash
pnpm cdk synth --context environment=staging
```

### View Differences
```bash
pnpm cdk diff --all --context environment=staging
```

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 20+ installed
3. pnpm installed
4. AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Installation

```bash
cd infra
pnpm install
```

## Build

```bash
pnpm build
```

## Context Configuration

Update `cdk.json` to set account IDs and regions for each environment:

```json
{
  "context": {
    "staging": {
      "account": "123456789012",
      "region": "us-east-1"
    },
    "production": {
      "account": "987654321098",
      "region": "us-east-1"
    }
  }
}
```

## Stack Dependencies

```
SecurityStack (no dependencies)
    ↓
DataStack (depends on SecurityStack for secrets)
    ↓
ApiStack (depends on DataStack for VPC and security groups)

WorkflowStack (no dependencies)
ObservabilityStack (no dependencies)
WebStack (depends on SecurityStack for WAF)
```

## Outputs

Each stack exports important values as CloudFormation outputs:
- API endpoint URLs
- Database endpoints
- Redis endpoints
- CloudFront distribution domain
- Secret ARNs
- State machine ARNs

## Deployment

### Quick Deploy to Staging

```bash
# 1. Deploy infrastructure
./scripts/deploy-staging.sh

# 2. Configure secrets
./scripts/configure-secrets.sh staging

# 3. Verify deployment
./scripts/verify-deployment.sh staging

# 4. Setup database
cd ../services/api
pnpm migrate:staging
pnpm seed:staging

# 5. Deploy frontend
cd ../../infra
./scripts/deploy-frontend.sh staging

# 6. Run smoke tests
./scripts/smoke-test.sh staging
```

See [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for quick reference or [STAGING_DEPLOYMENT_GUIDE.md](STAGING_DEPLOYMENT_GUIDE.md) for detailed instructions.

### Deployment Scripts

All deployment scripts are in the `scripts/` directory:

- **deploy-staging.sh** - Deploy all infrastructure stacks
- **configure-secrets.sh** - Configure AWS Secrets Manager
- **deploy-frontend.sh** - Build and deploy frontend
- **verify-deployment.sh** - Verify infrastructure deployment
- **verify-pwa.sh** - Verify PWA configuration
- **smoke-test.sh** - Run comprehensive smoke tests
- **verify-webstack.sh** - Verify WebStack configuration

See [scripts/README.md](scripts/README.md) for detailed documentation.

### Deployment Documentation

- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick reference guide
- [STAGING_DEPLOYMENT_GUIDE.md](STAGING_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Detailed checklist
- [TASK_34_DEPLOYMENT_SUMMARY.md](TASK_34_DEPLOYMENT_SUMMARY.md) - Implementation summary
