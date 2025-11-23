# Design Document

## Overview

This design outlines the migration of the TriviaNFT application from AWS infrastructure to Vercel + Inngest. The migration maintains all existing functionality while leveraging Vercel's edge network, Inngest's workflow orchestration, and managed services (Neon PostgreSQL, Upstash Redis) for improved developer experience and cost optimization.

### Key Design Decisions

1. **Neon PostgreSQL**: Chosen for native Vercel integration, database branching for preview environments, and serverless connection pooling
2. **Upstash Redis**: Selected for serverless Redis with edge caching and REST API compatibility
3. **Inngest**: Replaces Step Functions with better DX, automatic retries, and no infrastructure management
4. **Vercel Functions**: Replaces Lambda with zero-config deployment and edge network distribution
5. **Existing Schema Preservation**: No database schema changes required - PostgreSQL features are fully compatible

## Architecture

### Current Architecture (AWS)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  API Gateway    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Lambda         │─────▶│ PostgreSQL   │
│  Functions      │      └──────────────┘
└──────┬──────────┘
       │              ┌──────────────┐
       ├─────────────▶│    Redis     │
       │              └──────────────┘
       │
       ▼              ┌──────────────┐
┌─────────────────┐  │      S3      │
│ Step Functions  │─▶└──────────────┘
│ (Mint/Forge)    │
└─────────────────┘  ┌──────────────┐
                     │  Blockfrost  │
                     └──────────────┘
```


### Target Architecture (Vercel + Inngest)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Vercel Edge    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Vercel         │─────▶│    Neon      │
│  Functions      │      │  PostgreSQL  │
└──────┬──────────┘      └──────────────┘
       │
       │              ┌──────────────┐
       ├─────────────▶│   Upstash    │
       │              │    Redis     │
       │              └──────────────┘
       ▼
┌─────────────────┐  ┌──────────────┐
│    Inngest      │─▶│      S3      │
│  (Workflows)    │  │  (or Blob)   │
└─────────────────┘  └──────────────┘
                     ┌──────────────┐
                     │  Blockfrost  │
                     └──────────────┘
```

### Architecture Benefits

1. **Simplified Infrastructure**: No AWS account management, IAM roles, or VPC configuration
2. **Preview Environments**: Automatic database branching and isolated environments per Git branch
3. **Edge Distribution**: Global CDN and edge functions for low latency
4. **Developer Experience**: Git-based deployments, instant rollbacks, and integrated monitoring
5. **Cost Optimization**: Pay-per-execution pricing with generous free tiers

## Components and Interfaces

### 1. Database Layer (Neon PostgreSQL)

**Purpose**: Persistent data storage for all application data

**Configuration**:
- Connection pooling via Neon's pooler (required for serverless)
- Connection string format: `postgresql://user:pass@host/db?sslmode=require`
- Pooled connection string for Vercel Functions
- Direct connection string for migrations

**Interface**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // Connection pool size
});
```


### 2. Cache Layer (Upstash Redis)

**Purpose**: Session management, rate limiting, and caching

**Configuration**:
- REST API for edge compatibility
- Redis-compatible commands
- Automatic edge caching

**Interface**:
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// Usage
await redis.set('key', 'value', { ex: 3600 });
const value = await redis.get('key');
```

### 3. Workflow Layer (Inngest)

**Purpose**: Orchestrate long-running NFT minting and forging operations

**Configuration**:
- Event-driven architecture
- Automatic retries with exponential backoff
- Step-based execution with state persistence

**Interface**:
```typescript
import { Inngest } from 'inngest';

const inngest = new Inngest({ 
  id: 'trivia-nft',
  eventKey: process.env.INNGEST_EVENT_KEY 
});

// Define workflow function
export const mintWorkflow = inngest.createFunction(
  { id: 'mint-nft' },
  { event: 'mint/initiated' },
  async ({ event, step }) => {
    // Each step is automatically retried on failure
    const eligibility = await step.run('validate-eligibility', async () => {
      return validateEligibility(event.data.eligibilityId);
    });
    
    const nft = await step.run('reserve-nft', async () => {
      return reserveNFT(eligibility.categoryId);
    });
    
    const tx = await step.run('submit-transaction', async () => {
      return submitMintTransaction(nft, eligibility.stakeKey);
    });
    
    // Sleep without consuming compute
    await step.sleep('wait-for-confirmation', '2m');
    
    const confirmed = await step.run('check-confirmation', async () => {
      return checkTransactionConfirmation(tx.hash);
    });
    
    return { success: true, nft, tx };
  }
);
```


### 4. API Layer (Vercel Functions)

**Purpose**: Handle HTTP requests and trigger workflows

**Configuration**:
- API routes in `/api` directory
- Automatic serverless function creation
- 10-second timeout (Hobby), 60-second (Pro)

**Interface**:
```typescript
// app/api/mint/[eligibilityId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';

export async function POST(
  request: NextRequest,
  { params }: { params: { eligibilityId: string } }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const payload = await verifyToken(token);
  
  // Trigger Inngest workflow
  await inngest.send({
    name: 'mint/initiated',
    data: {
      eligibilityId: params.eligibilityId,
      playerId: payload.sub,
      stakeKey: payload.stakeKey,
    },
  });
  
  return NextResponse.json({ success: true });
}
```

### 5. Inngest Endpoint

**Purpose**: Receive workflow execution requests from Inngest

**Configuration**:
- Single endpoint at `/api/inngest`
- Handles all workflow function invocations
- Verifies request signatures

**Interface**:
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { mintWorkflow, forgeWorkflow } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    mintWorkflow,
    forgeWorkflow,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
```

## Data Models

The existing PostgreSQL schema remains unchanged. Key tables:

### Players
- Stores user accounts (wallet-connected or guest)
- Primary key: UUID
- Unique identifiers: stake_key, anon_id, username

### Sessions
- Completed trivia game sessions
- Links to player and category
- Stores score, timing, and question history

### Eligibilities
- Time-limited rights to mint NFTs
- Created after perfect scores
- Expires after 1 hour (connected) or 25 minutes (guest)


### Mints
- NFT minting operations
- Tracks status: pending, confirmed, failed
- Links to eligibility and catalog

### Forge Operations
- NFT forging operations (burn + mint)
- Tracks input and output NFTs
- Supports category, master, and seasonal forging

### Player NFTs
- NFTs owned by players
- Confirmed on-chain
- Includes metadata and tier information

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Redis Retry with Exponential Backoff

*For any* Redis operation that fails, the system should retry with exponentially increasing delays between attempts, ensuring eventual consistency without overwhelming the service.

**Validates: Requirements 2.4**

### Property 2: JWT Token Verification Consistency

*For any* JWT token (valid or invalid), the authentication system should verify it identically to the current implementation, maintaining the same security guarantees.

**Validates: Requirements 4.3**

### Property 3: API Response Structure Consistency

*For any* API endpoint and request, the response structure and status codes should match the current implementation exactly, ensuring client compatibility.

**Validates: Requirements 4.4**

### Property 4: Workflow Step Retry Isolation

*For any* workflow step that fails, only that specific step should be retried without re-executing previously successful steps, maintaining idempotency.

**Validates: Requirements 6.9**

### Property 5: Session Creation Success

*For any* valid session parameters (player ID, category ID), the system should successfully create and persist a session record with correct initial state.

**Validates: Requirements 9.1**

### Property 6: Perfect Score Eligibility Creation

*For any* completed session with a perfect score (10/10), the system should automatically create an eligibility record with correct expiration time based on player type.

**Validates: Requirements 9.2**

### Property 7: Mint Workflow Completion

*For any* valid mint request (valid eligibility, available NFT stock, connected wallet), the Inngest workflow should complete successfully and update all database records correctly.

**Validates: Requirements 9.3**

### Property 8: Forge Workflow Completion

*For any* valid forge request (correct NFT ownership, valid forge type requirements), the Inngest workflow should complete successfully, burning input NFTs and minting the output NFT.

**Validates: Requirements 9.4**

### Property 9: Leaderboard Ranking Correctness

*For any* set of player session data, the leaderboard should rank players correctly based on points, with tiebreakers applied consistently (NFTs minted, average answer time).

**Validates: Requirements 9.5**

### Property 10: Error Message Appropriateness

*For any* error condition (validation failure, not found, unauthorized, server error), the system should return an appropriate HTTP status code and descriptive error message.

**Validates: Requirements 9.6**


## Error Handling

### Database Connection Errors

**Strategy**: Implement connection retry logic with exponential backoff

```typescript
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.connect();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### Redis Connection Errors

**Strategy**: Graceful degradation - continue operation without cache

```typescript
async function getCached(key: string) {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Redis error:', error);
    return null; // Fallback to database
  }
}
```

### Workflow Errors

**Strategy**: Inngest automatic retries with step isolation

- Each step retries independently up to 3 times
- Failed steps don't affect completed steps
- Workflow state persisted between retries
- Manual intervention available through Inngest dashboard

### API Errors

**Strategy**: Consistent error responses with appropriate status codes

```typescript
class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Usage
if (!eligibility) {
  throw new APIError(404, 'Eligibility not found', 'ELIGIBILITY_NOT_FOUND');
}
```

### Blockchain Transaction Errors

**Strategy**: Retry with increased fees, timeout after 10 minutes

```typescript
await step.run('submit-transaction', async () => {
  try {
    return await submitTransaction(tx);
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new NonRetryableError('Insufficient funds');
    }
    throw error; // Retry for other errors
  }
});
```


## Testing Strategy

### Unit Testing

**Framework**: Vitest (already configured in project)

**Focus Areas**:
- Database service methods (CRUD operations)
- JWT token verification logic
- Validation functions
- Error handling utilities
- Data transformation functions

**Example**:
```typescript
describe('MintService', () => {
  it('should validate eligibility ownership', async () => {
    const service = new MintService(mockDb);
    const eligibility = await service.validateEligibility(eligibilityId);
    expect(eligibility.playerId).toBe(expectedPlayerId);
  });
});
```

### Property-Based Testing

**Framework**: fast-check (already in dependencies)

**Configuration**: Minimum 100 iterations per property test

**Focus Areas**:
- JWT verification across random tokens
- API response structure consistency
- Leaderboard ranking with random session data
- Error message appropriateness for various error types
- Session creation with random valid parameters

**Example**:
```typescript
import fc from 'fast-check';

describe('Property: JWT Verification Consistency', () => {
  it('should verify tokens identically to current implementation', () => {
    fc.assert(
      fc.property(
        fc.record({
          sub: fc.uuid(),
          stakeKey: fc.string({ minLength: 56, maxLength: 56 }),
          exp: fc.integer({ min: Date.now() / 1000 }),
        }),
        async (payload) => {
          const token = await createToken(payload);
          const verified = await verifyToken(token);
          expect(verified.sub).toBe(payload.sub);
          expect(verified.stakeKey).toBe(payload.stakeKey);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Framework**: Playwright (already configured for E2E)

**Focus Areas**:
- Database connection and query execution
- Redis operations (set, get, delete)
- Inngest workflow triggering
- API endpoint responses
- Environment variable access

**Example**:
```typescript
describe('Integration: Database Connection', () => {
  it('should connect to Neon and execute queries', async () => {
    const pool = await getPool();
    const result = await pool.query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
  });
});
```

### Workflow Testing

**Framework**: Inngest Dev Server + Vitest

**Focus Areas**:
- Mint workflow step execution
- Forge workflow step execution
- Step retry behavior
- Workflow state persistence
- Error handling in workflows

**Example**:
```typescript
describe('Workflow: Mint NFT', () => {
  it('should complete mint workflow successfully', async () => {
    const { result } = await mintWorkflow.invoke({
      data: {
        eligibilityId: testEligibilityId,
        playerId: testPlayerId,
        stakeKey: testStakeKey,
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.nft).toBeDefined();
    expect(result.tx).toBeDefined();
  });
});
```

### End-to-End Testing

**Framework**: Playwright (existing E2E tests)

**Strategy**: Run existing E2E tests against Vercel preview deployment

**Focus Areas**:
- Complete user flows (session → perfect score → mint)
- Forge operations
- Leaderboard display
- Authentication flows
- Error scenarios

**Approach**: Existing E2E tests should work without modification if API contracts are maintained.


## Migration Strategy

### Phase 1: Infrastructure Setup (No Code Changes)

1. **Neon Database**:
   - Create Neon project
   - Run all migrations
   - Verify schema matches current database
   - Test connection pooling

2. **Upstash Redis**:
   - Create Upstash database
   - Test Redis commands
   - Verify edge caching works

3. **Inngest Account**:
   - Create Inngest account
   - Connect to Vercel
   - Verify webhook endpoint

### Phase 2: Code Migration (Incremental)

1. **Database Connection**:
   - Update connection string to Neon
   - Test all database operations
   - Verify migrations work

2. **Redis Connection**:
   - Update to Upstash Redis client
   - Test all Redis operations
   - Verify session management works

3. **API Routes**:
   - Convert Lambda handlers to Next.js API routes
   - Maintain identical paths and responses
   - Test each endpoint

4. **Inngest Workflows**:
   - Implement mint workflow with Inngest
   - Implement forge workflow with Inngest
   - Test workflow execution
   - Verify retry behavior

### Phase 3: Deployment and Testing

1. **Preview Deployment**:
   - Deploy to Vercel preview environment
   - Run integration tests
   - Run E2E tests
   - Verify all functionality

2. **Production Deployment**:
   - Deploy to production
   - Monitor error rates
   - Monitor workflow execution
   - Monitor database performance

### Phase 4: Data Migration (If Needed)

If migrating from existing production database:

1. **Backup Current Data**:
   ```bash
   pg_dump $CURRENT_DB_URL > backup.sql
   ```

2. **Restore to Neon**:
   ```bash
   psql $NEON_DB_URL < backup.sql
   ```

3. **Verify Data Integrity**:
   - Compare row counts
   - Verify foreign key relationships
   - Test critical queries

### Rollback Strategy

**If issues occur**:

1. **Immediate**: Revert Vercel deployment to previous version
2. **Database**: Keep old database running during migration
3. **Workflows**: Inngest maintains execution history for debugging
4. **Monitoring**: Set up alerts for error rates and workflow failures


## Environment Variables

### Required Variables

**Database**:
- `DATABASE_URL`: Neon PostgreSQL connection string (pooled)
- `DATABASE_URL_UNPOOLED`: Direct connection for migrations

**Redis**:
- `REDIS_URL`: Upstash Redis REST URL
- `REDIS_TOKEN`: Upstash Redis REST token

**Inngest**:
- `INNGEST_EVENT_KEY`: For sending events to Inngest
- `INNGEST_SIGNING_KEY`: For verifying Inngest requests

**Blockchain**:
- `BLOCKFROST_PROJECT_ID`: Blockfrost API key
- `NFT_POLICY_ID`: Cardano NFT policy ID

**Authentication**:
- `JWT_SECRET`: Secret for JWT signing/verification
- `JWT_ISSUER`: JWT issuer identifier

**Storage**:
- `S3_BUCKET`: S3 bucket name (or Vercel Blob)
- `S3_REGION`: S3 region
- `AWS_ACCESS_KEY_ID`: AWS credentials (if using S3)
- `AWS_SECRET_ACCESS_KEY`: AWS credentials (if using S3)

### Environment-Specific Values

**Development**:
- Use Inngest Dev Server (no keys needed)
- Use local PostgreSQL or Neon dev database
- Use Blockfrost preprod network

**Preview**:
- Automatic Neon branch database
- Automatic Inngest sandbox environment
- Use Blockfrost preprod network

**Production**:
- Production Neon database
- Production Inngest environment
- Use Blockfrost mainnet

## Performance Considerations

### Database Query Optimization

1. **Connection Pooling**: Use Neon's pooler to handle serverless connections efficiently
2. **Indexes**: Maintain all existing indexes for query performance
3. **Query Limits**: Add pagination to large result sets
4. **Prepared Statements**: Use parameterized queries to leverage query plan caching

### Redis Caching Strategy

1. **Session Data**: Cache active sessions with 10-minute TTL
2. **Leaderboard**: Cache leaderboard data with 5-minute TTL
3. **Category Data**: Cache category list with 1-hour TTL
4. **Edge Caching**: Leverage Upstash edge caching for global low latency

### Workflow Optimization

1. **Step Granularity**: Balance between too many steps (overhead) and too few (retry cost)
2. **Parallel Execution**: Use `step.run()` in parallel where possible
3. **Sleep Duration**: Use appropriate sleep durations for blockchain confirmations
4. **Timeout Configuration**: Set reasonable timeouts for each step

### API Response Time

1. **Edge Functions**: Use Vercel Edge Functions for read-only operations
2. **Response Caching**: Cache static responses at CDN level
3. **Database Queries**: Optimize slow queries identified in monitoring
4. **Async Operations**: Return immediately for long-running operations (workflows)

## Security Considerations

### Environment Variables

- Store all secrets in Vercel environment variables (encrypted at rest)
- Never commit secrets to Git
- Use different values for each environment
- Rotate secrets regularly

### Database Security

- Use SSL/TLS for all database connections
- Limit database user permissions to required operations only
- Enable Neon's IP allowlist if needed
- Monitor for suspicious query patterns

### API Security

- Verify JWT tokens on all protected endpoints
- Implement rate limiting using Redis
- Validate and sanitize all user inputs
- Use CORS headers appropriately

### Workflow Security

- Verify Inngest request signatures
- Validate workflow inputs before execution
- Implement idempotency keys for critical operations
- Log all workflow executions for audit trail

