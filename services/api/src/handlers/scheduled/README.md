# Scheduled Task Handlers

This directory contains Lambda functions triggered by EventBridge rules for scheduled maintenance tasks.

## Overview

The scheduled tasks handle critical system maintenance operations:
- **Daily Reset**: Cleans up expired Redis keys for session limits and question tracking
- **Eligibility Expiration**: Expires mint eligibilities that have passed their time window
- **Leaderboard Snapshot**: Archives daily leaderboard standings to the database

## Handlers

### 1. Daily Reset (`daily-reset.ts`)

**Trigger**: EventBridge cron rule at midnight ET (5 AM UTC)  
**Frequency**: Once per day  
**Requirements**: 3, 8

**Purpose**: Reset daily session limits and clear question seen sets

**Operations**:
1. Identifies and deletes yesterday's daily limit keys (`limit:daily:*:YYYY-MM-DD`)
2. Identifies and deletes yesterday's question seen sets (`seen:*:*:YYYY-MM-DD`)
3. Stores daily statistics for monitoring

**Key Pattern**:
- Daily limits: `limit:daily:{stakeKey|anonId}:{date}`
- Question seen: `seen:{stakeKey}:{categoryId}:{date}`

**Output**:
```json
{
  "statusCode": 200,
  "message": "Daily reset completed",
  "stats": {
    "limitKeysDeleted": 150,
    "seenKeysDeleted": 300,
    "resetAt": "2025-01-15T05:00:00.000Z"
  }
}
```

### 2. Eligibility Expiration (`eligibility-expiration.ts`)

**Trigger**: EventBridge rate rule every 1 minute  
**Frequency**: Every minute  
**Requirements**: 10, 11

**Purpose**: Expire mint eligibilities that have passed their expiration time

**Operations**:
1. Scans `eligibilities` table for active entries with `expires_at <= NOW()`
2. Updates status from `'active'` to `'expired'`
3. Logs expired eligibilities for monitoring

**Note**: NFTs are not reserved when eligibility is granted, so no stock adjustment is needed.

**Output**:
```json
{
  "statusCode": 200,
  "message": "Eligibility expiration check completed",
  "expiredCount": 5
}
```

### 3. Leaderboard Snapshot (`leaderboard-snapshot.ts`)

**Trigger**: EventBridge cron rule at 1 AM ET (6 AM UTC)  
**Frequency**: Once per day  
**Requirements**: 26

**Purpose**: Archive daily leaderboard standings to maintain historical records

**Operations**:
1. Gets the current active season
2. Reads entire Redis sorted set for global leaderboard (`ladder:global:{seasonId}`)
3. Decodes composite scores into individual components:
   - Points
   - NFTs minted
   - Perfect scores
   - Average answer time
4. Inserts/updates records in `leaderboard_snapshots` table

**Composite Score Decoding**:
```
score = (points * 1e15) + (nfts * 1e12) + (perfects * 1e9) + 
        ((1e9 - avgTime) * 1e6) + ((1e6 - sessions) * 1e3) + timestamp
```

**Output**:
```json
{
  "statusCode": 200,
  "message": "Leaderboard snapshot completed",
  "season": "winter-s1",
  "snapshotDate": "2025-01-15T06:00:00.000Z",
  "entriesCount": 250
}
```

## Infrastructure

All EventBridge rules and Lambda functions are defined in `infra/lib/stacks/workflow-stack.ts`:

- **DailyResetRule**: `cron(0 5 * * ? *)` - Midnight ET
- **EligibilityExpirationRule**: `rate(1 minute)` - Every minute
- **LeaderboardSnapshotRule**: `cron(0 6 * * ? *)` - 1 AM ET

## Error Handling

All handlers:
- Log errors with full context
- Throw errors to trigger Lambda retry mechanism
- Use CloudWatch Logs for monitoring
- Clean up resources (Redis connections) in finally blocks

## Monitoring

Key metrics to monitor:
- **Daily Reset**: Number of keys deleted, execution time
- **Eligibility Expiration**: Number of eligibilities expired per run
- **Leaderboard Snapshot**: Number of entries archived, execution time

CloudWatch alarms should be configured for:
- Lambda function errors
- Execution timeouts
- Unexpected result counts

## Testing

To test locally:
1. Set up local Redis and PostgreSQL
2. Configure environment variables
3. Run handlers with mock EventBridge events:

```typescript
import { handler } from './daily-reset';

const mockEvent = {
  version: '0',
  id: 'test-id',
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: '123456789012',
  time: new Date().toISOString(),
  region: 'us-east-1',
  resources: [],
  detail: {},
};

await handler(mockEvent);
```

## Dependencies

- `aws-lambda`: EventBridge event types
- `../../services/redis-service`: Redis operations
- `../../services/season-service`: Season management
- `../../db/connection`: Database connection pool

## Related Files

- Infrastructure: `infra/lib/stacks/workflow-stack.ts`
- Redis Service: `services/api/src/services/redis-service.ts`
- Season Service: `services/api/src/services/season-service.ts`
- Database Schema: `services/api/migrations/1_initial-schema.sql`
