# Staging Deployment Checklist

Use this checklist to ensure a complete and successful deployment to the staging environment.

## Pre-Deployment

- [ ] AWS account configured with appropriate permissions
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Node.js 20+ installed
- [ ] pnpm installed globally
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)
- [ ] Blockfrost account created with preprod API key
- [ ] Repository cloned and dependencies installed
- [ ] All code changes committed and pushed

## Infrastructure Deployment

- [ ] Update `cdk.json` with AWS account ID and region
- [ ] Navigate to `infra` directory
- [ ] Install dependencies: `pnpm install`
- [ ] Build TypeScript: `pnpm build`
- [ ] Bootstrap CDK (first time only): `cdk bootstrap --context environment=staging`
- [ ] Review changes: `cdk diff --all --context environment=staging`
- [ ] Deploy infrastructure: `./scripts/deploy-staging.sh`
- [ ] Verify all stacks deployed successfully
- [ ] Save stack outputs for reference

### Expected Stacks

- [ ] TriviaNFT-Security-staging
- [ ] TriviaNFT-Data-staging
- [ ] TriviaNFT-AppConfig-staging
- [ ] TriviaNFT-Api-staging
- [ ] TriviaNFT-Workflow-staging
- [ ] TriviaNFT-Observability-staging
- [ ] TriviaNFT-Web-staging

## Secrets Configuration

- [ ] Run secrets configuration script: `./scripts/configure-secrets.sh staging`
- [ ] Configure JWT secret (auto-generated or custom)
- [ ] Configure Blockfrost API key (preprod)
- [ ] Configure IPFS/NFT.Storage API key (optional)
- [ ] Configure database credentials (auto-generated or custom)
- [ ] Configure Redis auth token (auto-generated or custom)
- [ ] Configure Cardano policy signing key (test key for staging)

### Update Endpoint Secrets

- [ ] Get database endpoint from CloudFormation outputs
- [ ] Get Redis endpoint from CloudFormation outputs
- [ ] Update database secret with actual endpoint
- [ ] Update Redis secret with actual endpoint

## Database Setup

- [ ] Navigate to `services/api` directory
- [ ] Install dependencies: `pnpm install`
- [ ] Run database migrations: `pnpm migrate:staging`
- [ ] Verify migrations completed successfully
- [ ] Seed initial data: `pnpm seed:staging`
- [ ] Verify categories are created
- [ ] Verify NFT catalog is populated
- [ ] Verify initial season is created

## Frontend Deployment

- [ ] Navigate to `infra` directory
- [ ] Run frontend deployment: `./scripts/deploy-frontend.sh staging`
- [ ] Verify build completed successfully
- [ ] Verify upload to S3 completed
- [ ] Verify CloudFront invalidation completed
- [ ] Test frontend accessibility in browser
- [ ] Verify PWA functionality: `./scripts/verify-pwa.sh staging`

### PWA Verification

- [ ] Web app manifest is accessible
- [ ] Service worker is registered (if implemented)
- [ ] App icons are accessible
- [ ] HTTPS is working
- [ ] Security headers are present
- [ ] Compression is enabled
- [ ] Install prompt appears in Chrome/Edge
- [ ] App can be installed to home screen
- [ ] App opens in standalone mode

## Smoke Tests

- [ ] Run smoke tests: `./scripts/smoke-test.sh staging`
- [ ] Frontend is accessible
- [ ] API health check passes
- [ ] Categories endpoint works
- [ ] Session start endpoint works
- [ ] Leaderboard endpoint works
- [ ] CORS is configured correctly
- [ ] CloudWatch logs are being created
- [ ] CloudWatch alarms are configured
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] WAF is configured
- [ ] Secrets are accessible

## Manual Testing

### Guest User Flow

- [ ] Open staging URL in browser
- [ ] Start a guest session
- [ ] Select a category
- [ ] Answer questions
- [ ] Complete session
- [ ] View results
- [ ] Check session history

### Wallet Connection Flow

- [ ] Connect Cardano wallet (preprod)
- [ ] Create profile with username
- [ ] Verify profile is saved
- [ ] Start authenticated session
- [ ] Complete session
- [ ] Verify increased daily limit (10 vs 5)

### Perfect Score Flow

- [ ] Complete session with 10/10 correct
- [ ] Verify mint eligibility is created
- [ ] Check eligibility expiration countdown
- [ ] Initiate NFT mint
- [ ] Monitor mint status
- [ ] Verify NFT appears in inventory
- [ ] Check transaction on Cardano explorer

### Leaderboard

- [ ] View global leaderboard
- [ ] Verify player appears after session
- [ ] Check points calculation
- [ ] Verify tie-breaker logic
- [ ] Test pagination

### Forging (if NFTs available)

- [ ] View forge progress
- [ ] Check requirements for each forge type
- [ ] Initiate forge (if requirements met)
- [ ] Monitor forge status
- [ ] Verify Ultimate NFT is minted
- [ ] Verify input NFTs are burned

## Monitoring Setup

### CloudWatch Dashboards

- [ ] Open CloudWatch console
- [ ] Verify TriviaNFT dashboard exists
- [ ] Check API metrics are being collected
- [ ] Check Lambda metrics are being collected
- [ ] Check database metrics are being collected
- [ ] Check Redis metrics are being collected

### CloudWatch Alarms

- [ ] Verify alarms are created
- [ ] Test alarm notifications (optional)
- [ ] Configure SNS topic subscriptions
- [ ] Add email addresses for alerts
- [ ] Verify alarm thresholds are appropriate

### CloudWatch Logs

- [ ] Check Lambda function logs
- [ ] Verify structured logging format
- [ ] Check for any errors or warnings
- [ ] Verify log retention is set (30 days)
- [ ] Test Logs Insights queries

## Security Verification

- [ ] WAF is attached to CloudFront
- [ ] Rate limiting rules are active
- [ ] CAPTCHA is configured
- [ ] Security headers are present
- [ ] HTTPS is enforced
- [ ] Secrets are in Secrets Manager (not environment variables)
- [ ] VPC security groups are properly configured
- [ ] Database is in private subnet
- [ ] Redis is in private subnet
- [ ] IAM roles follow least-privilege principle

## Performance Testing

- [ ] Test API response times
- [ ] Test database query performance
- [ ] Test Redis operation latency
- [ ] Test CloudFront cache hit ratio
- [ ] Test concurrent session handling
- [ ] Monitor Lambda cold starts
- [ ] Check Aurora scaling behavior

## Documentation

- [ ] Document API endpoint URL
- [ ] Document CloudFront domain
- [ ] Document database endpoint
- [ ] Document Redis endpoint
- [ ] Document Blockfrost API key location
- [ ] Document any custom configuration
- [ ] Update team wiki/documentation
- [ ] Share staging URL with team

## Post-Deployment

- [ ] Notify team of successful deployment
- [ ] Share staging URL and credentials
- [ ] Schedule team testing session
- [ ] Monitor CloudWatch for first 24 hours
- [ ] Review CloudWatch Logs for errors
- [ ] Check cost explorer for unexpected charges
- [ ] Plan for production deployment

## Rollback Plan

If issues are encountered:

- [ ] Document the issue
- [ ] Check CloudWatch Logs for errors
- [ ] Review CloudFormation events
- [ ] Determine if rollback is needed
- [ ] If rollback needed: `cdk destroy --all --context environment=staging`
- [ ] Fix issues in code
- [ ] Redeploy: `./scripts/deploy-staging.sh`

## Known Limitations (Staging)

- [ ] Using Cardano preprod network (not mainnet)
- [ ] Using test Blockfrost API key (rate limits apply)
- [ ] Using test policy signing keys (not production keys)
- [ ] Smaller instance sizes for cost optimization
- [ ] Limited monitoring retention
- [ ] No custom domain configured
- [ ] No CDN edge locations optimization

## Success Criteria

Deployment is considered successful when:

- ✅ All CloudFormation stacks are deployed
- ✅ All secrets are configured
- ✅ Database migrations completed
- ✅ Frontend is accessible via CloudFront
- ✅ All smoke tests pass
- ✅ Guest user can complete a session
- ✅ Wallet connection works
- ✅ Perfect score grants mint eligibility
- ✅ NFT minting works (test transaction)
- ✅ Leaderboard updates correctly
- ✅ Monitoring dashboards show data
- ✅ No critical errors in CloudWatch Logs

## Estimated Timeline

- Infrastructure deployment: 15-20 minutes
- Secrets configuration: 5-10 minutes
- Database setup: 5 minutes
- Frontend deployment: 5-10 minutes
- Smoke tests: 5 minutes
- Manual testing: 30-60 minutes
- **Total: 1-2 hours**

## Support

If you encounter issues:

1. Check this checklist for missed steps
2. Review CloudWatch Logs for errors
3. Check CloudFormation events for deployment issues
4. Consult STAGING_DEPLOYMENT_GUIDE.md for detailed instructions
5. Review individual stack implementation files in `lib/stacks/`
6. Check AWS service quotas and limits

## Notes

- Keep this checklist updated as deployment process evolves
- Document any issues encountered and their solutions
- Share learnings with the team
- Use this as a template for production deployment checklist

