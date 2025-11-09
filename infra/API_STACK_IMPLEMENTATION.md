# API Stack Implementation Summary

## Overview

The ApiStack implements a complete serverless API using AWS API Gateway HTTP API and Lambda functions. It includes JWT authentication, comprehensive route definitions, Lambda layers for shared dependencies, and full integration with other infrastructure components.

## Components Implemented

### 1. API Gateway HTTP API

**Features:**
- HTTP API (lower cost and latency than REST API)
- CORS configuration for web clients
- JWT authorizer for protected routes
- Access logging to CloudWatch
- Request throttling (500 burst, 1000/sec rate limit)

**Configuration:**
```typescript
- Protocol: HTTP
- CORS: Allow all origins (configure for production)
- Stage: $default with auto-deploy
- Logging: Structured JSON logs to CloudWatch
```

### 2. JWT Authorizer

**Implementation:**
- Custom Lambda authorizer function
- Validates JWT tokens from Authorization header
- Returns IAM policy (Allow/Deny)
- Caches authorization decisions (5 minutes TTL)
- Includes user context (stakeKey, username) in request

**Handler:** `services/api/src/handlers/auth/authorizer.ts`

### 3. Lambda Functions

All Lambda functions are deployed with:
- **Runtime:** Node.js 20 on ARM64 architecture
- **VPC:** Attached to private subnets for Aurora/Redis access
- **Secrets:** Access to JWT, Blockfrost, Database, Redis, IPFS, and Policy Signing Key secrets
- **Layers:** Dependencies and shared utilities layers
- **Tracing:** AWS X-Ray enabled
- **Logs:** 30-day retention in CloudWatch
- **Memory:** 256MB-1024MB based on function requirements
- **Timeout:** 10s-30s based on function requirements

#### Authentication Functions
- `POST /auth/connect` - Wallet connection (public)
- `POST /auth/profile` - Profile creation (public)
- `GET /auth/me` - Current user info (authenticated)

#### Session Functions
- `POST /sessions/start` - Start trivia session (authenticated)
- `POST /sessions/{id}/answer` - Submit answer (authenticated)
- `POST /sessions/{id}/complete` - Complete session (authenticated)
- `GET /sessions/history` - Session history (authenticated)

#### Question Functions
- `POST /questions/flag` - Flag question (authenticated)

#### Mint Functions
- `GET /eligibilities` - List mint eligibilities (authenticated)
- `POST /mint/{eligibilityId}` - Initiate mint (authenticated)
- `GET /mint/{mintId}/status` - Check mint status (authenticated)

#### Forge Functions
- `GET /forge/progress` - Get forging progress (authenticated)
- `POST /forge/{type}` - Initiate forge (authenticated)
- `GET /forge/{forgeId}/status` - Check forge status (authenticated)

#### Leaderboard Functions
- `GET /leaderboard/global` - Global leaderboard (public)
- `GET /leaderboard/category/{id}` - Category leaderboard (public)
- `GET /leaderboard/season/{id}` - Season leaderboard (public)

#### Season Functions
- `GET /seasons/current` - Current season info (public)

### 4. Lambda Layers

**Dependencies Layer:**
- Contains all production npm dependencies
- Includes AWS SDK, database clients (pg, redis), validation (zod), etc.
- Built from `services/api/layer` directory
- Reduces individual Lambda package sizes
- Shared across all functions

**Shared Utilities Layer:**
- Contains `@trivia-nft/shared` package
- Types, schemas, validation helpers, error classes
- API client utilities
- Date/time utilities

**Build Script:** `services/api/scripts/build-layer.sh`

### 5. Environment Variables

All Lambda functions receive:
```typescript
{
  ENVIRONMENT: 'staging' | 'production',
  APPCONFIG_APPLICATION_ID: string,
  APPCONFIG_ENVIRONMENT_ID: string,
  APPCONFIG_CONFIGURATION_PROFILE_ID: string,
  JWT_SECRET_ARN: string,
  BLOCKFROST_SECRET_ARN: string,
  DATABASE_SECRET_ARN: string,
  REDIS_SECRET_ARN: string,
  IPFS_SECRET_ARN: string,
  POLICY_SIGNING_KEY_SECRET_ARN: string,
  MINT_STATE_MACHINE_ARN: string, // For mint functions
  FORGE_STATE_MACHINE_ARN: string, // For forge functions
}
```

### 6. IAM Permissions

Lambda functions have permissions for:
- Reading secrets from Secrets Manager
- KMS decryption for secrets
- X-Ray tracing
- CloudWatch Logs
- VPC network interfaces (for VPC-attached functions)
- Step Functions execution (for mint/forge initiation functions)
- Step Functions describe execution (for status check functions)

### 7. Security Features

**Request Validation:**
- JWT token validation on protected routes
- Input validation using Zod schemas (in handlers)
- SQL injection prevention (parameterized queries)

**Rate Limiting:**
- API Gateway throttling: 500 burst, 1000/sec
- WAF rate limiting: 100 requests/5min per IP (configured in SecurityStack)

**Secrets Management:**
- All sensitive data in Secrets Manager
- Automatic rotation for JWT and policy signing keys
- Encrypted at rest and in transit

**Network Security:**
- Lambda functions in private subnets
- Security groups for Aurora/Redis access
- No direct internet access (NAT Gateway for outbound)

## Stack Dependencies

The ApiStack depends on:
1. **SecurityStack** - Provides secrets and WAF
2. **DataStack** - Provides VPC, Aurora, Redis, security groups
3. **AppConfigStack** - Provides game configuration
4. **WorkflowStack** - Provides Step Functions ARNs (optional)

## Deployment

### Prerequisites

1. Build the API service:
```bash
cd services/api
pnpm build
```

2. Build Lambda layers:
```bash
cd services/api
chmod +x scripts/build-layer.sh
./scripts/build-layer.sh
```

3. Build shared package:
```bash
cd packages/shared
pnpm build
```

### Deploy Stack

```bash
cd infra
pnpm cdk deploy ApiStack --context environment=staging
```

### Outputs

The stack outputs:
- `ApiEndpoint` - API Gateway base URL
- `ApiId` - API Gateway ID
- `DependenciesLayerArn` - Dependencies layer ARN
- `SharedUtilsLayerArn` - Shared utilities layer ARN

## Testing

### Local Testing

Use AWS SAM or LocalStack for local testing:

```bash
# Start LocalStack
docker-compose up -d

# Invoke function locally
sam local invoke ConnectLambda --event events/connect.json
```

### Integration Testing

```bash
# Set API endpoint
export API_URL="https://xxx.execute-api.us-east-1.amazonaws.com"

# Test public endpoint
curl $API_URL/auth/connect -X POST -d '{"stakeKey":"stake1..."}'

# Test authenticated endpoint
curl $API_URL/auth/me -H "Authorization: Bearer $JWT_TOKEN"
```

## Monitoring

### CloudWatch Logs

All Lambda functions log to CloudWatch with structured JSON:
```json
{
  "level": "info",
  "message": "Session started",
  "sessionId": "uuid",
  "playerId": "uuid",
  "categoryId": "science"
}
```

### CloudWatch Metrics

Key metrics to monitor:
- Lambda invocations, errors, duration
- API Gateway 4xx/5xx errors, latency
- Concurrent executions
- Throttles

### X-Ray Tracing

All functions have X-Ray tracing enabled for:
- End-to-end request tracing
- Service map visualization
- Performance bottleneck identification

## Cost Optimization

**Lambda:**
- ARM64 architecture (20% cost savings)
- Right-sized memory allocation
- Efficient code with minimal cold starts

**API Gateway:**
- HTTP API (cheaper than REST API)
- Caching authorization decisions

**Layers:**
- Shared dependencies reduce deployment package sizes
- Faster deployments and cold starts

## Future Enhancements

1. **API Gateway Custom Domain**
   - Configure Route 53 and ACM certificate
   - Use custom domain (api.trivianft.com)

2. **Request Validation**
   - Add JSON schema validation at API Gateway level
   - Reduce Lambda invocations for invalid requests

3. **Response Caching**
   - Cache leaderboard responses (1 minute TTL)
   - Cache season info (5 minutes TTL)

4. **WebSocket API**
   - Real-time session updates
   - Live leaderboard updates

5. **GraphQL API**
   - Migrate to AppSync for flexible queries
   - Reduce over-fetching

## Troubleshooting

### Lambda Function Errors

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/trivia-nft-connect-staging --follow
```

### Authorization Failures

Check authorizer logs:
```bash
aws logs tail /aws/lambda/trivia-nft-authorizer-staging --follow
```

### VPC Connectivity Issues

Verify:
- Lambda security group allows outbound traffic
- Aurora/Redis security groups allow inbound from Lambda SG
- NAT Gateway is configured for internet access

### Cold Start Issues

Solutions:
- Enable provisioned concurrency for critical functions
- Optimize package size with layers
- Use ARM64 architecture

## Related Documentation

- [Security Stack](./SECURITY_STACK_IMPLEMENTATION.md)
- [Data Stack](./DATA_STACK_IMPLEMENTATION.md)
- [Workflow Stack](./lib/stacks/workflow-stack.ts)
- [AppConfig Stack](./APPCONFIG_IMPLEMENTATION.md)
