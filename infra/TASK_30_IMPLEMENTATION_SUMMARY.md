# Task 30: Configure Monitoring and Alerting - Implementation Summary

## Overview

Successfully implemented comprehensive monitoring and alerting infrastructure for TriviaNFT, including CloudWatch Logs Insights queries, SNS topics for alerts, and AWS X-Ray tracing configuration.

## Completed Subtasks

### 30.1 Set up CloudWatch Logs Insights Queries ✅

Created 10 pre-configured CloudWatch Logs Insights queries for common troubleshooting scenarios:

1. **API Error Patterns** - Identifies and counts API errors by status code and error type
2. **Slow Database Queries** - Finds database queries taking longer than 1 second
3. **Blockchain Transaction Failures** - Tracks failed blockchain transactions
4. **Lambda Errors by Function** - Groups Lambda errors by function name and error type
5. **Session Flow Errors** - Tracks errors in the trivia session flow
6. **Mint and Forge Operations** - Tracks all mint and forge operations with status
7. **High Latency Requests** - Finds requests taking longer than 500ms
8. **Authentication Failures** - Tracks failed authentication attempts
9. **Redis Connection Issues** - Identifies Redis connection and timeout issues
10. **Step Functions Workflow Failures** - Tracks Step Functions workflow failures

**Implementation Details:**
- Queries are created using `logs.CfnQueryDefinition`
- Each query is saved with a descriptive name: `TriviaNFT-{QueryName}-{environment}`
- Queries target appropriate log groups (API Gateway, Lambda)
- All queries are automatically created when the ObservabilityStack is deployed

### 30.2 Configure SNS Topics for Alerts ✅

Created three SNS topics with different severity levels:

1. **Critical Alarms Topic** (`trivia-nft-critical-alarms-{environment}`)
   - Receives: API error rate > 5%, Lambda errors > 10, database connection failures, blockchain failures > 10%, Step Function failures > 3
   - Recommended for: On-call engineers, PagerDuty, critical Slack channels

2. **Warning Alarms Topic** (`trivia-nft-warning-alarms-{environment}`)
   - Receives: Database CPU > 80%, Redis memory > 80%, Redis evictions > 100
   - Recommended for: Engineering team, monitoring Slack channels

3. **General Alarms Topic** (`trivia-nft-alarms-{environment}`)
   - Receives: All alarms (backup topic)
   - Recommended for: Monitoring dashboards, log aggregation

**Implementation Details:**
- Added `subscribeEmailsToAlarms()` method to easily subscribe email addresses
- Updated all alarm actions to use appropriate topic (critical vs warning)
- SNS topic ARNs are exported as CloudFormation outputs
- Email subscriptions require confirmation via email link

**Usage Example:**
```typescript
observabilityStack.subscribeEmailsToAlarms({
  critical: ['oncall@trivianft.com', 'engineering-lead@trivianft.com'],
  warning: ['engineering@trivianft.com', 'devops@trivianft.com'],
});
```

### 30.3 Enable AWS X-Ray Tracing ✅

Configured AWS X-Ray for distributed tracing across the entire request flow:

**Sampling Rule:**
- Production: 5% of requests traced
- Staging: 10% of requests traced
- Priority: 1000
- Reservoir: 1 request per second always traced

**Implementation Details:**
- Created `xraySamplingRule` using `xray.CfnSamplingRule`
- Added `enableXRayTracing()` method to add X-Ray permissions to Lambda functions
- X-Ray tracing should be enabled on Lambda functions by setting `tracing: lambda.Tracing.ACTIVE`
- Service map URL exported as CloudFormation output

**Tracing Coverage:**
- API Gateway → Lambda → Aurora/Redis → Blockfrost → Cardano
- Custom annotations can be added for business-specific tracking
- Trace analysis available in AWS X-Ray console

## Files Modified

### Infrastructure Code
- `infra/lib/stacks/observability-stack.ts` - Enhanced with:
  - CloudWatch Logs Insights query definitions
  - Separate SNS topics for critical and warning alerts
  - X-Ray sampling rule configuration
  - Email subscription helper method
  - X-Ray tracing enablement method

### Documentation
- `infra/MONITORING_ALERTING_GUIDE.md` - Comprehensive guide covering:
  - All 10 CloudWatch Logs Insights queries with usage examples
  - SNS topic structure and subscription instructions
  - AWS X-Ray tracing setup and usage
  - CloudWatch dashboards overview
  - Alarm configuration and thresholds
  - Best practices for logging, monitoring, and alerting
  - Troubleshooting common issues

- `infra/MONITORING_QUICK_REFERENCE.md` - Quick reference guide with:
  - Quick links to dashboards and consoles
  - Common query examples
  - SNS subscription commands
  - Alarm management commands
  - X-Ray trace viewing commands
  - Custom metrics emission examples
  - Emergency contact information

## Key Features

### CloudWatch Logs Insights Queries
- Pre-configured queries save time during incident response
- Queries cover all critical system components
- Easy to run from AWS Console or CLI
- Can be customized for specific troubleshooting needs

### SNS Topics
- Separate topics allow different notification strategies
- Critical alerts go to on-call engineers
- Warning alerts go to broader engineering team
- Easy integration with PagerDuty, Slack, email

### AWS X-Ray Tracing
- End-to-end request tracing across all services
- Service map visualization shows system architecture
- Identify performance bottlenecks and errors
- Track external API dependencies (Blockfrost)

## Alarm Configuration

All alarms are configured with appropriate thresholds and actions:

| Alarm | Threshold | Period | Topic |
|-------|-----------|--------|-------|
| API Error Rate | > 5% | 2 x 5 min | Critical |
| Lambda Errors | > 10 | 1 x 1 min | Critical |
| DB Connection Failures | > 5 | 1 x 5 min | Critical |
| DB CPU | > 80% | 2 x 5 min | Warning |
| Redis Memory | > 80% | 2 x 5 min | Warning |
| Redis Evictions | > 100 | 1 x 5 min | Warning |
| Blockchain Failures | > 10% | 1 x 15 min | Critical |
| Step Function Failures | > 3 | 1 x 5 min | Critical |

## Usage Instructions

### Viewing Logs Insights Queries
1. Navigate to CloudWatch Logs Insights in AWS Console
2. Select saved query from dropdown
3. Adjust time range as needed
4. Click "Run query"

### Subscribing to Alerts
```typescript
// In your CDK app
observabilityStack.subscribeEmailsToAlarms({
  critical: ['oncall@example.com'],
  warning: ['team@example.com'],
});
```

### Enabling X-Ray on Lambda
```typescript
const myFunction = new lambda.Function(this, 'MyFunction', {
  // ... other props
  tracing: lambda.Tracing.ACTIVE,
});

// Add X-Ray permissions
observabilityStack.enableXRayTracing([myFunction]);
```

### Adding Custom Annotations
```typescript
import AWSXRay from 'aws-xray-sdk-core';

// In Lambda function
AWSXRay.getSegment()?.addAnnotation('playerId', playerId);
AWSXRay.getSegment()?.addAnnotation('sessionId', sessionId);
```

## Testing

### Test Alarm Notifications
```bash
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-API-ErrorRate-production" \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

### View X-Ray Traces
```bash
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

### Run Logs Insights Query
```bash
aws logs start-query \
  --log-group-name /aws/lambda/trivia-nft-production \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string "fields @timestamp, @message | filter @message like /ERROR/"
```

## Benefits

1. **Faster Incident Response** - Pre-configured queries save time during outages
2. **Better Visibility** - X-Ray tracing shows complete request flow
3. **Appropriate Alerting** - Separate topics prevent alert fatigue
4. **Comprehensive Monitoring** - Covers all system components
5. **Easy Troubleshooting** - Queries target common issues
6. **Performance Optimization** - Identify slow queries and requests
7. **Security Monitoring** - Track authentication failures and suspicious activity

## Next Steps

1. **Subscribe Email Addresses** - Add team members to SNS topics
2. **Integrate with PagerDuty** - Set up PagerDuty integration for critical alerts
3. **Configure Slack Notifications** - Use AWS Chatbot for Slack integration
4. **Review Dashboards** - Regularly review CloudWatch dashboards
5. **Tune Alarm Thresholds** - Adjust based on baseline metrics
6. **Add Custom Metrics** - Emit business-specific metrics from Lambda functions
7. **Create Runbooks** - Document response procedures for each alarm

## Requirements Satisfied

- ✅ **Requirement 46 (Observability - Logging)**: Comprehensive logging with structured JSON format, 30-day retention
- ✅ **Requirement 47 (Observability - Metrics)**: Real-time metrics with CloudWatch dashboards and X-Ray tracing
- ✅ **Requirement 48 (Observability - Alarms)**: Automated alerting for critical issues with SNS notifications

## Related Documentation

- [Monitoring and Alerting Guide](./MONITORING_ALERTING_GUIDE.md) - Comprehensive guide
- [Monitoring Quick Reference](./MONITORING_QUICK_REFERENCE.md) - Quick reference commands
- [Observability Implementation](./OBSERVABILITY_IMPLEMENTATION.md) - Original implementation details

## Support

For questions or issues with monitoring and alerting:
- Review the comprehensive guide: `MONITORING_ALERTING_GUIDE.md`
- Check the quick reference: `MONITORING_QUICK_REFERENCE.md`
- Contact DevOps team: devops@trivianft.com
