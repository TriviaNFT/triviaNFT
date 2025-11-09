# Production Validation Checklist

Quick checklist for validating production deployment.

## Pre-Validation

- [x] Production infrastructure deployed
- [x] Frontend deployed to production
- [x] Database migrations completed
- [x] Initial data seeded
- [x] Secrets configured with production values
- [x] Team notified of validation start

## Automated Validation

- [x] Run automated validation script
  ```bash
  cd infra
  ./scripts/production-validation.sh
  ```
- [x] All smoke tests pass (8/8)
- [x] All monitoring tests pass (4/4)
- [x] All alarm tests pass (3/3)
- [x] All traffic monitoring tests pass (5/5)
- [x] Review and address any warnings

## Smoke Tests

- [x] Frontend accessible (HTTP 200)
- [x] API health check responds
- [x] Categories endpoint returns data
- [x] Leaderboard endpoint accessible
- [x] CORS headers configured
- [x] WAF protection enabled
- [x] Database cluster available
- [x] Redis cluster available

## Monitoring Dashboards

- [x] CloudWatch dashboards exist
- [x] API dashboard shows metrics
- [x] Database dashboard shows metrics
- [x] Redis dashboard shows metrics
- [x] Lambda function logs accessible
- [x] X-Ray tracing enabled on all functions
- [x] Log retention set to 30 days
- [x] CloudWatch Logs Insights queries created

## Alarm Notifications

- [x] All expected alarms configured
- [x] Alarms in OK or INSUFFICIENT_DATA state
- [x] SNS topics created
- [x] SNS subscriptions configured
- [x] SNS subscriptions confirmed (check email)
- [x] Test alarm notification sent
- [x] Test notification received
- [x] Alarm reset after test

## Initial Traffic Monitoring

- [x] No errors in Lambda logs (last hour)
- [x] API error rate < 1%
- [x] API latency < 500ms average
- [x] Database connections < 50
- [x] Database CPU < 50%
- [x] Redis memory usage < 70%
- [x] Redis cache hit rate > 80%
- [x] CloudFront cache hit rate > 80%

## Manual End-to-End Testing

- [ ] Frontend loads in browser
- [ ] No console errors
- [ ] Responsive design works on mobile
- [ ] Connect MAINNET wallet successfully
- [ ] Create profile with username
- [ ] Select category
- [ ] Complete full session (10 questions)
- [ ] Timer works correctly
- [ ] Session results display correctly
- [ ] Leaderboard updates with new score

## NFT Minting Test (Optional)

- [ ] Achieve perfect score (10/10)
- [ ] Mint eligibility appears
- [ ] Initiate mint transaction
- [ ] Step Function executes successfully
- [ ] Transaction confirmed on blockchain
- [ ] NFT appears in wallet
- [ ] NFT visible on Cardano explorer

## Performance Verification

- [ ] API response time < 500ms
- [ ] Database query time < 100ms
- [ ] Redis operations < 10ms
- [ ] CloudFront cache working
- [ ] No Lambda cold start issues
- [ ] No timeout errors

## Security Verification

- [ ] WAF rules active
- [ ] Rate limiting working
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers present
- [ ] Secrets not exposed in logs
- [ ] IAM roles follow least privilege
- [ ] VPC security groups configured

## Cost Monitoring

- [ ] AWS Cost Explorer shows expected costs
- [ ] No unexpected charges
- [ ] Blockfrost API usage within limits
- [ ] Aurora scaling as expected
- [ ] Lambda costs reasonable
- [ ] CloudFront costs reasonable

## Documentation

- [ ] Baseline metrics documented
- [ ] Known issues documented
- [ ] Monitoring procedures documented
- [ ] Incident response plan ready
- [ ] Rollback procedure documented
- [ ] Team trained on monitoring

## Communication

- [ ] Stakeholders notified of launch
- [ ] Dashboard links shared with team
- [ ] On-call rotation confirmed
- [ ] Support contacts documented
- [ ] Status page updated (if applicable)

## Post-Validation Actions

- [ ] Schedule first hour monitoring
- [ ] Schedule 24-hour review
- [ ] Schedule week 1 review
- [ ] Set up continuous monitoring alerts
- [ ] Create runbooks for common issues
- [ ] Document lessons learned

## First Hour Monitoring

- [ ] Check dashboards at T+15min
- [ ] Check dashboards at T+30min
- [ ] Check dashboards at T+45min
- [ ] Check dashboards at T+60min
- [ ] Review error logs continuously
- [ ] Monitor for alarm notifications
- [ ] Verify API response times stable
- [ ] Check database connections stable

## First 24 Hours

- [ ] Hour 2: Dashboard check
- [ ] Hour 4: Dashboard check
- [ ] Hour 8: Dashboard check
- [ ] Hour 12: Dashboard check
- [ ] Hour 16: Dashboard check
- [ ] Hour 20: Dashboard check
- [ ] Hour 24: Full review
- [ ] Monitor AWS costs
- [ ] Check Blockfrost usage
- [ ] Gather user feedback

## Sign-Off

**Validated By:** ___________________

**Date:** ___________________

**Time:** ___________________

**Notes:**
```
[Add any notes about the validation process, issues encountered, or follow-up actions needed]
```

**Status:** 
- [ ] ✅ PASSED - Production ready
- [ ] ⚠️ PASSED WITH WARNINGS - Monitor closely
- [ ] ❌ FAILED - Do not launch

---

## Quick Commands

**Run Full Validation:**
```bash
cd infra && ./scripts/production-validation.sh
```

**Check Alarms:**
```bash
aws cloudwatch describe-alarms --alarm-name-prefix "TriviaNFT-production" --query 'MetricAlarms[*].[AlarmName,StateValue]' --output table
```

**Check Recent Errors:**
```bash
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow --filter-pattern "ERROR"
```

**Check API Metrics:**
```bash
aws cloudwatch get-metric-statistics --namespace AWS/ApiGateway --metric-name Count --dimensions Name=ApiId,Value=YOUR_API_ID --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 3600 --statistics Sum
```

**View Dashboards:**
```bash
# Open in browser
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:
```

