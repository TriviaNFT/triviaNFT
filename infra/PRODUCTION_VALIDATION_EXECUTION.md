# Production Validation Execution Guide

## Overview

This guide provides step-by-step instructions for executing production validation of the TriviaNFT platform. Follow these steps in order to ensure all components are functioning correctly.

**⚠️ IMPORTANT:** This is PRODUCTION validation on Cardano MAINNET. Real ADA will be spent on test transactions.

## Prerequisites

Before starting validation:

- [x] Production infrastructure deployed (Task 35.1)
- [x] Frontend deployed to production (Task 35.2)
- [x] AWS CLI configured with production credentials
- [x] Access to AWS Console
- [x] Cardano MAINNET wallet with small amount of ADA for testing
- [x] Team notified of validation start time

## Validation Execution Steps

### Step 1: Run Automated Validation Script

Execute the comprehensive validation script:

```bash
cd infra
chmod +x scripts/production-validation.sh
./scripts/production-validation.sh
```

**Expected Output:**
- 20 tests executed
- All tests pass (or pass with warnings)
- Summary report generated

**If Script Fails:**
- Review error messages
- Check CloudFormation stack status
- Verify secrets are configured
- Check AWS credentials
- Review troubleshooting section below

**Record Results:**
```
Date: _______________
Time: _______________
Tests Passed: ___ / 20
Tests Failed: ___
Warnings: ___
```

### Step 2: Verify Monitoring Dashboards

1. **Open CloudWatch Dashboards:**
   ```
   https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:
   ```

2. **Check Each Dashboard:**
   - [ ] TriviaNFT-production-API
     - Verify API metrics are being collected
     - Check request count, latency, error rate
   - [ ] TriviaNFT-production-Database
     - Verify database metrics are visible
     - Check connections, CPU, query latency
   - [ ] TriviaNFT-production-Redis
     - Verify Redis metrics are visible
     - Check memory usage, cache hit rate
   - [ ] TriviaNFT-production-Blockchain
     - Verify blockchain metrics (if applicable)

3. **Bookmark Dashboards:**
   - Save dashboard URLs for quick access
   - Share links with team

**Record Results:**
```
Dashboards Found: ___
All Metrics Visible: [ ] Yes [ ] No
Issues Found: _______________
```

### Step 3: Verify Alarm Configuration

1. **Open CloudWatch Alarms:**
   ```
   https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
   ```

2. **Check Alarm States:**
   ```bash
   aws cloudwatch describe-alarms \
     --alarm-name-prefix "TriviaNFT-production" \
     --query 'MetricAlarms[*].[AlarmName,StateValue]' \
     --output table
   ```

3. **Expected Alarms:**
   - [ ] TriviaNFT-production-API-ErrorRate (OK or INSUFFICIENT_DATA)
   - [ ] TriviaNFT-production-API-Latency (OK or INSUFFICIENT_DATA)
   - [ ] TriviaNFT-production-Lambda-Errors (OK or INSUFFICIENT_DATA)
   - [ ] TriviaNFT-production-Database-Connections (OK or INSUFFICIENT_DATA)
   - [ ] TriviaNFT-production-Redis-Memory (OK or INSUFFICIENT_DATA)
   - [ ] TriviaNFT-production-StepFunction-Failures (OK or INSUFFICIENT_DATA)

4. **Check SNS Subscriptions:**
   - [ ] Critical alarms topic has confirmed subscriptions
   - [ ] Warning alarms topic has confirmed subscriptions
   - [ ] Test email received for subscription confirmation

**Record Results:**
```
Alarms Configured: ___
Alarms in OK State: ___
Alarms in ALARM State: ___
SNS Subscriptions Confirmed: [ ] Yes [ ] No
```

### Step 4: Test Alarm Notifications (Optional)

**⚠️ WARNING:** This will trigger a real alarm. Only perform during planned test window.

1. **Trigger Test Alarm:**
   ```bash
   aws cloudwatch set-alarm-state \
     --alarm-name "TriviaNFT-production-API-ErrorRate" \
     --state-value ALARM \
     --state-reason "Testing alarm notification system"
   ```

2. **Wait for Notification:**
   - Check email inbox (1-2 minutes)
   - Verify notification contains alarm details
   - Verify notification includes CloudWatch link

3. **Reset Alarm:**
   ```bash
   aws cloudwatch set-alarm-state \
     --alarm-name "TriviaNFT-production-API-ErrorRate" \
     --state-value OK \
     --state-reason "Test complete"
   ```

**Record Results:**
```
Notification Received: [ ] Yes [ ] No
Time to Receive: ___ seconds
Notification Content Correct: [ ] Yes [ ] No
```

### Step 5: Manual Frontend Testing

1. **Get CloudFront URL:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name TriviaNFT-Web-production \
     --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
     --output text
   ```

2. **Open in Browser:**
   - [ ] Page loads without errors
   - [ ] No console errors (F12 → Console)
   - [ ] All images and assets load
   - [ ] Responsive design works on mobile
   - [ ] PWA install prompt appears (if supported)

3. **Test Navigation:**
   - [ ] Category selection screen loads
   - [ ] Leaderboard page loads
   - [ ] Profile page loads (if applicable)

**Record Results:**
```
Frontend URL: _______________
Page Load Time: ___ seconds
Console Errors: ___
Mobile Responsive: [ ] Yes [ ] No
```

### Step 6: Test Wallet Connection (MAINNET)

**⚠️ CRITICAL:** This uses MAINNET. Ensure you have a test wallet with small ADA amount.

1. **Connect Wallet:**
   - [ ] Click "Connect Wallet" button
   - [ ] Select wallet (Lace, Nami, Eternl, etc.)
   - [ ] Approve connection in wallet
   - [ ] Verify stake key is detected

2. **Create Profile:**
   - [ ] Enter unique username
   - [ ] Optionally enter email
   - [ ] Submit profile
   - [ ] Verify profile created successfully

3. **Verify Session:**
   - [ ] Refresh page
   - [ ] Verify still logged in
   - [ ] Check localStorage for JWT token
   - [ ] Verify username displays correctly

**Record Results:**
```
Wallet Connected: [ ] Yes [ ] No
Wallet Type: _______________
Profile Created: [ ] Yes [ ] No
Username: _______________
Session Persists: [ ] Yes [ ] No
```

### Step 7: Complete Session Flow

1. **Start Session:**
   - [ ] Select a trivia category
   - [ ] Verify session start message displays
   - [ ] Verify daily limit counter shows

2. **Answer Questions:**
   - [ ] First question displays correctly
   - [ ] Timer counts down from 10 seconds
   - [ ] Answer options are clickable
   - [ ] Submit answer
   - [ ] Verify feedback shows (correct/incorrect)
   - [ ] Next question loads automatically
   - [ ] Complete all 10 questions

3. **View Results:**
   - [ ] Session results display correctly
   - [ ] Score is accurate
   - [ ] Timing is shown
   - [ ] Correct/incorrect breakdown shown

4. **Check Leaderboard:**
   - [ ] Navigate to leaderboard
   - [ ] Verify your score appears
   - [ ] Verify rank is calculated correctly

**Record Results:**
```
Session Completed: [ ] Yes [ ] No
Score: ___ / 10
Timer Worked: [ ] Yes [ ] No
Results Accurate: [ ] Yes [ ] No
Leaderboard Updated: [ ] Yes [ ] No
```

### Step 8: Test NFT Minting (Optional - Costs ADA)

**⚠️ WARNING:** This will spend real ADA on MAINNET. Only perform if you want to test minting.

1. **Achieve Perfect Score:**
   - Complete a session with 10/10 correct answers
   - [ ] Mint eligibility appears
   - [ ] Countdown timer shows (1 hour for connected users)
   - [ ] "Mint Now" button is visible

2. **Initiate Mint:**
   - [ ] Click "Mint Now" button
   - [ ] Verify NFT details display
   - [ ] Confirm mint transaction
   - [ ] Monitor minting progress

3. **Monitor Step Function:**
   - Open AWS Console → Step Functions
   - Find mint execution
   - [ ] Verify execution progresses through all steps
   - [ ] Check for any errors

4. **Verify NFT:**
   - [ ] Transaction confirmed on blockchain
   - [ ] NFT appears in wallet
   - [ ] NFT metadata loads correctly
   - [ ] NFT visible on Cardano explorer

**Record Results:**
```
Perfect Score Achieved: [ ] Yes [ ] No
Mint Initiated: [ ] Yes [ ] No
Transaction Hash: _______________
NFT Received: [ ] Yes [ ] No
ADA Spent: ___ ADA
```

### Step 9: Monitor Initial Traffic

1. **Check Lambda Errors (Last Hour):**
   ```bash
   aws logs filter-log-events \
     --log-group-name "/aws/lambda/TriviaNFT-Api-production-SessionStart" \
     --start-time $(($(date +%s) - 3600))000 \
     --filter-pattern "ERROR" \
     --query 'events[*].message'
   ```

2. **Check API Metrics:**
   - [ ] Request count > 0
   - [ ] Error rate < 1%
   - [ ] Average latency < 500ms

3. **Check Database:**
   - [ ] Connection count < 50
   - [ ] CPU utilization < 50%
   - [ ] No connection errors

4. **Check Redis:**
   - [ ] Memory usage < 70%
   - [ ] Cache hit rate > 80%
   - [ ] No evictions

**Record Results:**
```
Lambda Errors: ___
API Requests (1hr): ___
API Error Rate: ___%
API Avg Latency: ___ ms
DB Connections: ___
Redis Memory: ___%
```

### Step 10: Review X-Ray Traces

1. **Open X-Ray Service Map:**
   ```
   https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map
   ```

2. **Verify Service Map:**
   - [ ] All services appear in map
   - [ ] Connections between services shown
   - [ ] No error nodes (red)
   - [ ] Latency is reasonable

3. **Review Sample Traces:**
   - [ ] Select a trace
   - [ ] Verify all segments present
   - [ ] Check for slow segments
   - [ ] Review any errors or faults

**Record Results:**
```
Service Map Complete: [ ] Yes [ ] No
Traces Available: [ ] Yes [ ] No
Errors in Traces: ___
Slowest Segment: _______________
```

## Validation Completion Checklist

### Critical Tests (Must Pass)
- [ ] Automated validation script passes
- [ ] Frontend accessible
- [ ] API endpoints respond
- [ ] Database available
- [ ] Redis available
- [ ] Wallet connection works
- [ ] Session flow completes
- [ ] Leaderboard updates
- [ ] No critical errors in logs

### Monitoring Tests (Must Pass)
- [ ] CloudWatch dashboards exist
- [ ] Dashboards display metrics
- [ ] Alarms configured
- [ ] SNS subscriptions confirmed
- [ ] X-Ray tracing enabled
- [ ] Log retention configured

### Optional Tests
- [ ] Alarm notifications tested
- [ ] NFT minting tested
- [ ] Performance meets targets
- [ ] Security scan completed

## Validation Sign-Off

**Validation Completed By:** ___________________

**Date:** ___________________

**Time:** ___________________

**Overall Status:**
- [ ] ✅ PASSED - Production ready for launch
- [ ] ⚠️ PASSED WITH WARNINGS - Monitor closely
- [ ] ❌ FAILED - Do not launch, fix issues first

**Critical Issues Found:**
```
[List any critical issues that must be fixed before launch]
```

**Warnings/Minor Issues:**
```
[List any warnings or minor issues to monitor]
```

**Baseline Metrics Recorded:**
```
API Requests/Hour: ___
Average Latency: ___ ms
Error Rate: ___%
DB Connections: ___
Redis Memory: ___%
```

**Next Steps:**
```
[List immediate next steps after validation]
```

## Post-Validation Monitoring Schedule

### First Hour (Every 15 Minutes)
- [ ] T+15min: Check dashboards
- [ ] T+30min: Check dashboards
- [ ] T+45min: Check dashboards
- [ ] T+60min: Check dashboards and review logs

### First 24 Hours (Every 4 Hours)
- [ ] Hour 4: Dashboard check
- [ ] Hour 8: Dashboard check
- [ ] Hour 12: Dashboard check
- [ ] Hour 16: Dashboard check
- [ ] Hour 20: Dashboard check
- [ ] Hour 24: Full review

### First Week (Daily)
- [ ] Day 2: Full review
- [ ] Day 3: Full review
- [ ] Day 4: Full review
- [ ] Day 5: Full review
- [ ] Day 6: Full review
- [ ] Day 7: Week 1 retrospective

## Troubleshooting

### Issue: Automated Script Fails

**Possible Causes:**
- AWS CLI not configured
- Insufficient permissions
- Stacks not deployed
- Network connectivity issues

**Resolution:**
1. Verify AWS CLI: `aws sts get-caller-identity`
2. Check IAM permissions
3. Verify stack status in CloudFormation
4. Check network/VPN connection

### Issue: Frontend Not Accessible

**Possible Causes:**
- CloudFront distribution not ready
- S3 bucket empty
- DNS not propagated
- WAF blocking requests

**Resolution:**
1. Check CloudFront distribution status
2. Verify S3 bucket has files
3. Wait for DNS propagation (up to 48 hours)
4. Check WAF rules

### Issue: Wallet Connection Fails

**Possible Causes:**
- Wallet extension not installed
- Wrong network (testnet vs mainnet)
- API endpoint incorrect
- CORS configuration issue

**Resolution:**
1. Install/enable wallet extension
2. Switch wallet to MAINNET
3. Verify API endpoint in frontend config
4. Check CORS headers in API Gateway

### Issue: High Error Rate

**Possible Causes:**
- Configuration errors
- Database connectivity issues
- Redis connectivity issues
- Secrets not configured

**Resolution:**
1. Check CloudWatch Logs for error patterns
2. Verify database security groups
3. Verify Redis security groups
4. Check Secrets Manager values

### Issue: High Latency

**Possible Causes:**
- Lambda cold starts
- Slow database queries
- Redis cache misses
- Network latency

**Resolution:**
1. Enable Lambda provisioned concurrency
2. Optimize database queries
3. Improve caching strategy
4. Check VPC configuration

## Emergency Rollback

If critical issues are found during validation:

1. **Stop User Traffic:**
   - Update CloudFront to serve maintenance page
   - Or disable API Gateway

2. **Rollback Infrastructure:**
   ```bash
   cd infra
   git checkout <previous-commit>
   npm run deploy:production
   ```

3. **Rollback Frontend:**
   ```bash
   cd apps/web
   git checkout <previous-commit>
   npm run deploy:production
   ```

4. **Notify Team:**
   - Send notification to team
   - Update status page
   - Document issues found

5. **Investigate and Fix:**
   - Review logs and errors
   - Fix issues in development
   - Test in staging
   - Re-deploy to production

## Support Contacts

**On-Call Engineer:** ___________________  
**Phone:** ___________________  
**Email:** ___________________

**AWS Support:**  
**Case Number:** ___________________  
**TAM:** ___________________

**Escalation Contact:** ___________________  
**Phone:** ___________________

## Additional Resources

- [Production Validation Guide](./PRODUCTION_VALIDATION_GUIDE.md)
- [Production Validation Checklist](./PRODUCTION_VALIDATION_CHECKLIST.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Quick Reference](./PRODUCTION_QUICK_REFERENCE.md)
- [Monitoring Quick Reference](./MONITORING_QUICK_REFERENCE.md)

---

**Remember:** Production validation is critical. Take your time, follow each step carefully, and document everything. If in doubt, consult with the team before proceeding.

**Good luck with your production launch! 🚀**
