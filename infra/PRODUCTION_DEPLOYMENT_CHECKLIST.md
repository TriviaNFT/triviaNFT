# Production Deployment Checklist

Use this checklist to ensure a complete and successful deployment to the production environment.

## ⚠️ CRITICAL REMINDERS

- [ ] **This is PRODUCTION** - Real users, real money, real consequences
- [ ] **Cardano MAINNET** - Real ADA will be used for transactions
- [ ] **Test in staging first** - All functionality must be verified in staging
- [ ] **Use production keys** - Never use test/staging keys
- [ ] **Monitor closely** - Watch dashboards for first 24 hours
- [ ] **Have rollback plan** - Be ready to rollback if issues occur

## Pre-Deployment Requirements

### Staging Verification
- [ ] All features tested and working in staging
- [ ] Load testing completed successfully (see load-tests/CHECKLIST.md)
- [ ] E2E tests passing (see apps/web/e2e/README.md)
- [ ] Integration tests passing (see services/api/src/__tests__/integration/README.md)
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] No critical bugs in staging

### Team Readiness
- [ ] Team trained on production operations
- [ ] On-call rotation established
- [ ] Incident response plan documented
- [ ] Rollback procedure tested in staging
- [ ] Communication plan for users established
- [ ] Stakeholders notified of deployment schedule

### Infrastructure Preparation
- [ ] Production AWS account configured
- [ ] AWS CLI installed and configured with production credentials
- [ ] Node.js 20+ installed
- [ ] pnpm installed globally
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)
- [ ] Production Blockfrost account created (MAINNET)
- [ ] Production Blockfrost API key obtained
- [ ] Production policy signing keys generated and secured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate obtained (if applicable)

### Documentation
- [ ] Production deployment guide reviewed
- [ ] Runbooks created for common operations
- [ ] Disaster recovery procedures documented
- [ ] Monitoring and alerting guide reviewed
- [ ] API documentation up to date
- [ ] User documentation prepared

### Cost and Budget
- [ ] Cost estimates reviewed and approved
- [ ] AWS budget alerts configured
- [ ] Billing contacts updated
- [ ] Reserved capacity evaluated (if applicable)

## Infrastructure Deployment

### Configuration
- [ ] Update `cdk.json` with production AWS account ID and region
- [ ] Navigate to `infra` directory
- [ ] Install dependencies: `pnpm install`
- [ ] Build TypeScript: `pnpm build`
- [ ] Bootstrap CDK (first time only): `cdk bootstrap --context environment=production`

### Review and Deploy
- [ ] Review changes: `cdk diff --all --context environment=production`
- [ ] Review IAM policies carefully
- [ ] Review security group rules
- [ ] Review cost implications
- [ ] Deploy infrastructure: `./scripts/deploy-production.sh`
- [ ] Confirm deployment with "DEPLOY TO PRODUCTION"
- [ ] Wait for deployment to complete (20-30 minutes)
- [ ] Verify all stacks deployed successfully
- [ ] Save stack outputs for reference

### Expected Stacks
- [ ] TriviaNFT-Security-production
- [ ] TriviaNFT-Data-production
- [ ] TriviaNFT-AppConfig-production
- [ ] TriviaNFT-Api-production
- [ ] TriviaNFT-Workflow-production
- [ ] TriviaNFT-Observability-production
- [ ] TriviaNFT-Web-production

## Secrets Configuration

### Configure Production Secrets
- [ ] Run secrets configuration script: `./scripts/configure-secrets.sh production`
- [ ] Configure JWT secret (use auto-generated strong secret)
- [ ] Configure Blockfrost API key (**MAINNET** - not preprod!)
- [ ] Configure IPFS/NFT.Storage API key (optional)
- [ ] Configure database credentials (use auto-generated strong password)
- [ ] Configure Redis auth token (use auto-generated strong token)
- [ ] Configure Cardano policy signing key (**PRODUCTION** keys - not test!)

### Verify Secrets
- [ ] All secrets created in AWS Secrets Manager
- [ ] Secret names follow pattern: `trivia-nft/production/*`
- [ ] Blockfrost API key is for MAINNET (not preprod)
- [ ] Policy signing keys are production keys (not test)
- [ ] All secrets backed up in secure password manager
- [ ] Secrets never committed to version control

### Update Endpoint Secrets
- [ ] Get database endpoint from CloudFormation outputs
- [ ] Get Redis endpoint from CloudFormation outputs
- [ ] Update database secret with actual endpoint
- [ ] Update Redis secret with actual endpoint
- [ ] Verify Lambda functions can access secrets

## Database Setup

### Migrations
- [ ] Navigate to `services/api` directory
- [ ] Install dependencies: `pnpm install`
- [ ] Run database migrations: `pnpm migrate:production`
- [ ] Verify migrations completed successfully
- [ ] Check database schema is correct

### Seed Data
- [ ] Seed initial data: `pnpm seed:production`
- [ ] Verify 9 categories are created
- [ ] Verify NFT catalog is populated
- [ ] Verify initial season is created (Winter Season 1)
- [ ] Verify question pool is generated (100 per category)

### Database Verification
- [ ] Database is accessible from Lambda functions
- [ ] RDS Proxy is configured correctly
- [ ] Connection pooling is working
- [ ] Backup schedule is configured
- [ ] Point-in-time recovery is enabled

## Frontend Deployment

### Build and Deploy
- [ ] Navigate to `infra` directory
- [ ] Run frontend deployment: `./scripts/deploy-frontend.sh production`
- [ ] Verify build completed successfully
- [ ] Verify upload to S3 completed
- [ ] Verify CloudFront invalidation completed
- [ ] Test frontend accessibility in browser
- [ ] Verify PWA functionality: `./scripts/verify-pwa.sh production`

### Frontend Verification
- [ ] Web app manifest is accessible
- [ ] Service worker is registered (if implemented)
- [ ] App icons are accessible
- [ ] HTTPS is working
- [ ] Security headers are present (CSP, HSTS, etc.)
- [ ] Compression is enabled (Gzip/Brotli)
- [ ] Caching is working correctly
- [ ] Install prompt appears in Chrome/Edge
- [ ] App can be installed to home screen
- [ ] App opens in standalone mode

### Custom Domain (if applicable)
- [ ] ACM certificate is validated
- [ ] Route 53 records are configured
- [ ] Custom domain points to CloudFront
- [ ] HTTPS works on custom domain
- [ ] Redirects work correctly

## Smoke Tests

### Automated Tests
- [ ] Run smoke tests: `./scripts/smoke-test.sh production`
- [ ] Frontend is accessible
- [ ] API health check passes
- [ ] Categories endpoint works
- [ ] Session start endpoint works
- [ ] Leaderboard endpoint works
- [ ] CORS is configured correctly
- [ ] All API endpoints respond correctly

### Infrastructure Verification
- [ ] CloudWatch logs are being created
- [ ] CloudWatch alarms are configured
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] WAF is configured and active
- [ ] Secrets are accessible from Lambda
- [ ] Step Functions are deployed
- [ ] EventBridge rules are active

## Manual Testing

### Guest User Flow
- [ ] Open production URL in browser
- [ ] Start a guest session
- [ ] Select a category
- [ ] Answer questions (test timer)
- [ ] Complete session
- [ ] View results
- [ ] Check session history
- [ ] Verify daily limit (5 sessions for guest)

### Wallet Connection Flow (MAINNET)
- [ ] Connect Cardano wallet (MAINNET wallet)
- [ ] Create profile with username
- [ ] Verify profile is saved
- [ ] Start authenticated session
- [ ] Complete session
- [ ] Verify increased daily limit (10 vs 5)
- [ ] Check session appears in history

### Perfect Score Flow (MAINNET)
- [ ] Complete session with 10/10 correct
- [ ] Verify mint eligibility is created
- [ ] Check eligibility expiration countdown (60 minutes)
- [ ] Initiate NFT mint
- [ ] Monitor mint status
- [ ] Verify transaction on Cardano explorer (MAINNET)
- [ ] Verify NFT appears in inventory
- [ ] Verify NFT metadata on IPFS

### Leaderboard
- [ ] View global leaderboard
- [ ] Verify player appears after session
- [ ] Check points calculation is correct
- [ ] Verify tie-breaker logic works
- [ ] Test pagination
- [ ] Check category leaderboards

### Forging (if NFTs available)
- [ ] View forge progress
- [ ] Check requirements for each forge type
- [ ] Initiate forge (if requirements met)
- [ ] Monitor forge status
- [ ] Verify Ultimate NFT is minted
- [ ] Verify input NFTs are burned
- [ ] Check transactions on Cardano explorer

## Monitoring Setup

### CloudWatch Dashboards
- [ ] Open CloudWatch console
- [ ] Verify TriviaNFT-production dashboard exists
- [ ] Check API metrics are being collected
- [ ] Check Lambda metrics are being collected
- [ ] Check database metrics are being collected
- [ ] Check Redis metrics are being collected
- [ ] Check Step Functions metrics are being collected
- [ ] Pin dashboard to favorites

### CloudWatch Alarms
- [ ] Verify all alarms are created
- [ ] Configure SNS topic subscriptions
- [ ] Add email addresses for critical alerts
- [ ] Add email addresses for warning alerts
- [ ] Test alarm notifications (set to ALARM state manually)
- [ ] Verify alarm thresholds are appropriate for production
- [ ] Document alarm response procedures

### CloudWatch Logs
- [ ] Check Lambda function logs
- [ ] Verify structured logging format (JSON)
- [ ] Check for any errors or warnings
- [ ] Verify log retention is set (30 days)
- [ ] Test Logs Insights queries
- [ ] Save useful queries for troubleshooting

### X-Ray Tracing
- [ ] Verify X-Ray is enabled on all Lambda functions
- [ ] Check service map is being generated
- [ ] Review trace data
- [ ] Verify sampling rate (5% for production)
- [ ] Set up trace analysis queries

## Security Verification

### WAF Configuration
- [ ] WAF is attached to CloudFront distribution
- [ ] Rate limiting rules are active (100 req/5min per IP)
- [ ] CAPTCHA is configured for suspicious patterns
- [ ] IP reputation lists are enabled
- [ ] WAF logging is enabled to S3
- [ ] Review WAF metrics in CloudWatch

### Security Headers
- [ ] Content-Security-Policy header is present
- [ ] Strict-Transport-Security (HSTS) is enabled
- [ ] X-Frame-Options is set to DENY
- [ ] X-Content-Type-Options is set to nosniff
- [ ] Referrer-Policy is configured
- [ ] Permissions-Policy is configured

### Secrets and Credentials
- [ ] All secrets are in Secrets Manager (not environment variables)
- [ ] Secrets rotation is configured (90 days)
- [ ] No secrets in CloudWatch Logs
- [ ] No secrets in code or version control
- [ ] IAM roles follow least-privilege principle

### Network Security
- [ ] Database is in private subnet
- [ ] Redis is in private subnet
- [ ] Security groups are properly configured
- [ ] VPC Flow Logs are enabled
- [ ] No public access to data layer

### Compliance
- [ ] CloudTrail is enabled for audit logging
- [ ] GuardDuty is enabled for threat detection
- [ ] AWS Config is enabled (if required)
- [ ] Encryption at rest is enabled (Aurora, Redis, S3)
- [ ] Encryption in transit is enabled (TLS/SSL)

## Performance Testing

### Load Testing
- [ ] Run load tests against production (carefully!)
- [ ] Test API response times under load
- [ ] Test database query performance
- [ ] Test Redis operation latency
- [ ] Test CloudFront cache hit ratio
- [ ] Test concurrent session handling
- [ ] Monitor Lambda cold starts
- [ ] Check Aurora scaling behavior
- [ ] Verify no errors under load

### Performance Metrics
- [ ] API latency < 200ms (p95)
- [ ] Database query time < 100ms (p95)
- [ ] Redis latency < 10ms (p95)
- [ ] CloudFront cache hit ratio > 80%
- [ ] Lambda cold start < 1s
- [ ] No throttling errors
- [ ] No timeout errors

## Cost Monitoring

### AWS Cost Explorer
- [ ] Open AWS Cost Explorer
- [ ] Review current costs
- [ ] Set up cost allocation tags
- [ ] Create cost reports
- [ ] Set up budget alerts
- [ ] Monitor daily costs

### Cost Optimization
- [ ] Aurora scaling is appropriate
- [ ] Lambda memory is right-sized
- [ ] Redis node types are appropriate
- [ ] CloudFront caching is optimized
- [ ] S3 lifecycle policies are configured
- [ ] No unused resources

## Documentation

### Update Documentation
- [ ] Document production API endpoint
- [ ] Document CloudFront domain
- [ ] Document database endpoint
- [ ] Document Redis endpoint
- [ ] Document Blockfrost API key location
- [ ] Document any custom configuration
- [ ] Update team wiki/documentation
- [ ] Share production URL with team

### Runbooks
- [ ] Create runbook for common operations
- [ ] Document incident response procedures
- [ ] Document rollback procedures
- [ ] Document scaling procedures
- [ ] Document backup and restore procedures
- [ ] Document disaster recovery procedures

## Post-Deployment Monitoring

### First Hour
- [ ] Monitor CloudWatch dashboards continuously
- [ ] Check for any errors in CloudWatch Logs
- [ ] Monitor API error rates
- [ ] Monitor Lambda errors
- [ ] Monitor database performance
- [ ] Monitor Redis performance
- [ ] Check Blockfrost API usage
- [ ] Verify no alarms are triggered
- [ ] Test all critical user flows

### First 24 Hours
- [ ] Check CloudWatch dashboards every 2 hours
- [ ] Review error logs regularly
- [ ] Monitor performance metrics
- [ ] Monitor costs in Cost Explorer
- [ ] Verify backup jobs are running
- [ ] Check for any security alerts
- [ ] Gather user feedback
- [ ] Document any issues encountered

### First Week
- [ ] Daily review of CloudWatch dashboards
- [ ] Daily review of error logs
- [ ] Daily cost monitoring
- [ ] Review performance trends
- [ ] Optimize based on real usage patterns
- [ ] Adjust Aurora scaling if needed
- [ ] Adjust Lambda memory/timeout if needed
- [ ] Review and adjust alarm thresholds
- [ ] Conduct security review
- [ ] Review cost optimization opportunities

## Rollback Plan

### Rollback Triggers
- [ ] Critical errors affecting all users
- [ ] Data corruption or loss
- [ ] Security breach
- [ ] Performance degradation > 50%
- [ ] Cost overruns > 200% of estimate

### Rollback Procedure
- [ ] Document the issue
- [ ] Notify stakeholders
- [ ] Put up maintenance page
- [ ] Rollback CloudFormation stacks
- [ ] Restore database from snapshot (if needed)
- [ ] Verify rollback successful
- [ ] Remove maintenance page
- [ ] Post-mortem and root cause analysis

## Success Criteria

Production deployment is considered successful when:

- ✅ All CloudFormation stacks deployed successfully
- ✅ All secrets configured with production values (MAINNET)
- ✅ Database migrations completed successfully
- ✅ Frontend accessible via CloudFront
- ✅ All smoke tests pass
- ✅ Guest user can complete a session
- ✅ Wallet connection works with MAINNET wallet
- ✅ Perfect score grants mint eligibility
- ✅ NFT minting works on MAINNET
- ✅ Leaderboard updates correctly
- ✅ Monitoring dashboards show data
- ✅ Alarms are active and notifications work
- ✅ No critical errors in CloudWatch Logs
- ✅ Performance meets SLAs
- ✅ Security audit passed
- ✅ Cost within budget
- ✅ Team trained and ready
- ✅ Users can access and use the application

## Communication

### Stakeholder Notification
- [ ] Notify stakeholders of deployment start
- [ ] Provide status updates during deployment
- [ ] Notify stakeholders of successful deployment
- [ ] Share production URL and access information
- [ ] Schedule post-deployment review meeting

### User Communication
- [ ] Announce launch on social media
- [ ] Send email to beta users (if applicable)
- [ ] Update website with launch information
- [ ] Prepare support channels for user questions
- [ ] Monitor user feedback channels

## Estimated Timeline

- Infrastructure deployment: 20-30 minutes
- Secrets configuration: 10-15 minutes
- Database setup: 10 minutes
- Frontend deployment: 10-15 minutes
- Smoke tests: 10 minutes
- Manual testing: 30-60 minutes
- Monitoring setup: 30 minutes
- **Total: 2-3 hours**

Plus 24 hours of close monitoring.

## Support

### On-Call
- [ ] On-call rotation is active
- [ ] Contact information is up to date
- [ ] Escalation procedures are documented
- [ ] Incident response plan is ready

### AWS Support
- [ ] AWS Support plan is active (Business or Enterprise)
- [ ] TAM contact information (if applicable)
- [ ] Know how to open support cases

## Final Checks

- [ ] All items in this checklist are complete
- [ ] No critical issues outstanding
- [ ] Team is ready for production operations
- [ ] Monitoring is active and working
- [ ] Rollback plan is ready
- [ ] Users can access the application
- [ ] Everything is working as expected

## Sign-Off

**Deployed By:** _________________  
**Date:** _________________  
**Time:** _________________  
**Deployment Duration:** _________________  

**Verified By:** _________________  
**Date:** _________________  

**Approved By:** _________________  
**Date:** _________________  

## Notes

Use this space to document any issues, deviations from the plan, or important observations:

---

**Remember**: This is PRODUCTION. Real users, real money, real consequences. Deploy carefully, monitor closely, and be ready to respond to issues.
