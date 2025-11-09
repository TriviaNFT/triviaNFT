# TriviaNFT Deployment Guide

## Overview

This guide covers the complete deployment process for the TriviaNFT platform, including infrastructure setup, environment configuration, deployment procedures, and rollback strategies.

## Prerequisites

### Required Tools

- **Node.js**: v20 or later
- **pnpm**: v8 or later
- **AWS CLI**: v2 or later
- **AWS CDK**: v2 or later
- **Git**: v2 or later

### AWS Account Setup

1. **Create AWS Accounts**:
   - Staging account
   - Production account

2. **Configure IAM Roles**:
   - Create deployment role with necessary permissions
   - Set up OIDC provider for GitHub Actions

3. **Install AWS CLI**:
   ```bash
   # macOS
   brew install awscli
   
   # Windows
   choco install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

4. **Configure AWS Credentials**:
   ```bash
   aws configure --profile trivianft-staging
   aws configure --profile trivianft-production
   ```

### Third-Party Services

1. **Blockfrost API**:
   - Sign up at https://blockfrost.io
   - Create projects for preprod (staging) and mainnet (production)
   - Save API keys securely

2. **IPFS Service** (Optional):
   - Sign up at https://nft.storage or use Blockfrost IPFS
   - Save API key if using NFT.Storage


## Infrastructure Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/trivianft.git
cd trivianft
```

### 2. Install Dependencies

```bash
# Install root dependencies
pnpm install

# Bootstrap CDK (first time only)
cd infra
pnpm cdk bootstrap aws://ACCOUNT-ID/REGION --profile trivianft-staging
pnpm cdk bootstrap aws://ACCOUNT-ID/REGION --profile trivianft-production
```

### 3. Configure Secrets

Create secrets in AWS Secrets Manager for each environment:

**Staging Secrets**:
```bash
# JWT Secret
aws secretsmanager create-secret \
  --name trivianft/staging/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --profile trivianft-staging

# Blockfrost API Key
aws secretsmanager create-secret \
  --name trivianft/staging/blockfrost-api-key \
  --secret-string "your-preprod-api-key" \
  --profile trivianft-staging

# Database Credentials
aws secretsmanager create-secret \
  --name trivianft/staging/database \
  --secret-string '{"username":"admin","password":"GENERATE_STRONG_PASSWORD"}' \
  --profile trivianft-staging

# Redis URL (will be populated after DataStack deployment)
aws secretsmanager create-secret \
  --name trivianft/staging/redis-url \
  --secret-string "placeholder" \
  --profile trivianft-staging

# Policy Signing Key (Cardano policy key)
aws secretsmanager create-secret \
  --name trivianft/staging/policy-signing-key \
  --secret-string '{"type":"PaymentSigningKeyShelley_ed25519","description":"Policy signing key","cborHex":"..."}' \
  --profile trivianft-staging

# IPFS API Key (if using NFT.Storage)
aws secretsmanager create-secret \
  --name trivianft/staging/ipfs-api-key \
  --secret-string "your-nft-storage-key" \
  --profile trivianft-staging
```

**Production Secrets**: Repeat the above commands with `--profile trivianft-production` and production values.

### 4. Configure CDK Context

Edit `infra/cdk.json` to set environment-specific values:

```json
{
  "app": "npx ts-node bin/app.ts",
  "context": {
    "staging": {
      "account": "123456789012",
      "region": "us-east-1",
      "cardanoNetwork": "preprod",
      "domainName": "staging.trivianft.com",
      "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/...",
      "auroraMinCapacity": 0.5,
      "auroraMaxCapacity": 8
    },
    "production": {
      "account": "987654321098",
      "region": "us-east-1",
      "cardanoNetwork": "mainnet",
      "domainName": "app.trivianft.com",
      "certificateArn": "arn:aws:acm:us-east-1:987654321098:certificate/...",
      "auroraMinCapacity": 2,
      "auroraMaxCapacity": 16
    }
  }
}
```


## Environment Configuration

### Staging Environment

**Purpose**: Testing and validation before production deployment

**Configuration**:
- Cardano Network: Preprod testnet
- Aurora Min ACUs: 0.5
- Aurora Max ACUs: 8
- Redis Node Type: cache.r7g.large
- Lambda Memory: 512MB (most functions)
- Domain: staging.trivianft.com

**Environment Variables** (Frontend):
```bash
EXPO_PUBLIC_API_URL=https://api-staging.trivianft.com
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_BLOCKFROST_URL=https://cardano-preprod.blockfrost.io
EXPO_PUBLIC_ENVIRONMENT=staging
```

### Production Environment

**Purpose**: Live production system

**Configuration**:
- Cardano Network: Mainnet
- Aurora Min ACUs: 2
- Aurora Max ACUs: 16
- Redis Node Type: cache.r7g.large (2 shards, 2 replicas)
- Lambda Memory: 512MB-1024MB
- Domain: app.trivianft.com

**Environment Variables** (Frontend):
```bash
EXPO_PUBLIC_API_URL=https://api.trivianft.com
EXPO_PUBLIC_CARDANO_NETWORK=mainnet
EXPO_PUBLIC_BLOCKFROST_URL=https://cardano-mainnet.blockfrost.io
EXPO_PUBLIC_ENVIRONMENT=production
```

### Local Development

**Configuration**:
- Use LocalStack for AWS services
- Use local PostgreSQL and Redis
- Mock Blockfrost responses

**Environment Variables**:
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_ENVIRONMENT=development
AWS_ENDPOINT=http://localhost:4566
```


## Deployment Process

### Initial Deployment (First Time)

#### Step 1: Deploy Infrastructure Stacks

Deploy stacks in order due to dependencies:

```bash
cd infra

# Set environment
export ENVIRONMENT=staging
export AWS_PROFILE=trivianft-staging

# 1. Deploy SecurityStack (Secrets Manager, WAF)
pnpm cdk deploy SecurityStack --require-approval never

# 2. Deploy DataStack (Aurora, Redis)
pnpm cdk deploy DataStack --require-approval never

# Wait for DataStack to complete, then update Redis URL secret
REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name DataStack \
  --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
  --output text)

aws secretsmanager update-secret \
  --secret-id trivianft/staging/redis-url \
  --secret-string "redis://${REDIS_ENDPOINT}:6379"

# 3. Run database migrations
cd ../services/api
pnpm run migrate:up

# 4. Deploy ApiStack (API Gateway, Lambda functions)
cd ../../infra
pnpm cdk deploy ApiStack --require-approval never

# 5. Deploy WorkflowStack (Step Functions, EventBridge)
pnpm cdk deploy WorkflowStack --require-approval never

# 6. Deploy WebStack (S3, CloudFront)
pnpm cdk deploy WebStack --require-approval never

# 7. Deploy ObservabilityStack (CloudWatch, Alarms)
pnpm cdk deploy ObservabilityStack --require-approval never
```

#### Step 2: Seed Database

```bash
cd services/api

# Seed categories
pnpm run seed:categories

# Seed NFT catalog
pnpm run seed:nft-catalog

# Generate initial questions
pnpm run generate:questions --category all --count 100

# Create initial season
pnpm run seed:season
```

#### Step 3: Deploy Frontend

```bash
cd apps/web

# Build for staging
pnpm run build

# Get S3 bucket name from CloudFormation
WEB_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name WebStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebBucketName`].OutputValue' \
  --output text)

# Sync to S3
aws s3 sync dist/ s3://${WEB_BUCKET}/ --delete

# Get CloudFront distribution ID
CF_DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name WebStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"
```

#### Step 4: Verify Deployment

```bash
# Run smoke tests
cd ../../
pnpm run test:smoke:staging

# Check API health
curl https://api-staging.trivianft.com/health

# Check frontend
open https://staging.trivianft.com
```


### Subsequent Deployments

For updates after initial deployment:

#### Infrastructure Updates

```bash
cd infra
export ENVIRONMENT=staging
export AWS_PROFILE=trivianft-staging

# Preview changes
pnpm cdk diff

# Deploy all stacks
pnpm cdk deploy --all --require-approval never

# Or deploy specific stack
pnpm cdk deploy ApiStack --require-approval never
```

#### Lambda Function Updates

```bash
cd infra

# Deploy only Lambda functions (faster than full stack)
pnpm cdk deploy ApiStack --hotswap

# Note: --hotswap skips CloudFormation for faster Lambda updates
# Only use in non-production environments
```

#### Database Migrations

```bash
cd services/api

# Create new migration
pnpm run migrate:create add_new_column

# Run migrations
pnpm run migrate:up

# Rollback if needed
pnpm run migrate:down
```

#### Frontend Updates

```bash
cd apps/web

# Build
pnpm run build

# Deploy to S3
aws s3 sync dist/ s3://${WEB_BUCKET}/ --delete

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"
```

### Production Deployment

Production deployments should follow a more cautious approach:

```bash
# 1. Deploy to staging first
export ENVIRONMENT=staging
export AWS_PROFILE=trivianft-staging
pnpm cdk deploy --all

# 2. Run full test suite
pnpm run test:e2e:staging
pnpm run test:load:staging

# 3. If tests pass, deploy to production
export ENVIRONMENT=production
export AWS_PROFILE=trivianft-production

# 4. Create backup before deployment
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier trivianft-production \
  --db-cluster-snapshot-identifier pre-deploy-$(date +%Y%m%d-%H%M%S)

# 5. Deploy infrastructure
pnpm cdk deploy --all --require-approval never

# 6. Run migrations
cd ../services/api
pnpm run migrate:up

# 7. Deploy frontend
cd ../../apps/web
pnpm run build
aws s3 sync dist/ s3://${WEB_BUCKET}/ --delete
aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"

# 8. Monitor for 30 minutes
# Check CloudWatch dashboards, alarms, and error rates
```


## CI/CD Pipeline

### GitHub Actions Setup

#### 1. Configure OIDC Provider

In AWS IAM, create an OIDC provider for GitHub Actions:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### 2. Create IAM Role

Create a role that GitHub Actions can assume:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/trivianft:*"
        }
      }
    }
  ]
}
```

Attach policies: `AdministratorAccess` (or more restrictive CDK deployment policy)

#### 3. Configure GitHub Secrets

In your GitHub repository settings, add:

- `AWS_STAGING_ROLE_ARN`: ARN of staging deployment role
- `AWS_PRODUCTION_ROLE_ARN`: ARN of production deployment role
- `WEB_BUCKET_STAGING`: Staging S3 bucket name
- `WEB_BUCKET_PRODUCTION`: Production S3 bucket name
- `CF_DIST_ID_STAGING`: Staging CloudFront distribution ID
- `CF_DIST_ID_PRODUCTION`: Production CloudFront distribution ID

#### 4. Workflow Files

The repository includes these workflows:

- `.github/workflows/test.yml`: Run tests on PRs
- `.github/workflows/deploy-staging.yml`: Deploy to staging on PR
- `.github/workflows/deploy-production.yml`: Deploy to production on main branch merge

### Manual Deployment Triggers

You can manually trigger deployments from GitHub Actions UI:

1. Go to Actions tab
2. Select workflow (e.g., "Deploy to Production")
3. Click "Run workflow"
4. Select branch and confirm


## Rollback Procedures

### Lambda Function Rollback

Lambda functions use versioning and aliases for instant rollback:

```bash
# List recent versions
aws lambda list-versions-by-function \
  --function-name SessionStartFunction \
  --max-items 10

# Update alias to previous version
aws lambda update-alias \
  --function-name SessionStartFunction \
  --name live \
  --function-version 42

# Verify rollback
aws lambda get-alias \
  --function-name SessionStartFunction \
  --name live
```

### Database Rollback

#### Option 1: Run Rollback Migration

```bash
cd services/api

# Rollback last migration
pnpm run migrate:down

# Rollback to specific migration
pnpm run migrate:down --to 20240115_add_column
```

#### Option 2: Restore from Snapshot

```bash
# List recent snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier trivianft-production \
  --max-records 10

# Restore from snapshot (creates new cluster)
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier trivianft-production-restored \
  --snapshot-identifier pre-deploy-20240115-103000 \
  --engine aurora-postgresql

# Update application to use restored cluster
# (requires updating connection string in Secrets Manager)
```

### Frontend Rollback

#### Option 1: Sync Previous Version

```bash
# S3 versioning must be enabled

# List object versions
aws s3api list-object-versions \
  --bucket ${WEB_BUCKET} \
  --prefix index.html

# Restore specific version
aws s3api copy-object \
  --bucket ${WEB_BUCKET} \
  --copy-source ${WEB_BUCKET}/index.html?versionId=VERSION_ID \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"
```

#### Option 2: Redeploy Previous Git Commit

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Build and deploy
cd apps/web
pnpm run build
aws s3 sync dist/ s3://${WEB_BUCKET}/ --delete
aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"

# Return to main branch
git checkout main
```

### Infrastructure Rollback

#### Option 1: CDK Rollback

```bash
cd infra

# Revert to previous CDK code
git checkout <previous-commit-hash>

# Deploy previous version
pnpm cdk deploy --all --require-approval never

# Return to main branch
git checkout main
```

#### Option 2: CloudFormation Rollback

```bash
# Automatic rollback on failure
aws cloudformation update-stack \
  --stack-name ApiStack \
  --use-previous-template \
  --parameters ParameterKey=Environment,UsePreviousValue=true

# Manual rollback to previous state
aws cloudformation cancel-update-stack --stack-name ApiStack
```

### Complete System Rollback

For critical issues requiring full rollback:

```bash
# 1. Rollback Lambda functions to previous versions
./scripts/rollback-lambdas.sh --version previous

# 2. Rollback database (if schema changed)
cd services/api
pnpm run migrate:down

# 3. Rollback frontend
cd ../../apps/web
git checkout <previous-commit-hash>
pnpm run build
aws s3 sync dist/ s3://${WEB_BUCKET}/ --delete
aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"

# 4. Monitor for 15 minutes
# Check error rates, CloudWatch alarms, user reports

# 5. If stable, investigate root cause
# If unstable, consider restoring from backup
```


## Monitoring and Validation

### Post-Deployment Checks

After each deployment, verify:

#### 1. Infrastructure Health

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].StackStatus'

# Check Lambda functions
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `TriviaNFT`)].FunctionName'

# Check API Gateway
aws apigatewayv2 get-apis \
  --query 'Items[?Name==`TriviaNFT-API`]'
```

#### 2. API Health

```bash
# Health check endpoint
curl https://api.trivianft.com/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00Z",
#   "version": "1.0.0",
#   "services": {
#     "database": "healthy",
#     "redis": "healthy",
#     "blockfrost": "healthy"
#   }
# }
```

#### 3. Database Connectivity

```bash
# Connect to Aurora via bastion host or RDS Proxy
psql -h ${DB_ENDPOINT} -U admin -d trivianft

# Run health check query
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM questions;
```

#### 4. Redis Connectivity

```bash
# Connect to Redis
redis-cli -h ${REDIS_ENDPOINT} -p 6379 --tls

# Check cluster info
CLUSTER INFO

# Check memory usage
INFO memory
```

#### 5. CloudWatch Metrics

Check these metrics in CloudWatch:

- API Gateway: Request count, 4xx/5xx errors, latency
- Lambda: Invocations, errors, duration, throttles
- Aurora: CPU utilization, connections, query latency
- Redis: CPU utilization, memory usage, cache hits

#### 6. CloudWatch Alarms

Verify no alarms are in ALARM state:

```bash
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[*].[AlarmName,StateReason]'
```

#### 7. Frontend Accessibility

```bash
# Check frontend loads
curl -I https://app.trivianft.com

# Expected: HTTP 200 OK

# Check CloudFront distribution
aws cloudfront get-distribution \
  --id ${CF_DIST_ID} \
  --query 'Distribution.Status'

# Expected: "Deployed"
```

### Smoke Tests

Run automated smoke tests:

```bash
# Run smoke test suite
pnpm run test:smoke:production

# Tests include:
# - API health check
# - Authentication flow
# - Session creation
# - Question retrieval
# - Leaderboard query
# - Profile retrieval
```

### Load Testing

For major releases, run load tests:

```bash
cd load-tests

# Configure for production
export API_URL=https://api.trivianft.com
export CONCURRENT_USERS=100

# Run load test
pnpm run test:load

# Monitor CloudWatch during test
# Check for:
# - API latency increase
# - Error rate increase
# - Database connection pool exhaustion
# - Lambda throttling
```


## Troubleshooting

### Common Deployment Issues

#### Issue: CDK Deploy Fails with "Resource Already Exists"

**Solution**:
```bash
# Delete the conflicting resource manually
aws cloudformation delete-stack --stack-name <stack-name>

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name <stack-name>

# Retry deployment
pnpm cdk deploy <stack-name>
```

#### Issue: Lambda Function Timeout

**Symptoms**: Functions timing out, 504 Gateway Timeout errors

**Solution**:
```bash
# Increase timeout in CDK code
# In lib/constructs/lambda-function.ts:
timeout: Duration.seconds(60)  // Increase from 30

# Redeploy
pnpm cdk deploy ApiStack
```

#### Issue: Database Connection Pool Exhausted

**Symptoms**: "Too many connections" errors in logs

**Solution**:
```bash
# Increase max connections in RDS Proxy
aws rds modify-db-proxy \
  --db-proxy-name trivianft-proxy \
  --max-connections-percent 100

# Or reduce Lambda concurrency
aws lambda put-function-concurrency \
  --function-name SessionStartFunction \
  --reserved-concurrent-executions 50
```

#### Issue: Redis Memory Full

**Symptoms**: Eviction errors, cache misses

**Solution**:
```bash
# Check memory usage
aws elasticache describe-cache-clusters \
  --cache-cluster-id trivianft-redis \
  --show-cache-node-info

# Scale up node type
aws elasticache modify-cache-cluster \
  --cache-cluster-id trivianft-redis \
  --cache-node-type cache.r7g.xlarge \
  --apply-immediately
```

#### Issue: CloudFront Cache Not Invalidating

**Symptoms**: Old content still served after deployment

**Solution**:
```bash
# Create invalidation with wildcard
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --id <invalidation-id>

# If still not working, disable caching temporarily
aws cloudfront update-distribution \
  --id ${CF_DIST_ID} \
  --default-cache-behavior MinTTL=0,DefaultTTL=0,MaxTTL=0
```

#### Issue: Secrets Manager Access Denied

**Symptoms**: Lambda functions can't read secrets

**Solution**:
```bash
# Check Lambda execution role has permission
aws iam get-role-policy \
  --role-name TriviaNFT-Lambda-Role \
  --policy-name SecretsManagerAccess

# Add permission if missing
aws iam put-role-policy \
  --role-name TriviaNFT-Lambda-Role \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

### Debugging Tools

#### CloudWatch Logs Insights

Query Lambda logs:

```sql
-- Find errors in last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- Find slow queries
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| filter @duration > 5000
| sort @duration desc
```

#### X-Ray Tracing

View request traces:

```bash
# Get trace IDs for failed requests
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'error = true'

# Get detailed trace
aws xray batch-get-traces \
  --trace-ids <trace-id>
```

#### Database Query Analysis

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```


## Security Considerations

### Secrets Management

- **Never commit secrets to Git**: Use AWS Secrets Manager
- **Rotate secrets regularly**: Set up automatic rotation (90 days)
- **Use least privilege**: Grant only necessary permissions
- **Audit access**: Enable CloudTrail logging for Secrets Manager

### Network Security

- **VPC Configuration**: Lambda functions in private subnets
- **Security Groups**: Restrict inbound/outbound traffic
- **WAF Rules**: Enable rate limiting and CAPTCHA
- **TLS/SSL**: Enforce HTTPS only, TLS 1.2+

### IAM Best Practices

- **Separate roles per function**: Don't reuse execution roles
- **Use resource-based policies**: Restrict access to specific resources
- **Enable MFA**: Require MFA for production deployments
- **Regular audits**: Review IAM policies quarterly

### Compliance

- **Data encryption**: At rest and in transit
- **Audit logging**: CloudTrail enabled for all API calls
- **Backup retention**: 35 days for Aurora, 7 days for Redis
- **Incident response**: Document and test procedures

## Maintenance

### Regular Tasks

#### Daily
- Monitor CloudWatch alarms
- Check error rates in logs
- Review API latency metrics

#### Weekly
- Review and address flagged questions
- Check database performance
- Analyze user engagement metrics
- Review security logs

#### Monthly
- Update dependencies (security patches)
- Review and optimize costs
- Backup verification (test restore)
- Capacity planning review

#### Quarterly
- Rotate secrets (JWT, policy keys)
- Review and update IAM policies
- Disaster recovery drill
- Performance optimization review

### Scaling Considerations

#### When to Scale Up

**Aurora**:
- CPU utilization > 70% for 5+ minutes
- Connection pool > 80% utilized
- Query latency > 100ms p95

**Redis**:
- Memory utilization > 80%
- Eviction rate > 100/minute
- CPU utilization > 70%

**Lambda**:
- Throttling errors > 1%
- Duration approaching timeout
- Concurrent executions > 80% of limit

#### Scaling Actions

```bash
# Scale Aurora
aws rds modify-db-cluster \
  --db-cluster-identifier trivianft-production \
  --serverless-v2-scaling-configuration MinCapacity=4,MaxCapacity=32

# Scale Redis (add shards)
aws elasticache modify-replication-group \
  --replication-group-id trivianft-redis \
  --num-node-groups 4

# Increase Lambda concurrency
aws lambda put-function-concurrency \
  --function-name SessionStartFunction \
  --reserved-concurrent-executions 200
```

## Disaster Recovery

### Backup Strategy

**Aurora**:
- Automated daily snapshots (35-day retention)
- Point-in-time recovery enabled
- Cross-region snapshot copy

**Redis**:
- Daily backups (7-day retention)
- Automatic failover enabled
- Multi-AZ deployment

**S3**:
- Versioning enabled
- Cross-region replication
- Lifecycle policies for old versions

### Recovery Procedures

#### Scenario 1: Database Corruption

```bash
# 1. Identify last known good snapshot
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier trivianft-production

# 2. Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier trivianft-production-restored \
  --snapshot-identifier <snapshot-id>

# 3. Update application connection string
aws secretsmanager update-secret \
  --secret-id trivianft/production/database \
  --secret-string '{"host":"new-endpoint","username":"admin","password":"..."}'

# 4. Restart Lambda functions to pick up new connection
aws lambda update-function-configuration \
  --function-name SessionStartFunction \
  --environment Variables={FORCE_RESTART=true}
```

#### Scenario 2: Region Failure

```bash
# 1. Promote read replica in secondary region
aws rds promote-read-replica \
  --db-instance-identifier trivianft-production-replica-us-west-2

# 2. Update Route 53 to point to secondary region
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://failover-dns.json

# 3. Deploy application to secondary region
export AWS_REGION=us-west-2
pnpm cdk deploy --all
```

#### Scenario 3: Complete System Failure

```bash
# 1. Deploy infrastructure to new region
export AWS_REGION=us-west-2
pnpm cdk deploy --all

# 2. Restore database from cross-region snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier trivianft-production \
  --snapshot-identifier <cross-region-snapshot>

# 3. Restore S3 data from replication bucket
aws s3 sync s3://trivianft-backup-us-west-2/ s3://trivianft-production-us-west-2/

# 4. Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dr-dns.json

# 5. Verify all services
pnpm run test:smoke:production
```

## Support and Escalation

### Deployment Support

- **Slack**: #trivianft-deployments
- **Email**: devops@trivianft.com
- **On-call**: PagerDuty rotation

### Escalation Path

1. **Level 1**: DevOps engineer (deployment issues)
2. **Level 2**: Senior engineer (architecture issues)
3. **Level 3**: CTO (critical system failure)

### Incident Response

For production incidents:

1. **Assess severity**: P0 (critical), P1 (high), P2 (medium), P3 (low)
2. **Create incident**: Use incident management tool
3. **Notify stakeholders**: Based on severity
4. **Investigate and mitigate**: Follow runbooks
5. **Post-mortem**: Document lessons learned

## Additional Resources

- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Cardano Documentation**: https://docs.cardano.org/
- **Blockfrost API Docs**: https://docs.blockfrost.io/
- **Internal Wiki**: https://wiki.trivianft.com/deployment

