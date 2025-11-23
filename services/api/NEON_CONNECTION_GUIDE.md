# Neon PostgreSQL Connection Guide

This guide explains how the database connection is configured for Neon PostgreSQL in the TriviaNFT application.

## Overview

The application has been updated to use Neon PostgreSQL with optimized connection pooling for serverless environments (Vercel Functions). The connection configuration is designed to work efficiently with Neon's connection pooler.

## Configuration

### Environment Variables

The application requires the following environment variable:

```bash
DATABASE_URL=postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require
```

**Important**: Use the **pooled connection string** (with `-pooler` in the hostname) for optimal performance in serverless environments.

### Connection Pool Settings

The connection pool is configured with the following Neon-optimized settings:

- **Max Connections**: 10 (smaller pool size since Neon handles pooling)
- **Idle Timeout**: 20 seconds (release idle connections quickly)
- **Connection Timeout**: 10 seconds (fail fast if can't connect)
- **SSL**: Always enabled for Neon connections
- **Statement Timeout**: 30 seconds (query timeout)

### Why These Settings?

1. **Smaller Pool Size (10)**: Neon's connection pooler handles connection pooling at the infrastructure level, so we don't need large pools in each function instance.

2. **Short Idle Timeout (20s)**: In serverless environments, connections should be released quickly when not in use to avoid holding resources.

3. **SSL Always Enabled**: Neon requires SSL for all connections to ensure data security.

4. **Pooled Connection String**: Using Neon's pooler (`-pooler` suffix) provides better performance and connection management for serverless workloads.

## Connection Types

### Pooled Connection (Recommended for Vercel Functions)

```
postgresql://user:pass@ep-xxx-pooler.neon.tech/db?sslmode=require
```

- Use for all API routes and serverless functions
- Optimized for high-concurrency serverless workloads
- Handles connection pooling at the infrastructure level
- Lower latency for connection establishment

### Direct Connection (For Migrations Only)

```
postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require
```

- Use only for database migrations
- Required for operations that need direct database access
- Set as `DATABASE_URL_UNPOOLED` environment variable

## Usage

### Basic Query

```typescript
import { query } from './db/connection.js';

const result = await query('SELECT * FROM players WHERE id = $1', [playerId]);
```

### Transaction

```typescript
import { transaction } from './db/connection.js';

const result = await transaction(async (client) => {
  await client.query('INSERT INTO players (id, username) VALUES ($1, $2)', [id, username]);
  await client.query('INSERT INTO sessions (player_id) VALUES ($1)', [id]);
  return { success: true };
});
```

### Health Check

```typescript
import { healthCheck } from './db/connection.js';

const healthy = await healthCheck();
if (!healthy) {
  console.error('Database is not healthy');
}
```

## Testing

### Run Unit Tests

```bash
cd services/api
pnpm test src/db/connection.test.ts
```

### Run Integration Test

```bash
cd services/api
pnpm exec tsx src/db/vercel-function-test.ts
```

The integration test simulates a Vercel Function environment and verifies:
- Connection pool initialization
- Query execution
- Health checks
- Concurrent request handling
- Neon-specific configuration

## Vercel Deployment

### Environment Variables Setup

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `DATABASE_URL` with your Neon pooled connection string
4. Add `DATABASE_URL_UNPOOLED` with your Neon direct connection string (for migrations)
5. Set the appropriate scope (Production, Preview, Development)

### Preview Environments

Neon automatically creates database branches for Vercel preview deployments:
- Each Git branch gets its own isolated database
- Database branches are automatically cleaned up when preview deployments are deleted
- No additional configuration needed

## Monitoring

### Connection Pool Statistics

```typescript
import { getStats } from './db/connection.js';

const stats = await getStats();
console.log('Total connections:', stats.totalConnections);
console.log('Idle connections:', stats.idleConnections);
console.log('Waiting clients:', stats.waitingClients);
```

### Slow Query Logging

Queries taking longer than 1 second are automatically logged with:
- Query duration
- Query text (first 100 characters)
- Row count

## Troubleshooting

### Connection Timeout

If you see connection timeout errors:
1. Verify `DATABASE_URL` is set correctly
2. Check that you're using the pooled connection string
3. Verify SSL is enabled (`sslmode=require`)
4. Check Neon dashboard for database status

### Too Many Connections

If you see "too many connections" errors:
1. Verify you're using the pooled connection string (with `-pooler`)
2. Check that idle timeout is set correctly (20s)
3. Ensure `closePool()` is called when shutting down

### SSL Errors

If you see SSL-related errors:
1. Verify `sslmode=require` is in the connection string
2. Check that SSL is enabled in the pool configuration
3. Ensure `rejectUnauthorized: false` is set for self-signed certificates

## Migration from AWS RDS

The connection configuration has been simplified from the AWS version:
- ✅ Removed AWS Secrets Manager dependency
- ✅ Removed RDS Proxy configuration
- ✅ Simplified to use `DATABASE_URL` environment variable
- ✅ Optimized pool settings for Neon and serverless
- ✅ Always-on SSL for security

## Performance Considerations

### Connection Pooling

- Neon's pooler handles connection pooling at the infrastructure level
- Each Vercel Function instance maintains a small pool (10 connections)
- Connections are reused across invocations within the same instance
- Idle connections are released after 20 seconds

### Query Performance

- Use parameterized queries to leverage query plan caching
- Add appropriate indexes for frequently queried columns
- Monitor slow queries (automatically logged if > 1 second)
- Use transactions for multiple related operations

### Serverless Best Practices

- Keep connection pool size small (10 is optimal)
- Release idle connections quickly (20s timeout)
- Use pooled connection string for better performance
- Fail fast with short connection timeout (10s)

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon + Vercel Integration](https://neon.tech/docs/guides/vercel)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Vercel Functions](https://vercel.com/docs/functions)
