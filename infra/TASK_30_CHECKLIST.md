# Task 30: Configure Monitoring and Alerting - Deployment Checklist

## Pre-Deployment Checklist

### Code Changes
- [x] Enhanced ObservabilityStack with CloudWatch Logs Insights queries
- [x] Added separate SNS topics for critical and warning alerts
- [x] Configured AWS X-Ray sampling rules
- [x] Added email subscription helper method
- [x] Updated alarm actions to use appropriate SNS topics
- [x] Fixed TypeScript compilation errors
- [x] Verified no diagnostic errors

### Documentation
- [x] Created comprehensive monitoring and alerting guide
- [x] Created quick reference guide
- [x] Created implementation summary
- [x] Created deployment checklist

## Deployment Steps

### 1. Deploy ObservabilityStack
```bash
cd infra
npm run build
cdk deploy TriviaNFT-Observability-staging --profile staging
cdk deploy TriviaNFT-Observability-production --profile production
```

### 2. Subscribe Email Addresses to SNS Topics

#### Option A: Via CDK (Recommended)
Add to your CDK app before deployment:
```typescript
observabilityStack.subscribeEmailsToAlarms({
  critical: [
    'oncall@trivianft.com',
    'engineering-lead@trivianft.com',
  ],
  warning: [
    'engineering@trivianft.com',
    'devops@trivianft.com',
  ],
});
```

#### Option B: Via AWS CLI
```bash
# Get SNS topic ARNs from CloudFormation outputs
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

### 3. Confirm Email Subscriptions
- [ ] Check email inboxes for AWS SNS confirmation emails
- [ ] Click confirmation links in each email
- [ ] Verify subscriptions are confirmed in AWS Console

### 4. Enable X-Ray Tracing on Lambda Functions

Update Lambda function definitions to enable tracing:
```typescript
const myFunction = new lambda.Function(this, 'MyFunction', {
  // ... other props
  tracing: lambda.Tracing.ACTIVE,
});
```

Then add X-Ray permissions:
```typescript
observabilityStack.enableXRayTracing([
  sessionStartFunction,
  sessionAnswerFunction,
  sessionCompleteFunction,
  mintInitiateFunction,
  forgeInitiateFunction,
  // ... other functions
]);
```

### 5. Verify CloudWatch Logs Insights Queries
```bash
# List saved queries
aws logs describe-query-definitions \
  --query-definition-name-prefix "TriviaNFT"

# Test a query
aws logs start-query \
  --log-group-name /aws/lambda/trivia-nft-production \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string "fields @timestamp, @message | filter @message like /ERROR/ | limit 10"
```

### 6. Test Alarm Notifications
```bash
# Set an alarm to ALARM state to test notifications
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-API-ErrorRate-production" \
  --state-value ALARM \
  --state-reason "Testing alarm notification system"

# Wait for email notification
# Then reset to OK state
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-API-ErrorRate-production" \
  --state-value OK \
  --state-reason "Test complete"
```

### 7. Verify X-Ray Service Map
- [ ] Navigate to AWS X-Ray console
- [ ] Click "Service map"
- [ ] Verify services appear after some traffic
- [ ] Check trace details for sample requests

### 8. Review CloudWatch Dashboards
- [ ] Open API Dashboard
- [ ] Open Database Dashboard
- [ ] Open Redis Dashboard
- [ ] Open Blockchain Dashboard
- [ ] Verify all widgets display data

## Post-Deployment Verification

### CloudWatch Logs Insights Queries
- [ ] Navigate to CloudWatch Logs Insights
- [ ] Verify all 10 queries appear in saved queries dropdown
- [ ] Run "API Error Patterns" query
- [ ] Run "Lambda Errors by Function" query
- [ ] Verify queries return results (or no data if no errors)

### SNS Topics
- [ ] Verify critical alarm topic exists
- [ ] Verify warning alarm topic exists
- [ ] Verify general alarm topic exists
- [ ] Check subscription count for each topic
- [ ] Verify all subscriptions are confirmed

### CloudWatch Alarms
- [ ] List all alarms: `aws cloudwatch describe-alarms --alarm-name-prefix "TriviaNFT"`
- [ ] Verify all alarms are in OK or INSUFFICIENT_DATA state
- [ ] Check alarm actions point to correct SNS topics
- [ ] Review alarm thresholds

### AWS X-Ray
- [ ] Verify sampling rule exists
- [ ] Check sampling rate (5% prod, 10% staging)
- [ ] Generate some traffic to create traces
- [ ] View traces in X-Ray console
- [ ] Verify service map shows all services

## Integration Tasks

### PagerDuty Integration (Optional)
- [ ] Create PagerDuty service with email integration
- [ ] Get PagerDuty integration email address
- [ ] Subscribe PagerDuty email to critical alarms topic
- [ ] Test PagerDuty incident creation
- [ ] Configure escalation policies

### Slack Integration (Optional)
- [ ] Create AWS Chatbot configuration
- [ ] Connect to Slack workspace
- [ ] Create #trivia-nft-critical-alerts channel
- [ ] Create #trivia-nft-warnings channel
- [ ] Configure Chatbot to subscribe to SNS topics
- [ ] Test Slack notifications

### Monitoring Dashboard (Optional)
- [ ] Set up Grafana or similar dashboard tool
- [ ] Connect to CloudWatch data source
- [ ] Import dashboard templates
- [ ] Customize for TriviaNFT metrics
- [ ] Share dashboard with team

## Troubleshooting

### No Logs Appearing in Queries
- Check Lambda execution role has CloudWatch Logs permissions
- Verify log groups exist with correct names
- Ensure Lambda functions are being invoked
- Review Lambda timeout settings

### Email Subscriptions Not Confirmed
- Check spam/junk folders
- Verify email addresses are correct
- Resend confirmation email from AWS Console
- Try different email addresses

### Alarms Not Triggering
- Verify SNS topic subscriptions are confirmed
- Check alarm threshold and evaluation period
- Review metric data in CloudWatch
- Ensure alarm is not in INSUFFICIENT_DATA state

### X-Ray Traces Not Appearing
- Verify Lambda tracing is set to ACTIVE
- Check IAM permissions for X-Ray
- Review sampling rule configuration
- Generate more traffic (sampling may be low)

## Rollback Plan

If issues occur after deployment:

### Rollback ObservabilityStack
```bash
# Revert to previous stack version
cdk deploy TriviaNFT-Observability-production --rollback

# Or delete and recreate
cdk destroy TriviaNFT-Observability-production
# Fix issues
cdk deploy TriviaNFT-Observability-production
```

### Disable Alarms Temporarily
```bash
# Disable all alarms
aws cloudwatch disable-alarm-actions \
  --alarm-names $(aws cloudwatch describe-alarms \
    --alarm-name-prefix "TriviaNFT" \
    --query 'MetricAlarms[*].AlarmName' \
    --output text)
```

### Unsubscribe from SNS Topics
```bash
# List subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production

# Unsubscribe
aws sns unsubscribe \
  --subscription-arn <subscription-arn>
```

## Success Criteria

- [x] All CloudWatch Logs Insights queries created and accessible
- [ ] SNS topics created with appropriate names
- [ ] Email subscriptions confirmed and receiving test notifications
- [ ] X-Ray sampling rule configured and active
- [ ] Lambda functions have X-Ray tracing enabled
- [ ] All alarms configured with correct thresholds
- [ ] Alarm actions point to appropriate SNS topics
- [ ] CloudWatch dashboards display metrics
- [ ] Service map shows request flow
- [ ] Documentation complete and accessible

## Next Steps

1. **Monitor for 24 Hours** - Watch for any false alarms or missed alerts
2. **Tune Thresholds** - Adjust alarm thresholds based on baseline metrics
3. **Add Custom Metrics** - Emit business-specific metrics from Lambda functions
4. **Create Runbooks** - Document response procedures for each alarm type
5. **Train Team** - Ensure team knows how to use queries and dashboards
6. **Schedule Reviews** - Weekly review of dashboards and alerts
7. **Integrate with Tools** - Set up PagerDuty, Slack, or other integrations

## Resources

- [Monitoring and Alerting Guide](./MONITORING_ALERTING_GUIDE.md)
- [Monitoring Quick Reference](./MONITORING_QUICK_REFERENCE.md)
- [Implementation Summary](./TASK_30_IMPLEMENTATION_SUMMARY.md)
- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)

## Sign-Off

- [ ] Code reviewed and approved
- [ ] Documentation reviewed and approved
- [ ] Deployment tested in staging
- [ ] Team trained on new monitoring features
- [ ] Ready for production deployment

**Deployed By:** _________________  
**Date:** _________________  
**Verified By:** _________________  
**Date:** _________________
