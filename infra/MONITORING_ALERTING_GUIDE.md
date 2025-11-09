# Monitoring and Alerting Guide

This guide covers the monitoring and alerting infrastructure for TriviaNFT, including CloudWatch Logs Insights queries, SNS topics, and AWS X-Ray tracing.

## Overview

The ObservabilityStack provides comprehensive monitoring and alerting capabilities:

1. **CloudWatch Logs Insights Queries** - Pre-configured queries for common troubleshooting scenarios
2. **SNS Topics** - Separate topics for critical and warning alerts
3. **AWS X-Ray Tracing** - Distributed tracing for request flow analysis
4. **CloudWatch Dashboards** - Real-time metrics visualization
5. **CloudWatch Alarms** - Automated alerting for critical issues

## CloudWatch Logs Insights Queries

### Available Queries

The following pre-configured queries are available in CloudWatch Logs Insights:

#### 1. API Error Patterns
**Query Name:** `TriviaNFT-API-ErrorPatterns-{environment}`

Identifies and counts API errors by status code and error type.

```
fields @timestamp, @message, statusCode, error, requestId
| filter statusCode >= 400
| stats count() by statusCode, error
| sort count desc
| limit 20
```

**Use Case:** Quickly identify the most common API errors and their frequency.

#### 2. Slow Database Queries
**Query Name:** `TriviaNFT-SlowDatabaseQueries-{environment}`

Finds database queries taking longer than 1 second.

```
fields @timestamp, @message, query, duration, requestId
| filter @message like /database/ or @message like /query/
| filter duration > 1000
| sort duration desc
| limit 50
```

**Use Case:** Identify performance bottlenecks in database operations.

#### 3. Blockchain Transaction Failures
**Query Name:** `TriviaNFT-BlockchainTransactionFailures-{environment}`

Tracks failed blockchain transactions for minting and forging.

```
fields @timestamp, @message, txHash, error, operation
| filter @message like /blockchain/ or @message like /transaction/
| filter error != "" or @message like /failed/ or @message like /error/
| sort @timestamp desc
| limit 100
```

**Use Case:** Debug NFT minting and forging issues.

#### 4. Lambda Errors by Function
**Query Name:** `TriviaNFT-LambdaErrorsByFunction-{environment}`

Groups Lambda errors by function name and error type.

```
fields @timestamp, @message, @logStream, error, errorType
| filter @message like /ERROR/ or level = "error"
| parse @logStream /^.*\/(?<functionName>[^\/]+)\/.*$/
| stats count() by functionName, errorType
| sort count desc
```

**Use Case:** Identify which Lambda functions are experiencing the most errors.

#### 5. Session Flow Errors
**Query Name:** `TriviaNFT-SessionFlowErrors-{environment}`

Tracks errors in the trivia session flow.

```
fields @timestamp, @message, sessionId, playerId, error
| filter @message like /session/
| filter error != "" or @message like /failed/ or @message like /error/
| sort @timestamp desc
| limit 100
```

**Use Case:** Debug session creation, answer submission, and completion issues.

#### 6. Mint and Forge Operations
**Query Name:** `TriviaNFT-MintForgeOperations-{environment}`

Tracks all mint and forge operations with their status.

```
fields @timestamp, @message, operation, status, txHash, playerId
| filter @message like /mint/ or @message like /forge/
| sort @timestamp desc
| limit 100
```

**Use Case:** Monitor NFT minting and forging activity.

#### 7. High Latency Requests
**Query Name:** `TriviaNFT-HighLatencyRequests-{environment}`

Finds requests taking longer than 500ms.

```
fields @timestamp, @message, endpoint, duration, requestId
| filter duration > 500
| sort duration desc
| limit 50
```

**Use Case:** Identify slow API endpoints and optimize performance.

#### 8. Authentication Failures
**Query Name:** `TriviaNFT-AuthenticationFailures-{environment}`

Tracks failed authentication attempts.

```
fields @timestamp, @message, stakeKey, error, endpoint
| filter @message like /auth/ or @message like /jwt/ or @message like /unauthorized/
| filter error != "" or statusCode = 401 or statusCode = 403
| sort @timestamp desc
| limit 100
```

**Use Case:** Monitor security issues and authentication problems.

#### 9. Redis Connection Issues
**Query Name:** `TriviaNFT-RedisConnectionIssues-{environment}`

Identifies Redis connection and timeout issues.

```
fields @timestamp, @message, error, operation
| filter @message like /redis/ or @message like /cache/
| filter @message like /connection/ or @message like /timeout/ or @message like /error/
| sort @timestamp desc
| limit 100
```

**Use Case:** Debug session state and caching issues.

#### 10. Step Functions Workflow Failures
**Query Name:** `TriviaNFT-StepFunctionsFailures-{environment}`

Tracks Step Functions workflow failures.

```
fields @timestamp, @message, executionArn, error, cause
| filter @message like /step function/ or @message like /workflow/
| filter error != "" or @message like /failed/
| sort @timestamp desc
| limit 100
```

**Use Case:** Debug mint and forge workflow failures.

### How to Use Queries

1. Navigate to CloudWatch Logs Insights in the AWS Console
2. Select the saved query from the dropdown
3. Adjust the time range as needed
4. Click "Run query" to execute
5. Export results or create visualizations as needed

## SNS Topics

### Topic Structure

Three SNS topics are created for different alert severities:

#### 1. Critical Alarms Topic
**Topic Name:** `trivia-nft-critical-alarms-{environment}`

**Receives:**
- API error rate > 5%
- Lambda function errors > 10
- Database connection failures
- Blockchain transaction failures > 10%
- Step Function execution failures > 3

**Recommended Subscribers:**
- On-call engineers
- PagerDuty integration
- Slack critical alerts channel

#### 2. Warning Alarms Topic
**Topic Name:** `trivia-nft-warning-alarms-{environment}`

**Receives:**
- Database CPU > 80%
- Redis memory > 80%
- Redis evictions > 100

**Recommended Subscribers:**
- Engineering team
- Slack monitoring channel
- Email distribution list

#### 3. General Alarms Topic
**Topic Name:** `trivia-nft-alarms-{environment}`

**Receives:**
- All alarms (backup topic)

**Recommended Subscribers:**
- Monitoring dashboard
- Log aggregation service

### Subscribing Email Addresses

To subscribe email addresses to alarm topics, use the `subscribeEmailsToAlarms` method:

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

**Note:** Email subscribers will receive a confirmation email and must click the confirmation link to activate the subscription.

### Integrating with PagerDuty

To integrate with PagerDuty:

1. Create a PagerDuty service with email integration
2. Get the integration email address
3. Subscribe the PagerDuty email to the critical alarms topic
4. Configure escalation policies in PagerDuty

### Integrating with Slack

To integrate with Slack:

1. Create an AWS Chatbot configuration
2. Connect to your Slack workspace
3. Configure the Chatbot to subscribe to SNS topics
4. Set up Slack channels for critical and warning alerts

## AWS X-Ray Tracing

### Overview

AWS X-Ray provides distributed tracing across the entire request flow:

- API Gateway → Lambda → Aurora/Redis → Blockfrost → Cardano

### Sampling Rules

A custom sampling rule is configured for TriviaNFT:

- **Production:** 5% of requests traced
- **Staging:** 10% of requests traced
- **Priority:** 1000
- **Reservoir:** 1 request per second always traced

### Enabling X-Ray on Lambda Functions

X-Ray tracing is enabled on Lambda functions by setting the `tracing` property:

```typescript
const myFunction = new lambda.Function(this, 'MyFunction', {
  // ... other props
  tracing: lambda.Tracing.ACTIVE,
});
```

The ObservabilityStack automatically adds the required IAM permissions for X-Ray.

### Viewing Traces

1. Navigate to AWS X-Ray in the AWS Console
2. Click "Service map" to see the request flow visualization
3. Click "Traces" to see individual request traces
4. Filter by:
   - Response time
   - HTTP status code
   - Error status
   - Annotations

### Service Map

The X-Ray service map shows:

- **Nodes:** Services (API Gateway, Lambda, Aurora, Redis, External APIs)
- **Edges:** Request flow between services
- **Colors:** Health status (green = healthy, yellow = warnings, red = errors)
- **Metrics:** Latency, request count, error rate

### Trace Analysis

Use X-Ray trace analysis to:

1. **Identify Bottlenecks:** Find slow services in the request path
2. **Debug Errors:** See the exact point where errors occur
3. **Optimize Performance:** Identify unnecessary service calls
4. **Monitor Dependencies:** Track external API performance (Blockfrost)

### Custom Annotations

Lambda functions can add custom annotations to traces:

```typescript
import AWSXRay from 'aws-xray-sdk-core';

// Add annotation
AWSXRay.getSegment()?.addAnnotation('playerId', playerId);
AWSXRay.getSegment()?.addAnnotation('sessionId', sessionId);

// Add metadata
AWSXRay.getSegment()?.addMetadata('category', categoryId);
AWSXRay.getSegment()?.addMetadata('score', score);
```

**Annotations** are indexed and searchable in the X-Ray console.
**Metadata** is not indexed but provides additional context.

## CloudWatch Dashboards

### Available Dashboards

1. **API Dashboard** - API Gateway and Lambda metrics
2. **Database Dashboard** - Aurora Serverless v2 metrics
3. **Redis Dashboard** - ElastiCache Redis metrics
4. **Blockchain Dashboard** - NFT minting and forging metrics

### Dashboard URLs

Dashboard URLs are available as CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Observability-production \
  --query 'Stacks[0].Outputs'
```

### Custom Metrics

Lambda functions can emit custom metrics:

```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

await cloudwatch.putMetricData({
  Namespace: 'TriviaNFT',
  MetricData: [
    {
      MetricName: 'MintSuccessRate',
      Value: successRate,
      Unit: 'Percent',
      Dimensions: [
        {
          Name: 'Environment',
          Value: process.env.ENVIRONMENT,
        },
      ],
    },
  ],
}).promise();
```

## Alarm Configuration

### Alarm Thresholds

| Alarm | Threshold | Evaluation Period | Action |
|-------|-----------|-------------------|--------|
| API Error Rate | > 5% | 2 x 5 minutes | Critical |
| Lambda Errors | > 10 | 1 x 1 minute | Critical |
| Database Connection Failures | > 5 | 1 x 5 minutes | Critical |
| Database CPU | > 80% | 2 x 5 minutes | Warning |
| Redis Memory | > 80% | 2 x 5 minutes | Warning |
| Redis Evictions | > 100 | 1 x 5 minutes | Warning |
| Blockchain Failure Rate | > 10% | 1 x 15 minutes | Critical |
| Step Function Failures | > 3 | 1 x 5 minutes | Critical |

### Alarm Actions

When an alarm triggers:

1. **SNS Notification** sent to appropriate topic
2. **Email** sent to subscribers
3. **PagerDuty** incident created (if configured)
4. **Slack** message posted (if configured)

### Alarm States

- **OK:** Metric is within threshold
- **ALARM:** Metric has breached threshold
- **INSUFFICIENT_DATA:** Not enough data to evaluate

### Testing Alarms

To test alarm notifications:

```bash
# Set alarm to ALARM state manually
aws cloudwatch set-alarm-state \
  --alarm-name "TriviaNFT-API-ErrorRate-production" \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

## Best Practices

### Logging

1. **Use Structured Logging:** Log in JSON format for easy parsing
2. **Include Context:** Add requestId, playerId, sessionId to all logs
3. **Sanitize Sensitive Data:** Never log wallet private keys or secrets
4. **Use Log Levels:** ERROR, WARN, INFO, DEBUG
5. **Add Correlation IDs:** Track requests across services

### Monitoring

1. **Set Realistic Thresholds:** Based on baseline metrics
2. **Avoid Alert Fatigue:** Don't alert on every minor issue
3. **Use Composite Alarms:** Combine multiple conditions
4. **Monitor Business Metrics:** Session completion rate, mint success rate
5. **Review Dashboards Regularly:** Weekly review of trends

### Alerting

1. **Prioritize Alerts:** Critical vs. warning
2. **Provide Context:** Include runbook links in alarm descriptions
3. **Test Regularly:** Ensure notifications are received
4. **Document Escalation:** Clear escalation paths
5. **Post-Incident Reviews:** Learn from incidents

### X-Ray Tracing

1. **Sample Appropriately:** Balance cost vs. visibility
2. **Add Custom Annotations:** For business-specific tracking
3. **Monitor External Dependencies:** Track Blockfrost performance
4. **Use Trace Groups:** Organize traces by feature
5. **Set Up Alerts:** Alert on high latency or error rates

## Troubleshooting

### No Logs Appearing

1. Check Lambda execution role has CloudWatch Logs permissions
2. Verify log group exists and has correct name
3. Check Lambda function is actually being invoked
4. Review Lambda timeout settings

### Alarms Not Triggering

1. Verify SNS topic subscriptions are confirmed
2. Check alarm threshold and evaluation period
3. Review metric data in CloudWatch
4. Ensure alarm is in ALARM state (not INSUFFICIENT_DATA)

### X-Ray Traces Missing

1. Verify Lambda tracing is set to ACTIVE
2. Check IAM permissions for X-Ray
3. Review sampling rule configuration
4. Ensure X-Ray SDK is imported in Lambda code

### High CloudWatch Costs

1. Reduce log retention period
2. Adjust X-Ray sampling rate
3. Use metric filters instead of custom metrics
4. Archive old logs to S3

## Additional Resources

- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)
- [CloudWatch Alarms Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html)
- [SNS Message Filtering](https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html)

## Support

For issues with monitoring and alerting:

1. Check this guide first
2. Review CloudWatch Logs Insights queries
3. Check X-Ray service map for issues
4. Contact DevOps team: devops@trivianft.com
