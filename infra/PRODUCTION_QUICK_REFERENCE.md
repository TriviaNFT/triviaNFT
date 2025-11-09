# Production Deployment Quick Reference

## 🚀 Quick Start

```bash
# 1. Deploy infrastructure
cd infra
./scripts/deploy-production.sh

# 2. Configure secrets (use MAINNET keys!)
./scripts/configure-secrets.sh production

# 3. Run database migrations
cd ../services/api
pnpm migrate:production
pnpm seed:production

# 4. Deploy frontend
cd ../../infra
./scripts/deploy-frontend.sh production

# 5. Verify deployment
./scripts/verify-production.sh
./scripts/smoke-test.sh production
./scripts/validate-production-monitoring.sh
```

## ⚠️ Critical Reminders

- **Use MAINNET Blockfrost API key** (not preprod)
- **Use production policy signing keys** (not test keys)
- **Type "DEPLOY TO PRODUCTION"** to confirm deployment
- **Monitor closely for first 24 hours**
- **Have rollback plan ready**

## 📋 Pre-Deployment Checklist

- [ ] All features tested in staging
- [ ] Load testing completed
- [ ] E2E and integration tests passing
- [ ] Team ready (on-call rotation)
- [ ] MAINNET Blockfrost API key obtained
- [ ] Production policy signing keys generated
- [ ] Rollback procedure tested

## 🔧 Key Scripts

| Script | Purpose |
|--------|---------|
| `deploy-production.sh` | Deploy all CDK stacks |
| `configure-secrets.sh production` | Configure secrets |
| `deploy-frontend.sh production` | Deploy web app |
| `verify-production.sh` | Verify infrastructure |
| `smoke-test.sh production` | Run smoke tests |
| `validate-production-monitoring.sh` | Validate monitoring |

## 📊 Get Stack Outputs

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

## 🔐 Configure SNS Subscriptions

```bash
# Critical alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production \
  --protocol email \
  --notification-endpoint oncall@trivianft.com

# Warning alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-warning-alarms-production \
  --protocol email \
  --notification-endpoint engineering@trivianft.com
```

## 🔄 Rollback

```bash
# Rollback specific stack
aws cloudformation rollback-stack --stack-name TriviaNFT-STACK-production

# Full rollback
cdk destroy --all --context environment=production
git checkout <previous-tag>
cdk deploy --all --context environment=production
```

## 📈 Monitoring

### CloudWatch Dashboard
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=TriviaNFT-production

### CloudWatch Alarms
```bash
# List all alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production"

# Check alarm states
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

### CloudWatch Logs
```bash
# View recent Lambda logs
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/TriviaNFT-Api-production-SessionStart \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

## 💰 Cost Monitoring

```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Set up budget alert
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

## 🧪 Manual Testing

1. **Guest Session**
   - Open production URL
   - Start guest session
   - Complete session
   - Check leaderboard

2. **Wallet Connection (MAINNET)**
   - Connect MAINNET wallet
   - Create profile
   - Start session
   - Complete session

3. **Perfect Score (MAINNET)**
   - Get 10/10 correct
   - Verify mint eligibility
   - Mint NFT
   - Check on Cardano explorer

## 🆘 Troubleshooting

### API Not Responding
```bash
# Check Lambda logs
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow

# Check API Gateway
aws apigateway get-rest-apis --query 'items[?name==`TriviaNFT-Api-production`]'
```

### Database Connection Issues
```bash
# Check RDS cluster status
aws rds describe-db-clusters \
  --query 'DBClusters[?contains(DBClusterIdentifier, `trivia-nft-production`)]'

# Check security groups
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*trivia-nft-production*"
```

### Redis Connection Issues
```bash
# Check Redis cluster status
aws elasticache describe-replication-groups \
  --query 'ReplicationGroups[?contains(ReplicationGroupId, `trivia-nft-production`)]'
```

### Frontend Not Loading
```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Check S3 bucket
aws s3 ls s3://YOUR_BUCKET_NAME/

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## 📞 Support Contacts

- **On-Call**: [Contact]
- **AWS Support**: https://console.aws.amazon.com/support/
- **Blockfrost Support**: support@blockfrost.io

## 📚 Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Production Deployment Summary](./PRODUCTION_DEPLOYMENT_SUMMARY.md)
- [Staging Deployment Guide](./STAGING_DEPLOYMENT_GUIDE.md)

## ⏱️ Timeline

- Infrastructure deployment: 20-30 minutes
- Secrets configuration: 10-15 minutes
- Database setup: 10 minutes
- Frontend deployment: 10-15 minutes
- Validation: 30-60 minutes
- **Total: 1.5-2 hours**

Plus 24 hours of close monitoring.

## ✅ Success Criteria

- All CloudFormation stacks deployed
- All secrets configured (MAINNET keys)
- Database migrations completed
- Frontend accessible
- All smoke tests pass
- Wallet connection works (MAINNET)
- NFT minting works (MAINNET)
- Monitoring active
- No critical errors

---

**Remember**: This is PRODUCTION. Real users, real money, real consequences. Deploy carefully and monitor closely!
