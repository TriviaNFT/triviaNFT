# Staging Deployment Guide

This guide walks through deploying the TriviaNFT infrastructure to the staging environment.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account**: Access to an AWS account with appropriate permissions
2. **AWS CLI**: Installed and configured with credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 20 or higher
4. **pnpm**: Package manager installed globally
5. **AWS CDK**: Installed globally
   ```bash
   npm install -g aws-cdk
   ```
6. **Blockfrost Account**: API key for Cardano preprod network (https://blockfrost.io/)

## Deployment Steps

### Step 1: Configure AWS Account

Update `cdk.json` with your AWS account ID and region:

```json
{
  "context": {
    "staging": {
      "account": "YOUR_AWS_ACCOUNT_ID",
      "region": "us-east-1"
    }
  }
}
```

Or use environment variables:
```bash
export CDK_DEFAULT_ACCOUNT=YOUR_AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=us-east-1
```

### Step 2: Install Dependencies

```bash
cd infra
pnpm install
```

### Step 3: Build TypeScript

```bash
pnpm build
```

### Step 4: Bootstrap CDK (First Time Only)

If this is your first time using CDK in this account/region:

```bash
cdk bootstrap --context environment=staging
```

### Step 5: Review Changes

Preview what will be deployed:

```bash
cdk diff --all --context environment=staging
```

### Step 6: Deploy Infrastructure

Deploy all stacks using the automated script:

```bash
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

Or deploy manually:

```bash
cdk deploy --all --context environment=staging
```

This will deploy the following stacks in order:
1. **SecurityStack**: Secrets Manager, WAF
2. **DataStack**: VPC, Aurora, Redis
3. **AppConfigStack**: Game configuration
4. **ApiStack**: API Gateway, Lambda functions
5. **WorkflowStack**: Step Functions, EventBridge
6. **ObservabilityStack**: CloudWatch dashboards, alarms
7. **WebStack**: S3, CloudFront

Deployment typically takes 15-20 minutes.

### Step 7: Configure Secrets

After deployment, configure the required secrets:

```bash
chmod +x scripts/configure-secrets.sh
./scripts/configure-secrets.sh staging
```

This will prompt you for:
- **JWT Secret**: Used for authentication tokens (auto-generated if not provided)
- **Blockfrost API Key**: Your preprod API key from blockfrost.io
- **IPFS API Key**: Optional, for NFT.Storage (uses Blockfrost IPFS if not provided)
- **Database Credentials**: Username and password for Aurora (auto-generated if not provided)
- **Redis Auth Token**: Authentication token for Redis (auto-generated if not provided)
- **Policy Signing Key**: Cardano signing key for minting NFTs

### Step 8: Update Database and Redis Secrets

After deployment, update the database and Redis secrets with actual endpoints:

```bash
# Get endpoints from CloudFormation outputs
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text)

# Update database secret
aws secretsmanager update-secret \
    --secret-id trivia-nft/staging/database \
    --secret-string "{\"username\":\"trivianft\",\"password\":\"YOUR_PASSWORD\",\"engine\":\"postgres\",\"host\":\"${DB_ENDPOINT}\",\"port\":5432,\"dbname\":\"trivianft\"}"

# Update Redis secret
aws secretsmanager update-secret \
    --secret-id trivia-nft/staging/redis \
    --secret-string "{\"authToken\":\"YOUR_TOKEN\",\"host\":\"${REDIS_ENDPOINT}\",\"port\":6379}"
```

### Step 9: Run Database Migrations

Initialize the database schema:

```bash
cd ../services/api
pnpm migrate:staging
```

### Step 10: Verify Deployment

Run the verification script to check all resources:

```bash
cd ../../infra
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh staging
```

This checks:
- ✅ All CloudFormation stacks are deployed
- ✅ Secrets are configured
- ✅ API Gateway is accessible
- ✅ CloudFront distribution is deployed
- ✅ VPC and networking are set up
- ✅ Aurora database is running
- ✅ Redis cluster is running
- ✅ AppConfig is configured

## Stack Outputs

After deployment, you can retrieve important outputs:

```bash
# API Endpoint
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text

# CloudFront Domain
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text

# S3 Bucket
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text

# Distribution ID
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text
```

## Cardano Network Configuration

For staging, ensure you're using the **preprod** network:

1. **Blockfrost API Key**: Must be for preprod network
2. **Policy Keys**: Use test keys (not production keys)
3. **Wallet Testing**: Use preprod wallets with test ADA

## Troubleshooting

### Stack Deployment Fails

If a stack fails to deploy:

1. Check CloudFormation console for error details
2. Review CloudWatch Logs for Lambda errors
3. Verify IAM permissions
4. Check resource limits (VPC, EIP, etc.)

```bash
# View stack events
aws cloudformation describe-stack-events \
    --stack-name TriviaNFT-STACK-staging \
    --max-items 20
```

### Secret Configuration Issues

If secrets are not accessible:

1. Verify secret names match the expected format: `trivia-nft/staging/*`
2. Check IAM permissions for Lambda functions
3. Ensure secrets are in the same region as the deployment

```bash
# List all secrets
aws secretsmanager list-secrets \
    --filters Key=name,Values=trivia-nft/staging
```

### Database Connection Issues

If Lambda functions can't connect to Aurora:

1. Verify security group rules allow Lambda → Aurora traffic
2. Check RDS Proxy configuration
3. Verify database credentials in Secrets Manager
4. Ensure Lambda functions are in the correct VPC subnets

```bash
# Test database connectivity from Lambda
aws lambda invoke \
    --function-name TriviaNFT-Api-staging-TestDbConnection \
    --payload '{}' \
    response.json
```

### Redis Connection Issues

If Redis connections fail:

1. Verify security group rules allow Lambda → Redis traffic
2. Check Redis auth token in Secrets Manager
3. Ensure Lambda functions are in the correct VPC subnets
4. Verify Redis cluster is in "available" state

```bash
# Check Redis cluster status
aws elasticache describe-replication-groups \
    --replication-group-id trivia-nft-redis-staging
```

## Cost Optimization

Staging environment is configured for cost optimization:

- **Aurora**: Serverless v2 with auto-pause (scales to 0.5 ACU minimum)
- **Lambda**: ARM64 architecture for lower costs
- **Redis**: Smaller node types (cache.r7g.large)
- **CloudFront**: Origin Shield disabled in staging
- **S3**: Lifecycle policies for old versions

Expected monthly cost: $50-150 depending on usage.

## Security Considerations

Staging environment security:

- ✅ WAF enabled with rate limiting
- ✅ Secrets in Secrets Manager (not environment variables)
- ✅ VPC with private subnets for data layer
- ✅ Encryption at rest and in transit
- ✅ Least-privilege IAM roles
- ⚠️ Use test keys only (not production keys)
- ⚠️ Preprod Cardano network only

## Next Steps

After successful deployment:

1. **Deploy Frontend**: Build and deploy the web application
   ```bash
   cd ../apps/web
   pnpm build
   aws s3 sync dist/ s3://YOUR_BUCKET_NAME/ --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths '/*'
   ```

2. **Seed Data**: Add initial categories, NFT catalog, and questions
   ```bash
   cd ../services/api
   pnpm seed:staging
   ```

3. **Run Smoke Tests**: Verify all functionality works
   ```bash
   cd ../../infra
   ./scripts/smoke-test.sh staging
   ```

4. **Monitor**: Check CloudWatch dashboards and alarms

## Rollback

If you need to rollback a deployment:

```bash
# Rollback a specific stack
aws cloudformation cancel-update-stack --stack-name TriviaNFT-STACK-staging

# Or delete and redeploy
cdk destroy TriviaNFT-STACK-staging --context environment=staging
cdk deploy TriviaNFT-STACK-staging --context environment=staging
```

## Cleanup

To remove all staging resources:

```bash
cdk destroy --all --context environment=staging
```

⚠️ **Warning**: This will delete all data including databases, S3 buckets, and secrets.

## Support

For issues or questions:
- Check CloudWatch Logs for error details
- Review AWS CloudFormation events
- Consult the main README.md for architecture details
- Check individual stack implementation files in `lib/stacks/`

