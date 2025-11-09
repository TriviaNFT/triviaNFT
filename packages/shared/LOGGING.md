# Structured Logging Guide

This document describes how to use the structured logging utilities in Lambda functions.

## Overview

The logging utilities provide:
- **JSON-formatted logs** for easy parsing in CloudWatch Logs Insights
- **Correlation IDs** for request tracing across services
- **Automatic sanitization** of sensitive data (wallet addresses, keys, emails)
- **30-day log retention** as configured in the ObservabilityStack
- **Structured metadata** for filtering and analysis

## Requirements

Implements **Requirement 46: Observability - Logging**:
1. Log all API requests with timestamp, endpoint, and response status
2. Log all session events (start, complete, forfeit)
3. Log all mint and forge operations with transaction hashes
4. Use structured JSON logging format
5. Retain logs for 30 days in CloudWatch

## Basic Usage

### Creating a Logger

```typescript
import { createLogger, Logger } from '@trivia-nft/shared/utils';

// In a Lambda handler
export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  const logger = createLogger(context, {
    userId: 'user-123',
    stakeKey: 'stake1...',
  });

  logger.info('Processing request', {
    categoryId: 'science',
    sessionCount: 5,
  });
};
```

### Using the Lambda Wrapper

The recommended approach is to use the `withLogging` wrapper:

```typescript
import { withLogging, createSuccessResponse, createErrorResponse } from '@trivia-nft/shared/utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const handlerImpl = async (
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> => {
  // Logger is automatically configured with correlation ID
  logger.info('Starting session', {
    categoryId: event.pathParameters?.categoryId,
  });

  try {
    // Your business logic here
    const result = await startSession(event.body);

    logger.logSessionEvent('start', result.sessionId, {
      categoryId: result.categoryId,
    });

    return createSuccessResponse(result, 200);
  } catch (error) {
    logger.error('Failed to start session', error as Error);
    return createErrorResponse(500, 'Failed to start session');
  }
};

// Export wrapped handler
export const handler = withLogging(handlerImpl, {
  logRequestBody: false, // Don't log request body for security
  logResponseBody: false, // Don't log response body for security
});
```

## Log Levels

The logger supports four log levels:

```typescript
logger.debug('Detailed debugging information', { data: '...' });
logger.info('General information', { data: '...' });
logger.warn('Warning message', { data: '...' });
logger.error('Error message', error, { data: '...' });
```

Set the log level via environment variable:
```typescript
LOG_LEVEL=DEBUG  // Show all logs
LOG_LEVEL=INFO   // Show info, warn, error (default)
LOG_LEVEL=WARN   // Show warn, error
LOG_LEVEL=ERROR  // Show only errors
```

## Specialized Logging Methods

### API Requests and Responses

```typescript
// Log incoming request
logger.logRequest('POST', '/sessions/start', {
  categoryId: 'science',
});

// Log response
logger.logResponse('POST', '/sessions/start', 200, 150, {
  sessionId: 'session-123',
});
```

### Session Events

```typescript
logger.logSessionEvent('start', 'session-123', {
  categoryId: 'science',
  playerId: 'player-456',
});

logger.logSessionEvent('complete', 'session-123', {
  score: 10,
  isPerfect: true,
});

logger.logSessionEvent('forfeit', 'session-123', {
  currentQuestion: 5,
});
```

### Mint Operations

```typescript
logger.logMintOperation('initiated', 'mint-123', {
  eligibilityId: 'elig-456',
  categoryId: 'science',
});

logger.logMintOperation('submitted', 'mint-123', {
  txHash: '0x123...',
});

logger.logMintOperation('confirmed', 'mint-123', {
  nftId: 'nft-789',
});
```

### Forge Operations

```typescript
logger.logForgeOperation('initiated', 'forge-123', {
  type: 'category',
  inputNfts: ['nft-1', 'nft-2'],
});

logger.logForgeOperation('burned', 'forge-123', {
  burnTxHash: '0x456...',
});

logger.logForgeOperation('confirmed', 'forge-123', {
  ultimateNftId: 'nft-ultimate-1',
});
```

### Blockchain Transactions

```typescript
logger.logTransaction('mint', '0x123...', 'submitted', {
  policyId: 'policy-123',
  assetName: 'ScienceNFT001',
});

logger.logTransaction('mint', '0x123...', 'confirmed', {
  confirmations: 3,
  blockHeight: 12345,
});
```

### Database Queries

```typescript
const startTime = Date.now();
const result = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
const duration = Date.now() - startTime;

logger.logQuery('SELECT * FROM sessions WHERE id = $1', duration, {
  rowCount: result.rows.length,
});
```

### Redis Operations

```typescript
const startTime = Date.now();
await redis.set('session:123', sessionData);
const duration = Date.now() - startTime;

logger.logRedisOperation('SET', 'session:123', duration, {
  ttl: 900,
});
```

## Sensitive Data Sanitization

The logger automatically sanitizes sensitive data:

### Stake Keys
```typescript
// Input: stake1u9ylzsgxaa998dmqmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmq
// Output: stake1...mqmq
```

### Addresses
```typescript
// Input: addr1qxylzsgxaa998dmqmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmqmxmq
// Output: addr1q...mqmq
```

### Email Addresses
```typescript
// Input: user@example.com
// Output: us***@example.com
```

### JWT Tokens
```typescript
// Input: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
// Output: [JWT_TOKEN]
```

### Sensitive Keys
Any object key containing these words will be redacted:
- `password`
- `secret`
- `token`
- `key`

```typescript
logger.info('User authenticated', {
  username: 'alice',
  password: 'secret123', // Will be [REDACTED]
  apiKey: 'abc123',      // Will be [REDACTED]
});
```

## Correlation IDs

Correlation IDs enable request tracing across services:

```typescript
import { extractCorrelationId } from '@trivia-nft/shared/utils';

// Extract from API Gateway event
const correlationId = extractCorrelationId(event);

// Create logger with correlation ID
const logger = createLogger(context, { correlationId });

// Correlation ID is automatically included in all logs
logger.info('Processing request'); // Includes correlationId in context

// Pass correlation ID to downstream services
const response = await fetch('https://api.example.com', {
  headers: {
    'X-Correlation-Id': correlationId,
  },
});
```

The correlation ID is also returned in response headers:
```
X-Correlation-Id: 550e8400-e29b-41d4-a716-446655440000
```

## Child Loggers

Create child loggers with additional context:

```typescript
const logger = createLogger(context);

// Create child logger for session processing
const sessionLogger = logger.child({
  sessionId: 'session-123',
  categoryId: 'science',
});

// All logs from child include parent and child context
sessionLogger.info('Question answered', {
  questionIndex: 5,
  correct: true,
});
```

## CloudWatch Logs Insights Queries

### Find all errors for a specific user

```
fields @timestamp, message, context.userId, error.message
| filter level = "ERROR" and context.userId = "user-123"
| sort @timestamp desc
```

### Track a request across services

```
fields @timestamp, message, context.correlationId
| filter context.correlationId = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

### Find slow database queries

```
fields @timestamp, message, metadata.durationMs, metadata.query
| filter message like /Database query/
| filter metadata.durationMs > 1000
| sort metadata.durationMs desc
```

### Monitor mint success rate

```
fields @timestamp, metadata.mintOperation
| filter metadata.mintOperation = "confirmed" or metadata.mintOperation = "failed"
| stats count() by metadata.mintOperation
```

### Find API errors by endpoint

```
fields @timestamp, context.path, metadata.statusCode
| filter metadata.statusCode >= 400
| stats count() by context.path, metadata.statusCode
```

## Best Practices

1. **Always use the Lambda wrapper** for consistent logging
2. **Don't log sensitive data** - the sanitizer helps but be cautious
3. **Use appropriate log levels** - DEBUG for development, INFO for production
4. **Include relevant context** - add metadata that helps debugging
5. **Log at key points** - start, success, failure, and important state changes
6. **Use correlation IDs** - pass them to all downstream services
7. **Keep messages concise** - put details in metadata
8. **Log errors with stack traces** - use `logger.error(message, error)`

## Example: Complete Lambda Handler

```typescript
import { withLogging, createSuccessResponse, createErrorResponse, Logger } from '@trivia-nft/shared/utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const startSessionImpl = async (
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> => {
  const { categoryId } = JSON.parse(event.body || '{}');

  // Create child logger for this session
  const sessionLogger = logger.child({ categoryId });

  try {
    // Check daily limit
    sessionLogger.info('Checking daily limit');
    const limit = await checkDailyLimit(userId);
    if (limit.exceeded) {
      sessionLogger.warn('Daily limit exceeded', { limit: limit.max });
      return createErrorResponse(429, 'Daily limit exceeded');
    }

    // Start session
    sessionLogger.info('Starting session');
    const session = await createSession(userId, categoryId);

    // Log session event
    sessionLogger.logSessionEvent('start', session.id, {
      questionCount: session.questions.length,
    });

    return createSuccessResponse(session, 201);
  } catch (error) {
    sessionLogger.error('Failed to start session', error as Error, {
      categoryId,
    });
    return createErrorResponse(500, 'Failed to start session');
  }
};

export const handler = withLogging(startSessionImpl);
```

## Log Retention

Logs are retained for **30 days** as configured in the ObservabilityStack. After 30 days, logs are automatically deleted by CloudWatch.

For long-term archival, consider:
1. Exporting logs to S3 using CloudWatch Logs export
2. Streaming logs to a data lake using Kinesis Firehose
3. Using CloudWatch Logs Insights to create saved queries

## Monitoring and Alerts

The ObservabilityStack creates alarms for:
- API error rate > 5%
- Lambda function errors > 10
- Database connection failures > 5
- Blockchain transaction failures > 10%
- Step Function execution failures > 3

These alarms send notifications to the SNS topic configured in the stack.
