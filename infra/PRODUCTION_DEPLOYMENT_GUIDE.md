# Production Deployment Guide

This guide walks through deploying the TriviaNFT infrastructure to the production environment.

## ⚠️ CRITICAL WARNINGS

- **This deploys to Cardano MAINNET** - Real ADA will be used
- **Real costs will be incurred** - Monitor AWS billing closely
- **Test in staging first** - Always verify functionality in staging before production
- **Use production keys** - Never use test/staging keys in production
- **Backup everything** - Ensure all data is backed up before deployment
- **Monitor closely** - Watch CloudWatch dashboards and alarms after deployment

## Prerequisites

Before deploying to production, ensure you have:

1. **Successful Staging Deployment**: All functionality tested and verified in staging
2. **AWS Account**: Production AWS account with appropriate permissions
3. **AWS CLI**: Installed and configured with production credentials
   ```bash
   aws configure --profile production
   ```
4. **Node.js**: Version 20 or higher
5. **pnpm**: Package manager installed globally
6. **AWS CDK**: Installed globally
   ```bash
   npm install -g aws-cdk
   ```
7. **Blockfrost Account**: MAINNET API key from https://blockfrost.io/
8. **Production Policy Keys**: Cardano signing keys for NFT minting (MAINNET)
9. **Custom Domain** (Optional): Domain name and Route 53 hosted zone
10. **SSL Certificate** (Optional): ACM certificate in us-east-1 for custom domain

## Pre-Deployment Checklist

- [ ] All features tested and verified in staging
- [ ] Load testing completed successfully
- [ ] Security audit completed
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery plan in place
- [ ] Team trained on production operations
- [ ] Incident response plan documented
- [ ] Rollback procedure tested
- [ ] Production Blockfrost API key obtained (MAINNET)
- [ ] Production policy signing keys generated and secured
- [ ] Database backup strategy confirmed
- [ ] Cost estimates reviewed and approved
- [ ] Stakeholders notified of deployment

## Deployment Steps

### Step 1: Configure AWS Account

Update `cdk.json` with your production AWS account ID and region:

```json
{
  "context": {
    "production": {
      "account": "YOUR_PRODUCTION_AWS_ACCOUNT_ID",
      "region": "us-east-1"
    }
  }
}
```

Or use environment variables:
```bash
export CDK_DEFAULT_ACCOUNT=YOUR_PRODUCTION_AWS_ACCOUNT_ID
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

If this is your first time using CDK in this production account/region:

```bash
cdk bootstrap --context environment=production
```

### Step 5: Review Changes

Preview what will be deployed:

```bash
cdk diff --all --context environment=production
```

**IMPORTANT**: Carefully review all changes, especially:
- IAM policies and roles
- Security group rules
- Database configurations
- Cost implications

### Step 6: Deploy Infrastructure

Deploy all stacks using the automated script:

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

The script will:
1. Verify prerequisites
2. Check for staging deployment
3. Show a diff of changes
4. Require explicit confirmation ("DEPLOY TO PRODUCTION")
5. Deploy all stacks in order

Or deploy manually:

```bash
cdk deploy --all --context environment=production
```

This will deploy the following stacks in order:
1. **SecurityStack**: Secrets Manager, WAF
2. **DataStack**: VPC, Aurora, Redis
3. **AppConfigStack**: Game configuration
4. **ApiStack**: API Gateway, Lambda functions
5. **WorkflowStack**: Step Functions, EventBridge
6. **ObservabilityStack**: CloudWatch dashboards, alarms
7. **WebStack**: S3, CloudFront

**Deployment typically takes 20-30 minutes.**

### Step 7: Configure Secrets

After deployment, configure the required secrets with **PRODUCTION** values:

```bash
chmod +x scripts/configure-secrets.sh
./scripts/configure-secrets.sh production
```

This will prompt you for:
- **JWT Secret**: Strong secret for authentication tokens (auto-generated recommended)
- **Blockfrost API Key**: Your **MAINNET** API key from blockfrost.io
- **IPFS API Key**: Optional, for NFT.Storage (uses Blockfrost IPFS if not provided)
- **Database Credentials**: Username and password for Aurora (auto-generated recommended)
- **Redis Auth Token**: Authentication token for Redis (auto-generated recommended)
- **Policy Signing Key**: **PRODUCTION** Cardano signing key for minting NFTs

⚠️ **CRITICAL**: 
- Use **MAINNET** Blockfrost API key (not preprod)
- Use **PRODUCTION** policy signing keys (not test keys)
- Store all secrets securely in a password manager
- Never commit secrets to version control

### Step 8: Update Database and Redis Secrets

After deployment, update the database and Redis secrets with actual endpoints:

```bash
# Get endpoints from CloudFormation outputs
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-production \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text)

# Update database secret
aws secretsmanager update-secret \
    --secret-id trivia-nft/production/database \
    --secret-string "{\"username\":\"trivianft\",\"password\":\"YOUR_SECURE_PASSWORD\",\"engine\":\"postgres\",\"host\":\"${DB_ENDPOINT}\",\"port\":5432,\"dbname\":\"trivianft\"}"

# Update Redis secret
aws secretsmanager update-secret \
    --secret-id trivia-nft/production/redis \
    --secret-string "{\"authToken\":\"YOUR_SECURE_TOKEN\",\"host\":\"${REDIS_ENDPOINT}\",\"port\":6379}"
```

### Step 9: Run Database Migrations

Initialize the production database schema:

```bash
cd ../services/api
pnpm migrate:production
```

⚠️ **Verify migrations completed successfully before proceeding.**

### Step 10: Seed Initial Data

Add initial categories, NFT catalog, and questions:

```bash
pnpm seed:production
```

This will create:
- 9 trivia categories
- NFT catalog with artwork and metadata
- Initial question pool (100 questions per category)
- Season 1 (Winter)

### Step 11: Verify Deployment

Run the verification script to check all resources:

```bash
cd ../../infra
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh production
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

After deployment, retrieve important outputs:

```bash
# API Endpoint
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text

# CloudFront Domain
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text

# S3 Bucket
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text

# Distribution ID
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text
```

## Cardano Network Configuration

For production, ensure you're using the **MAINNET** network:

1. **Blockfrost API Key**: Must be for mainnet network
2. **Policy Keys**: Use production keys (securely stored)
3. **Wallet Testing**: Use mainnet wallets with real ADA
4. **Transaction Fees**: Real ADA will be spent on transaction fees
5. **NFT Minting**: Real NFTs will be minted on mainnet

## Custom Domain Configuration (Optional)

If you want to use a custom domain (e.g., app.trivianft.com):

### Step 1: Create ACM Certificate

```bash
# Certificate must be in us-east-1 for CloudFront
aws acm request-certificate \
    --domain-name app.trivianft.com \
    --validation-method DNS \
    --region us-east-1
```

### Step 2: Validate Certificate

Add the DNS validation records to your Route 53 hosted zone.

### Step 3: Deploy with Custom Domain

```bash
cdk deploy TriviaNFT-Web-production \
  -c environment=production \
  -c domainName=app.trivianft.com \
  -c hostedZoneId=YOUR_HOSTED_ZONE_ID \
  -c certificateArn=YOUR_CERTIFICATE_ARN
```

## Monitoring Setup

### CloudWatch Dashboards

1. Open CloudWatch console
2. Navigate to Dashboards
3. Open "TriviaNFT-production" dashboard
4. Pin to favorites for quick access

### CloudWatch Alarms

Configure SNS topic subscriptions for production alerts:

```bash
# Get SNS topic ARNs
aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Observability-production \
    --query 'Stacks[0].Outputs'

# Subscribe to critical alerts
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production \
    --protocol email \
    --notification-endpoint oncall@trivianft.com

# Subscribe to warning alerts
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-warning-alarms-production \
    --protocol email \
    --notification-endpoint engineering@trivianft.com
```

### X-Ray Tracing

X-Ray is enabled on all Lambda functions. View traces in the X-Ray console.

## Security Hardening

Production-specific security measures:

- ✅ WAF enabled with strict rate limiting
- ✅ Secrets in Secrets Manager with rotation enabled
- ✅ VPC with private subnets for data layer
- ✅ Encryption at rest and in transit
- ✅ Least-privilege IAM roles
- ✅ CloudTrail enabled for audit logging
- ✅ GuardDuty enabled for threat detection
- ✅ Security headers enforced
- ✅ HTTPS only (no HTTP)
- ✅ Regular security updates

## Cost Optimization

Production environment is configured for performance and reliability:

- **Aurora**: Serverless v2 with auto-scaling (0.5-16 ACUs)
- **Lambda**: ARM64 architecture, right-sized memory
- **Redis**: Production-grade node types with replication
- **CloudFront**: Origin Shield enabled for cost savings
- **S3**: Lifecycle policies for old versions
- **Reserved Capacity**: Consider for predictable workloads

**Expected monthly cost**: $200-500 depending on usage.

Monitor costs daily in AWS Cost Explorer.

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
    --stack-name TriviaNFT-STACK-production \
    --max-items 20
```

### Secret Configuration Issues

If secrets are not accessible:

1. Verify secret names match: `trivia-nft/production/*`
2. Check IAM permissions for Lambda functions
3. Ensure secrets are in the same region

```bash
# List all secrets
aws secretsmanager list-secrets \
    --filters Key=name,Values=trivia-nft/production
```

### Database Connection Issues

If Lambda functions can't connect to Aurora:

1. Verify security group rules
2. Check RDS Proxy configuration
3. Verify database credentials
4. Ensure Lambda functions are in correct VPC subnets

### Redis Connection Issues

If Redis connections fail:

1. Verify security group rules
2. Check Redis auth token
3. Ensure Lambda functions are in correct VPC subnets
4. Verify Redis cluster is "available"

## Rollback Procedure

If critical issues are encountered:

### Option 1: Rollback Specific Stack

```bash
# Cancel in-progress update
aws cloudformation cancel-update-stack --stack-name TriviaNFT-STACK-production

# Or rollback to previous version
aws cloudformation rollback-stack --stack-name TriviaNFT-STACK-production
```

### Option 2: Full Rollback

```bash
# Destroy all stacks
cdk destroy --all --context environment=production

# Redeploy previous version
git checkout <previous-tag>
cdk deploy --all --context environment=production
```

⚠️ **WARNING**: Full rollback will cause downtime. Have a maintenance page ready.

## Post-Deployment

### Immediate Actions (First Hour)

- [ ] Run smoke tests: `./scripts/smoke-test.sh production`
- [ ] Verify all API endpoints are responding
- [ ] Test wallet connection with mainnet wallet
- [ ] Complete one full session flow
- [ ] Verify NFT minting works (test transaction)
- [ ] Check CloudWatch dashboards for errors
- [ ] Monitor CloudWatch Logs for issues
- [ ] Verify monitoring alarms are active
- [ ] Test alarm notifications

### First 24 Hours

- [ ] Monitor CloudWatch dashboards continuously
- [ ] Check error rates and latency
- [ ] Monitor database performance
- [ ] Monitor Redis performance
- [ ] Check Blockfrost API usage
- [ ] Monitor AWS costs
- [ ] Verify backup jobs are running
- [ ] Test disaster recovery procedures
- [ ] Gather user feedback
- [ ] Document any issues encountered

### First Week

- [ ] Review CloudWatch Logs Insights queries
- [ ] Analyze performance metrics
- [ ] Optimize based on real usage patterns
- [ ] Adjust Aurora scaling parameters if needed
- [ ] Adjust Lambda memory/timeout if needed
- [ ] Review and adjust alarm thresholds
- [ ] Conduct security review
- [ ] Review cost optimization opportunities
- [ ] Update documentation based on learnings

## Maintenance

### Regular Tasks

**Daily**:
- Check CloudWatch dashboards
- Review error logs
- Monitor costs

**Weekly**:
- Review performance metrics
- Check for security updates
- Review alarm history
- Analyze user behavior

**Monthly**:
- Review and optimize costs
- Update dependencies
- Security audit
- Backup verification
- Disaster recovery drill

### Updates and Patches

For production updates:

1. Test thoroughly in staging
2. Schedule maintenance window
3. Notify users in advance
4. Deploy during low-traffic period
5. Monitor closely after deployment
6. Have rollback plan ready

## Disaster Recovery

### Backup Strategy

- **Aurora**: Automated daily snapshots (35-day retention)
- **S3**: Versioning enabled, cross-region replication
- **Secrets**: Backed up in secure password manager
- **Infrastructure**: Code in Git, CDK for reproducibility

### Recovery Procedures

**Database Failure**:
1. Restore from latest snapshot
2. Update RDS Proxy endpoint
3. Verify data integrity
4. Resume operations

**Complete Region Failure**:
1. Deploy to backup region using CDK
2. Restore database from cross-region snapshot
3. Update DNS to point to new region
4. Verify all functionality

## Support and Escalation

### On-Call Rotation

- Primary: [Contact]
- Secondary: [Contact]
- Escalation: [Contact]

### Critical Issues

For critical production issues:

1. Check CloudWatch Logs for errors
2. Review CloudWatch alarms
3. Check AWS Health Dashboard
4. Contact AWS Support (if infrastructure issue)
5. Follow incident response plan
6. Document issue and resolution

### AWS Support

- Support Plan: Business or Enterprise
- TAM (if applicable): [Contact]
- Support Cases: https://console.aws.amazon.com/support/

## Compliance and Auditing

- **CloudTrail**: All API calls logged
- **VPC Flow Logs**: Network traffic logged
- **CloudWatch Logs**: Application logs retained 30 days
- **Access Logs**: S3 and CloudFront access logs enabled
- **Audit Reports**: Generate monthly from CloudTrail

## Success Criteria

Production deployment is successful when:

- ✅ All CloudFormation stacks deployed
- ✅ All secrets configured with production values
- ✅ Database migrations completed
- ✅ Frontend accessible via CloudFront
- ✅ All smoke tests pass
- ✅ Wallet connection works with mainnet
- ✅ NFT minting works on mainnet
- ✅ Leaderboard updates correctly
- ✅ Monitoring dashboards show data
- ✅ Alarms are active and notifications work
- ✅ No critical errors in logs
- ✅ Performance meets SLAs
- ✅ Security audit passed
- ✅ Team trained and ready

## Estimated Timeline

- Infrastructure deployment: 20-30 minutes
- Secrets configuration: 10-15 minutes
- Database setup: 10 minutes
- Frontend deployment: 10-15 minutes
- Smoke tests: 10 minutes
- Verification and monitoring setup: 30 minutes
- **Total: 1.5-2 hours**

Plus 24 hours of close monitoring.

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Cardano Documentation](https://docs.cardano.org/)
- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)

## Notes

- **Never use staging/test keys in production**
- **Always test in staging first**
- **Monitor closely after deployment**
- **Have rollback plan ready**
- **Document everything**
- **Keep team informed**

---

**Remember**: Production is live. Real users, real money, real consequences. Deploy carefully and monitor closely.
