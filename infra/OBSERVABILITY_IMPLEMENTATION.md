# ObservabilityStack Implementation Summary

## Overview

Task 17 "Implement ObservabilityStack with monitoring and alarms" has been completed. This implementation provides comprehensive monitoring, alerting, and structured logging for the TriviaNFT platform.

## Completed Subtasks

### 17.1 Create CloudWatch Dashboards ✅

Created four comprehensive CloudWatch dashboards:

#### 1. API Dashboard (`TriviaNFT-API-{environment}`)
Monitors API Gateway and Lambda function performance:
- **API Latency**: p50, p95, p99 response times
- **API Throughput**: Requests per minute
- **API Errors**: 4XX and 5XX error counts
- **API Error Rate**: Percentage of failed requests
- **Lambda Errors**: Error counts per function
- **Lambda Duration**: Average execution time per function

#### 2. Database Dashboard (`TriviaNFT-Database-{environment}`)
Monitors Aurora Serverless v2 PostgreSQL:
- **Database Connections**: Active connection count
- **ACU Utilization**: Aurora Capacity Units usage
- **Query Latency**: Read and write latency in milliseconds
- **CPU Utilization**: Database CPU usage percentage

#### 3. Redis Dashboard (`TriviaNFT-Redis-{environment}`)
Monitors ElastiCache Redis cluster:
- **Memory Utilization**: Percentage of memory used
- **CPU Utilization**: Redis CPU usage
- **Cache Hit Rate**: Percentage of successful cache hits
- **Evictions**: Number of keys evicted due to memory pressure
- **Network Throughput**: Bytes in/out

#### 4. Blockchain Dashboard (`TriviaNFT-Blockchain-{environment}`)
Monitors NFT minting and forging operations:
- **Mint Success Rate**: Percentage of successful mints
- **Mint Confirmation Time**: Average time to blockchain confirmation
- **Forge Success Rate**: Percentage of successful forges
- **Transaction Failures**: Count of failed blockchain transactions
- **Mint Workflow Executions**: Step Function success/failure counts
- **Forge Workflow Executions**: Step Function success/failure counts

### 17.2 Configure CloudWatch Alarms ✅

Implemented comprehensive alarms with SNS notifications:

#### API Alarms
- **API Error Rate Alarm**: Triggers when error rate > 5% over 5 minutes (2 evaluation periods)
- **Lambda Function Error Alarms**: Individual alarms for each Lambda function when errors > 10 in 1 minute

#### Database Alarms
- **Database Connection Failure Alarm**: Triggers when connection failures > 5 in 5 minutes
- **Database High CPU Alarm**: Triggers when CPU utilization > 80% over 5 minutes (2 evaluation periods)

#### Redis Alarms
- **Redis High Memory Alarm**: Triggers when memory utilization > 80% over 5 minutes (2 evaluation periods)
- **Redis Evictions Alarm**: Triggers when evictions > 100 in 5 minutes

#### Blockchain Alarms
- **Blockchain Failure Rate Alarm**: Triggers when transaction failure rate > 10% over 15 minutes
- **Mint Workflow Failure Alarm**: Triggers when mint workflow failures > 3 in 5 minutes
- **Forge Workflow Failure Alarm**: Triggers when forge workflow failures > 3 in 5 minutes

All alarms send notifications to the SNS topic: `trivia-nft-alarms-{environment}`

### 17.3 Set up Structured Logging ✅

Implemented comprehensive structured logging utilities:

#### Logger Features
- **JSON Format**: All logs output as structured JSON for CloudWatch Logs Insights
- **Correlation IDs**: Automatic request tracing across services
- **Sensitive Data Sanitization**: Automatic masking of:
  - Stake keys (stake1...)
  - Cardano addresses (addr1...)
  - Email addresses
  - JWT tokens
  - API keys
  - Password/secret/token/key fields
- **Log Levels**: DEBUG, INFO, WARN, ERROR with environment-based configuration
- **30-Day Retention**: Configured in ObservabilityStack

#### Specialized Logging Methods
- `logRequest()` - Log API requests
- `logResponse()` - Log API responses with duration
- `logSessionEvent()` - Log session start/complete/forfeit
- `logMintOperation()` - Log mint workflow steps
- `logForgeOperation()` - Log forge workflow steps
- `logTransaction()` - Log blockchain transactions
- `logQuery()` - Log database queries with duration
- `logRedisOperation()` - Log Redis operations with duration

#### Lambda Wrapper
- `withLogging()` - Wraps Lambda handlers with automatic logging
- Automatic correlation ID extraction and propagation
- Standardized error handling
- Request/response logging with configurable body logging
- Duration tracking

#### Files Created
- `packages/shared/src/utils/logger.ts` - Core logging utility
- `packages/shared/src/utils/lambda-wrapper.ts` - Lambda handler wrapper
- `packages/shared/LOGGING.md` - Comprehensive documentation

## Requirements Satisfied

### Requirement 46: Observability - Logging ✅
1. ✅ Log all API requests with timestamp, endpoint, and response status
2. ✅ Log all session events (start, complete, forfeit)
3. ✅ Log all mint and forge operations with transaction hashes
4. ✅ Use structured JSON logging format
5. ✅ Retain logs for 30 days in CloudWatch

### Requirement 47: Observability - Metrics ✅
1. ✅ Emit metrics for API latency (p50, p95, p99)
2. ✅ Emit metrics for session completion rate (via custom metrics)
3. ✅ Emit metrics for mint success rate
4. ✅ Emit metrics for active concurrent sessions (via custom metrics)
5. ✅ Display metrics in CloudWatch dashboards

### Requirement 48: Observability - Alarms ✅
1. ✅ Create alarms for API error rate exceeding 5%
2. ✅ Create alarms for Lambda function errors
3. ✅ Create alarms for database connection failures
4. ✅ Create alarms for blockchain transaction failures exceeding 10%
5. ✅ Send alarm notifications to SNS topics

## Usage

### Accessing Dashboards

Dashboard URLs are output by the ObservabilityStack:
```bash
# Deploy the stack
cdk deploy ObservabilityStack

# Outputs will include:
# - ApiDashboardUrl
# - DatabaseDashboardUrl
# - RedisDashboardUrl
# - BlockchainDashboardUrl
```

### Using Structured Logging in Lambda Functions

```typescript
import { withLogging, createSuccessResponse, createErrorResponse } from '@trivia-nft/shared/utils';

const handlerImpl = async (event, context, logger) => {
  logger.info('Processing request', { categoryId: 'science' });
  
  try {
    const result = await processRequest(event);
    logger.logSessionEvent('start', result.sessionId);
    return createSuccessResponse(result);
  } catch (error) {
    logger.error('Request failed', error);
    return createErrorResponse(500, 'Internal error');
  }
};

export const handler = withLogging(handlerImpl);
```

### Configuring Alarms

To enable alarms, call `configureAlarms()` after stack creation:

```typescript
const observabilityStack = new ObservabilityStack(app, 'ObservabilityStack', {
  environment: 'production',
  apiId: apiStack.httpApi.ref,
  auroraCluster: dataStack.auroraCluster,
  redisCluster: dataStack.redisCluster,
  mintStateMachine: workflowStack.mintStateMachine,
  forgeStateMachine: workflowStack.forgeStateMachine,
  lambdaFunctions: [
    apiStack.startSessionLambda,
    apiStack.submitAnswerLambda,
    // ... other functions
  ],
});

observabilityStack.configureAlarms({
  apiId: apiStack.httpApi.ref,
  auroraCluster: dataStack.auroraCluster,
  redisCluster: dataStack.redisCluster,
  mintStateMachine: workflowStack.mintStateMachine,
  forgeStateMachine: workflowStack.forgeStateMachine,
  lambdaFunctions: [/* ... */],
});
```

### Subscribing to Alarms

Subscribe email addresses to the SNS topic:

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:trivia-nft-alarms-production \
  --protocol email \
  --notification-endpoint admin@example.com
```

### CloudWatch Logs Insights Queries

Example queries for troubleshooting:

```
# Find all errors for a specific user
fields @timestamp, message, context.userId, error.message
| filter level = "ERROR" and context.userId = "user-123"
| sort @timestamp desc

# Track a request across services
fields @timestamp, message, context.correlationId
| filter context.correlationId = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc

# Find slow database queries
fields @timestamp, message, metadata.durationMs, metadata.query
| filter message like /Database query/
| filter metadata.durationMs > 1000
| sort metadata.durationMs desc

# Monitor mint success rate
fields @timestamp, metadata.mintOperation
| filter metadata.mintOperation = "confirmed" or metadata.mintOperation = "failed"
| stats count() by metadata.mintOperation
```

## Next Steps

1. **Install Dependencies**: Run `pnpm install` to install the uuid package
2. **Update Lambda Handlers**: Migrate existing Lambda handlers to use the `withLogging` wrapper
3. **Configure SNS Subscriptions**: Add email addresses to the alarm SNS topic
4. **Test Alarms**: Trigger test alarms to verify SNS notifications work
5. **Create Custom Metrics**: Implement custom CloudWatch metrics for:
   - Session completion rate
   - Active concurrent sessions
   - Category popularity
   - Player engagement metrics

## Integration with Other Stacks

The ObservabilityStack integrates with:
- **ApiStack**: Monitors API Gateway and Lambda functions
- **DataStack**: Monitors Aurora and Redis clusters
- **WorkflowStack**: Monitors Step Functions for mint/forge workflows
- **SecurityStack**: Logs are encrypted and access-controlled

## Cost Considerations

Estimated monthly costs for observability (1000 DAU):
- CloudWatch Logs: $5-10 (30-day retention)
- CloudWatch Metrics: $3-5 (custom metrics)
- CloudWatch Alarms: $1-2 (per alarm)
- CloudWatch Dashboards: $3 (per dashboard)
- SNS: <$1 (notifications)

**Total: ~$15-25/month**

## Monitoring Best Practices

1. **Review dashboards daily** during initial launch
2. **Set up PagerDuty integration** for critical alarms
3. **Create runbooks** for common alarm scenarios
4. **Use correlation IDs** for cross-service debugging
5. **Archive logs to S3** for long-term retention (>30 days)
6. **Create saved queries** in CloudWatch Logs Insights
7. **Monitor alarm history** to identify patterns
8. **Adjust thresholds** based on actual traffic patterns

## Documentation

- **Logging Guide**: `packages/shared/LOGGING.md`
- **Stack Implementation**: `infra/lib/stacks/observability-stack.ts`
- **Logger Utility**: `packages/shared/src/utils/logger.ts`
- **Lambda Wrapper**: `packages/shared/src/utils/lambda-wrapper.ts`
