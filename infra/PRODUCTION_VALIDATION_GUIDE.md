# Production Validation Guide

This guide provides comprehensive instructions for validating the TriviaNFT production deployment.

## Overview

Production validation ensures that:
- ✅ All smoke tests pass
- ✅ Monitoring dashboards are operational
- ✅ Alarm notifications are configured
- ✅ Initial traffic is being monitored
- ✅ System is ready for real users

## Prerequisites

- Production infrastructure deployed
- Frontend deployed to production
- Database migrations completed
- Initial data seeded
- AWS CLI configured with production credentials

## Validation Sections

### Section 1: Smoke Tests

Verify basic functionality of all production components.

#### 1.1 Frontend Accessibility
```bash
curl -I https://YOUR_CLOUDFRONT_DOMAIN/
# Expected: HTTP 200
```

#### 1.2 API Health Check
```bash
curl https://YOUR_API_ENDPOINT/health
# Expected: HTTP 200 or 404 (if not implemented)
```

#### 1.3 Categories Endpoint
```bash
curl https://YOUR_API_ENDPOINT/categories
# Expected: HTTP 200 with JSON array of categories
```

#### 1.4 Leaderboard Endpoint
```bash
curl https://YOUR_API_ENDPOINT/leaderboard/global
# Expected: HTTP 200 with leaderboard data
```

#### 1.5 CORS Configuration
```bash
curl -I -X OPTIONS https://YOUR_API_ENDPOINT/categories \
  -H "Origin: https://YOUR_CLOUDFRONT_DOMAIN" \
  -H "Access-Control-Request-Method: GET"
# Expected: Access-Control-Allow-Origin header present
```

#### 1.6 WAF Protection
```bash
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Security-production \
  --query 'Stacks[0].Outputs[?OutputKey==`WebAclArn`].OutputValue'
# Expected: WAF WebACL ARN
```

#### 1.7 Database Status
```bash
aws rds describe-db-clusters \
  --query 'DBClusters[?contains(DBClusterIdentifier, `trivia-nft-production`)].Status'
# Expected: "available"
```

#### 1.8 Redis Status
```bash
aws elasticache describe-replication-groups \
  --query 'ReplicationGroups[?contains(ReplicationGroupId, `trivia-nft-production`)].Status'
# Expected: "available"
```


### Section 2: Monitoring Dashboards

Verify all monitoring and observability components are operational.

#### 2.1 CloudWatch Dashboards

**Check Dashboard Existence:**
```bash
aws cloudwatch list-dashboards \
  --query 'DashboardEntries[?contains(DashboardName, `TriviaNFT-production`)].DashboardName'
```

**Expected Dashboards:**
- TriviaNFT-production-API
- TriviaNFT-production-Database
- TriviaNFT-production-Redis
- TriviaNFT-production-Blockchain

**Access Dashboards:**
1. Open AWS Console → CloudWatch → Dashboards
2. Verify each dashboard displays metrics
3. Check for any missing data or errors
4. Bookmark dashboards for quick access

**Key Metrics to Monitor:**
- API Gateway: Request count, latency, error rate
- Lambda: Invocations, errors, duration, throttles
- Aurora: Connections, CPU, query latency
- Redis: Memory usage, cache hit rate, evictions
- CloudFront: Requests, cache hit rate, error rate

#### 2.2 Lambda Function Logs

**List Log Groups:**
```bash
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/TriviaNFT-Api-production" \
  --query 'logGroups[*].logGroupName'
```

**Check Recent Logs:**
```bash
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart --follow
```

**Verify Log Retention:**
```bash
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/TriviaNFT-Api-production" \
  --query 'logGroups[*].[logGroupName,retentionInDays]'
# Expected: 30 days retention
```

#### 2.3 X-Ray Tracing

**Verify X-Ray is Enabled:**
```bash
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `TriviaNFT-production`)].{Name:FunctionName,Tracing:TracingConfig.Mode}'
```

**Access X-Ray Console:**
1. Open AWS Console → X-Ray → Service Map
2. Verify service map shows all components
3. Check for any errors or high latency
4. Review trace details for sample requests

**Expected Tracing Mode:** Active

#### 2.4 CloudWatch Logs Insights

**Saved Queries to Create:**

**API Errors:**
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

**Slow Queries:**
```
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| sort @duration desc
| limit 20
```

**Session Metrics:**
```
fields @timestamp, sessionId, score
| filter @message like /session completed/
| stats count() by bin(5m)
```


### Section 3: Alarm Notifications

Verify alarm configuration and test notification delivery.

#### 3.1 CloudWatch Alarms

**List All Alarms:**
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production" \
  --query 'MetricAlarms[*].[AlarmName,StateValue,ActionsEnabled]'
```

**Expected Alarms:**
- API-ErrorRate: Triggers when error rate > 5%
- API-Latency: Triggers when p99 latency > 3000ms
- Lambda-Errors: Triggers when function errors > 10
- Database-Connections: Triggers when connections > 90
- Redis-Memory: Triggers when memory usage > 80%
- StepFunction-Failures: Triggers when workflow failures > 3

**Check Alarm States:**
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

**Expected States:**
- OK: Alarm is not triggered
- INSUFFICIENT_DATA: Not enough data yet (acceptable for new deployment)
- ALARM: Issue detected (investigate immediately)

#### 3.2 SNS Topics and Subscriptions

**List SNS Topics:**
```bash
aws sns list-topics \
  --query 'Topics[?contains(TopicArn, `trivia-nft`) && contains(TopicArn, `production`)].TopicArn'
```

**Expected Topics:**
- trivia-nft-critical-alarms-production
- trivia-nft-warning-alarms-production

**Check Subscriptions:**
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:trivia-nft-critical-alarms-production \
  --query 'Subscriptions[*].[Protocol,Endpoint,SubscriptionArn]'
```

**Configure Subscriptions (if not done):**
```bash
# Subscribe email for critical alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:trivia-nft-critical-alarms-production \
  --protocol email \
  --notification-endpoint oncall@example.com

# Subscribe email for warnings
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:trivia-nft-warning-alarms-production \
  --protocol email \
  --notification-endpoint team@example.com
```

**Confirm Subscriptions:**
Check email and click confirmation link in SNS subscription email.

#### 3.3 Test Alarm Notifications

**⚠️ WARNING:** This will trigger a real alarm. Only do this during a planned test window.

**Test Critical Alarm:**
```bash
# Trigger test alarm
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-production-API-ErrorRate" \
  --state-value ALARM \
  --state-reason "Testing alarm notification system"

# Wait for notification (should arrive within 1-2 minutes)

# Reset alarm
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-production-API-ErrorRate" \
  --state-value OK \
  --state-reason "Test complete"
```

**Verification Checklist:**
- [ ] Email notification received
- [ ] Notification contains alarm details
- [ ] Notification includes link to CloudWatch
- [ ] Notification received by all subscribers
- [ ] Alarm reset successfully


### Section 4: Initial Traffic Monitoring

Monitor system behavior under initial production traffic.

#### 4.1 Recent Lambda Errors

**Check for Errors in Last Hour:**
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/TriviaNFT-Api-production-SessionStart" \
  --start-time $(($(date +%s) - 3600))000 \
  --filter-pattern "ERROR" \
  --query 'events[*].message'
```

**Expected:** No errors or minimal errors

**If Errors Found:**
1. Review error messages
2. Check CloudWatch Logs for full context
3. Verify configuration and secrets
4. Check for deployment issues
5. Review recent code changes

#### 4.2 API Gateway Metrics

**Request Count (Last Hour):**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

**Error Rate (Last Hour):**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

**Latency (Last Hour):**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

**Target Metrics:**
- Error Rate: < 1%
- Average Latency: < 500ms
- P99 Latency: < 2000ms

#### 4.3 Database Performance

**Connection Count:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBClusterIdentifier,Value=YOUR_CLUSTER_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

**CPU Utilization:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBClusterIdentifier,Value=YOUR_CLUSTER_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

**Target Metrics:**
- Connections: < 50 (with RDS Proxy)
- CPU: < 50%
- Query Latency: < 100ms

#### 4.4 Redis Performance

**Memory Usage:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=ReplicationGroupId,Value=YOUR_REDIS_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

**Cache Hit Rate:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CacheHitRate \
  --dimensions Name=ReplicationGroupId,Value=YOUR_REDIS_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average
```

**Target Metrics:**
- Memory Usage: < 70%
- Cache Hit Rate: > 80%
- Evictions: 0

#### 4.5 CloudFront Performance

**Request Count:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=YOUR_DISTRIBUTION_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

**Cache Hit Rate:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=YOUR_DISTRIBUTION_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --region us-east-1
```

**Target Metrics:**
- Cache Hit Rate: > 80%
- Error Rate: < 1%


## Running the Automated Validation Script

The automated validation script performs all checks in one command:

```bash
cd infra
chmod +x scripts/production-validation.sh
./scripts/production-validation.sh
```

**Script Sections:**
1. Smoke Tests (8 tests)
2. Monitoring Dashboards (4 tests)
3. Alarm Notifications (3 tests)
4. Initial Traffic Monitoring (5 tests)

**Expected Output:**
```
🚀 Production Validation Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Retrieving production endpoints...
✓ API Endpoint: https://xxx.execute-api.us-east-1.amazonaws.com
✓ CloudFront: https://xxx.cloudfront.net

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SECTION 1: Smoke Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 1.1: Frontend Accessibility
✓ Frontend accessible (HTTP 200)

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VALIDATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Results:
  Total Tests: 20
  Passed: 20
  Failed: 0
  Warnings: 2

✓ Production Validation PASSED
```

## Manual End-to-End Testing

After automated validation, perform manual testing:

### 1. Frontend Access
1. Open production URL in browser
2. Verify page loads correctly
3. Check for console errors
4. Test responsive design on mobile

### 2. Wallet Connection (MAINNET)
1. Connect Cardano MAINNET wallet (Lace, Nami, etc.)
2. Verify stake key is detected
3. Create profile with username
4. Verify JWT token is stored

### 3. Complete Session Flow
1. Select a category
2. Answer all 10 questions
3. Verify timer works correctly
4. Check session results
5. Verify leaderboard updates

### 4. NFT Minting (Test Transaction)
1. Achieve perfect score (10/10)
2. Verify mint eligibility appears
3. Initiate mint (small test)
4. Monitor Step Function execution
5. Verify NFT appears in wallet
6. Check transaction on Cardano explorer

### 5. Leaderboard Verification
1. Check global leaderboard
2. Verify your rank appears
3. Check category leaderboards
4. Verify points calculation

## Monitoring Schedule

### First Hour
- [ ] Check dashboards every 15 minutes
- [ ] Monitor error logs continuously
- [ ] Watch for alarm notifications
- [ ] Verify API response times
- [ ] Check database connections

### First 24 Hours
- [ ] Check dashboards every hour
- [ ] Review error logs 4x per day
- [ ] Monitor AWS costs
- [ ] Check Blockfrost API usage
- [ ] Verify backup jobs run
- [ ] Gather user feedback

### First Week
- [ ] Daily dashboard review
- [ ] Daily error log review
- [ ] Weekly performance analysis
- [ ] Weekly cost review
- [ ] Weekly security audit
- [ ] Optimize based on usage patterns

## Troubleshooting Common Issues

### High Error Rate
**Symptoms:** API error rate > 5%

**Investigation:**
1. Check CloudWatch Logs for error patterns
2. Review recent deployments
3. Check secrets configuration
4. Verify database connectivity
5. Check Redis connectivity

**Resolution:**
- Fix configuration issues
- Rollback if needed
- Scale resources if capacity issue

### High Latency
**Symptoms:** API latency > 2000ms

**Investigation:**
1. Check database query performance
2. Review Redis cache hit rate
3. Check Lambda cold starts
4. Review X-Ray traces

**Resolution:**
- Optimize slow queries
- Increase Lambda memory
- Adjust Aurora scaling
- Improve caching strategy

### Database Connection Issues
**Symptoms:** Connection errors in logs

**Investigation:**
1. Check RDS Proxy configuration
2. Verify security groups
3. Check connection pool settings
4. Review database credentials

**Resolution:**
- Adjust RDS Proxy settings
- Fix security group rules
- Update connection pool size
- Rotate credentials if needed

### Alarm Fatigue
**Symptoms:** Too many false alarms

**Investigation:**
1. Review alarm thresholds
2. Check for noisy metrics
3. Analyze alarm history

**Resolution:**
- Adjust alarm thresholds
- Add composite alarms
- Implement alarm suppression
- Use anomaly detection

## Success Criteria

Production validation is successful when:

- ✅ All automated tests pass
- ✅ No critical errors in logs
- ✅ All dashboards show data
- ✅ Alarms are configured and tested
- ✅ SNS subscriptions confirmed
- ✅ Manual end-to-end test passes
- ✅ Wallet connection works on MAINNET
- ✅ NFT minting works on MAINNET
- ✅ Performance meets targets
- ✅ No security issues detected
- ✅ Team trained on monitoring
- ✅ Incident response plan ready

## Post-Validation Actions

After successful validation:

1. **Document Baseline Metrics**
   - Record normal traffic patterns
   - Document typical error rates
   - Note average latency
   - Record resource utilization

2. **Set Up Alerts**
   - Configure PagerDuty/OpsGenie
   - Set up Slack notifications
   - Configure SMS for critical alerts
   - Test escalation procedures

3. **Create Runbooks**
   - Document common issues
   - Create troubleshooting guides
   - Document rollback procedures
   - Create incident response templates

4. **Schedule Reviews**
   - Daily monitoring reviews (first week)
   - Weekly performance reviews
   - Monthly cost reviews
   - Quarterly security audits

5. **Communicate Status**
   - Notify stakeholders of successful launch
   - Share monitoring dashboard links
   - Document known issues
   - Set expectations for support

## Emergency Contacts

**On-Call Rotation:**
- Primary: [Contact]
- Secondary: [Contact]
- Escalation: [Contact]

**AWS Support:**
- Support Plan: Business/Enterprise
- TAM: [Contact if applicable]
- Support Portal: https://console.aws.amazon.com/support/

**Vendor Support:**
- Blockfrost: support@blockfrost.io
- Cardano: https://forum.cardano.org/

## Additional Resources

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Quick Reference](./PRODUCTION_QUICK_REFERENCE.md)
- [Monitoring Quick Reference](./MONITORING_QUICK_REFERENCE.md)
- [Security Quick Reference](./SECURITY_QUICK_REFERENCE.md)
- [CloudWatch Dashboards](https://console.aws.amazon.com/cloudwatch/)
- [X-Ray Service Map](https://console.aws.amazon.com/xray/)

---

**Remember:** Production validation is not a one-time event. Continuous monitoring and improvement are essential for maintaining a healthy production environment.

