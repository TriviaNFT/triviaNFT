# Monitoring and Alerting Quick Reference

## Quick Links

### CloudWatch Dashboards
```bash
# Get dashboard URLs
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Observability-production \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiDashboardUrl`].OutputValue' \
  --output text
```

### X-Ray Service Map
```
https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map
```

### CloudWatch Logs Insights
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:logs-insights
```

## Common Queries

### Find API Errors (Last Hour)
```
fields @timestamp, @message, statusCode, error
| filter statusCode >= 400
| sort @timestamp desc
| limit 100
```

### Find Slow Requests (> 1s)
```
fields @timestamp, endpoint, duration
| filter duration > 1000
| sort duration desc
| limit 50
```

### Track Mint Operations
```
fields @timestamp, operation, status, txHash
| filter @message like /mint/
| sort @timestamp desc
```

## SNS Topics

### Subscribe Email to Critical Alerts
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### List Subscriptions
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-critical-alarms-production
```

## Alarms

### List All Alarms
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

### Check Alarm State
```bash
aws cloudwatch describe-alarms \
  --alarm-names "TriviaNFT-API-ErrorRate-production"
```

### Test Alarm
```bash
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-API-ErrorRate-production" \
  --state-value ALARM \
  --state-reason "Testing"
```

## X-Ray

### View Recent Traces
```bash
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

### Get Trace Details
```bash
aws xray batch-get-traces \
  --trace-ids "1-5f8a1234-abcd1234efgh5678ijkl9012"
```

## Custom Metrics

### Emit Custom Metric (from Lambda)
```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

await cloudwatch.putMetricData({
  Namespace: 'TriviaNFT',
  MetricData: [{
    MetricName: 'MintSuccessRate',
    Value: 95.5,
    Unit: 'Percent',
    Dimensions: [{
      Name: 'Environment',
      Value: 'production',
    }],
  }],
}).promise();
```

### Query Custom Metric
```bash
aws cloudwatch get-metric-statistics \
  --namespace TriviaNFT \
  --metric-name MintSuccessRate \
  --dimensions Name=Environment,Value=production \
  --start-time $(date -u -d '1 hour ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Average
```

## Alarm Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| API Error Rate | > 5% | Critical |
| Lambda Errors | > 10/min | Critical |
| DB Connections | > 5 failures | Critical |
| DB CPU | > 80% | Warning |
| Redis Memory | > 80% | Warning |
| Blockchain Failures | > 10% | Critical |
| Step Function Failures | > 3 | Critical |

## Troubleshooting Commands

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/trivia-nft-production --follow
```

### Check API Gateway Logs
```bash
aws logs tail /aws/apigateway/trivia-nft-production --follow
```

### Get Recent Errors
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/trivia-nft-production \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

## Emergency Contacts

- **Critical Issues:** oncall@trivianft.com
- **DevOps Team:** devops@trivianft.com
- **Engineering Lead:** engineering-lead@trivianft.com

## Runbooks

- [API Error Rate High](./runbooks/api-error-rate.md)
- [Database Connection Failures](./runbooks/database-connection.md)
- [Blockchain Transaction Failures](./runbooks/blockchain-failures.md)
- [Lambda Function Errors](./runbooks/lambda-errors.md)
