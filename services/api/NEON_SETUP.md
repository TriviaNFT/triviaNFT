# Neon PostgreSQL Setup Guide

This guide covers the setup and verification of Neon PostgreSQL for the TriviaNFT application.

## Overview

Neon is a serverless PostgreSQL database that provides:
- Native Vercel integration
- Database branching for preview environments
- Connection pooling for serverless functions
- Automatic scaling and backups

## Prerequisites

- Neon account (sign up at https://neon.tech)
- Node.js and pnpm installed
- Access to the TriviaNFT repository

## Setup Steps

### 1. Create Neon Project and Database

1. **Sign up for Neon**:
   - Go to https://neon.tech
   - Sign up with GitHub or email
   - Verify your email address

2. **Create a new project**:
   - Click "Create Project"
   - Choose a project name (e.g., "trivia-nft")
   - Select a region (choose closest to your users)
   - Select PostgreSQL version (14 or higher recommended)
   - Click "Create Project"

3. **Get connection strings**:
   - After project creation, you'll see the connection details
   - Copy the **Pooled connection** string (for serverless functions)
   - Copy the **Direct connection** string (for migrations)
   - Format: `postgresql://user:password@host/database?sslmode=require`

### 2. Configure Environment Variables

Update your environment files with the Neon connection strings:

**For local development** (`services/api/.env.local`):
```bash
# Neon PostgreSQL (pooled connection for serverless)
DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require

# Neon PostgreSQL (direct connection for migrations)
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

**For production** (Vercel environment variables):
- Go to your Vercel project settings
- Navigate to "Environment Variables"
- Add `DATABASE_URL` with the pooled connection string
- Add `DATABASE_URL_UNPOOLED` with the direct connection string
- Set for Production, Preview, and Development environments

### 3. Configure Connection Pooling

The application is already configured to use connection pooling through the `getPool()` function in `src/db/connection.ts`.

Current configuration:
- **Max connections**: 20 per instance
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds
- **Statement timeout**: 30 seconds
- **SSL**: Required (automatically configured)

These settings are optimized for serverless environments and Neon's pooler.

### 4. Run Database Migrations

Run all existing migrations to set up the database schema:

```bash
cd services/api

# Run migrations (uses DATABASE_URL from .env.local)
pnpm migrate:up

# Verify migrations were successful
pnpm verify:neon
```

The migration tool will:
- Create the `pgmigrations` table to track migrations
- Run all migration files in order
- Create all tables, indexes, and constraints
- Set up triggers and functions

### 5. Verify Setup

Run the verification script to ensure everything is configured correctly:

```bash
cd services/api
pnpm verify:neon
```

The verification script checks:
- ✅ Database connection is working
- ✅ SSL/TLS connection is established
- ✅ Connection pooling is configured
- ✅ Database schema is correct
- ✅ Neon-specific features are available
- ✅ Query performance is acceptable

Expected output:
```
🚀 Starting Neon PostgreSQL Setup Verification
============================================================

📡 Step 1: Verifying database connection...
✅ Database connection successful

🔒 Step 2: Verifying SSL/TLS connection...
✅ SSL/TLS connection verified
   Version: TLSv1.3
   Cipher: TLS_AES_256_GCM_SHA384

🏊 Step 3: Verifying connection pooling...
✅ Connection pooling verified
   Max connections: 20
   Idle timeout: 30000ms
   Connection timeout: 10000ms

📋 Step 4: Verifying database schema...
✅ Database schema verified
   Migrations run: 15
   Tables found: 12

🌟 Step 5: Verifying Neon-specific features...
✅ Neon features verified
   Is Neon: Yes
   PostgreSQL version: PostgreSQL 16.x

⚡ Step 6: Testing query performance...
✅ Query performance tested
   Simple query: 15ms
   Complex query: 25ms

============================================================
📊 VERIFICATION SUMMARY
============================================================
Results: 6/6 checks passed

🎉 All verification checks passed!
✅ Neon PostgreSQL is properly configured and ready to use.
```

### 6. Test Database Connection from Local Environment

Test the connection by running a simple query:

```bash
cd services/api

# Start the dev server (includes database connection)
pnpm dev

# Or run a simple test
node -e "import('./src/db/connection.js').then(db => db.healthCheck().then(h => console.log('Health:', h)))"
```

## Connection Pooling Details

### Why Connection Pooling?

Serverless functions create new connections frequently. Without pooling:
- Each request creates a new database connection
- Connection overhead adds latency
- Database can hit connection limits

With Neon's pooler:
- Connections are reused across requests
- Lower latency (no connection overhead)
- Better resource utilization
- Automatic connection management

### Pooled vs Direct Connection

**Pooled Connection** (use for application code):
- Format: `postgresql://user:pass@host-pooler.region.aws.neon.tech/db`
- Routes through Neon's connection pooler
- Optimized for serverless functions
- Use for: API routes, serverless functions, application queries

**Direct Connection** (use for migrations):
- Format: `postgresql://user:pass@host.region.aws.neon.tech/db`
- Direct connection to PostgreSQL
- Required for: Migrations, schema changes, admin operations
- Use for: `node-pg-migrate`, database setup scripts

### Connection Pool Configuration

The pool is configured in `src/db/connection.ts`:

```typescript
poolInstance = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  ssl: { rejectUnauthorized: false },
  max: 20,                      // Maximum connections per instance
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if can't get connection
  statement_timeout: 30000,     // Query timeout (30s)
});
```

## Database Schema

The application uses the following main tables:

- **players**: User accounts (wallet-connected or guest)
- **categories**: Trivia categories
- **questions**: Trivia questions
- **sessions**: Completed game sessions
- **eligibilities**: Time-limited NFT minting rights
- **nft_catalog**: Available NFTs for minting
- **player_nfts**: NFTs owned by players
- **mints**: NFT minting operations
- **forge_operations**: NFT forging operations

All tables are created through migrations in `services/api/migrations/`.

## Troubleshooting

### Connection Errors

**Error**: `Connection timeout`
- Check that DATABASE_URL is correct
- Verify Neon project is active (not paused)
- Check network connectivity
- Verify SSL is enabled (`sslmode=require`)

**Error**: `Too many connections`
- Reduce `max` pool size in connection.ts
- Check for connection leaks (always release clients)
- Consider upgrading Neon plan for more connections

**Error**: `SSL connection required`
- Ensure connection string includes `?sslmode=require`
- Verify SSL configuration in connection.ts

### Migration Errors

**Error**: `relation already exists`
- Migrations may have been partially run
- Check `pgmigrations` table for completed migrations
- Use `pnpm migrate:down` to rollback if needed

**Error**: `permission denied`
- Ensure you're using the correct database user
- Verify user has CREATE, ALTER, DROP permissions
- Check Neon project settings for user roles

### Performance Issues

**Slow queries**:
- Check query execution plans with `EXPLAIN ANALYZE`
- Verify indexes are created (check migrations)
- Monitor slow query logs in application
- Consider adding indexes for frequently queried columns

**High latency**:
- Verify you're using the pooled connection
- Check Neon region matches your application region
- Monitor connection pool stats with `getStats()`
- Consider using Neon's edge caching features

## Neon-Specific Features

### Database Branching

Neon supports database branching for preview environments:

1. **Automatic branching with Vercel**:
   - When you push to a Git branch, Vercel creates a preview deployment
   - Neon automatically creates a database branch
   - Each preview has its own isolated database

2. **Manual branching**:
   ```bash
   # Create a branch from main
   neon branches create --name feature-branch --parent main
   
   # Get connection string for branch
   neon connection-string feature-branch
   ```

### Autoscaling

Neon automatically scales compute resources based on load:
- Scales up during high traffic
- Scales down during low traffic
- Pauses after inactivity (free tier)
- No configuration needed

### Point-in-Time Recovery

Neon provides automatic backups:
- Continuous backup of all changes
- Restore to any point in time
- Available in Neon dashboard
- Retention period depends on plan

## Best Practices

1. **Always use pooled connections** for application code
2. **Use direct connections** only for migrations and admin tasks
3. **Set appropriate timeouts** to prevent hanging connections
4. **Monitor connection pool stats** to detect leaks
5. **Use transactions** for multi-step operations
6. **Handle connection errors** gracefully with retries
7. **Log slow queries** for performance monitoring
8. **Use prepared statements** to prevent SQL injection
9. **Close connections** when shutting down (Lambda lifecycle)
10. **Test locally** before deploying to production

## Migration to Neon Checklist

- [x] Create Neon project and database
- [x] Configure connection pooling
- [x] Update environment variables
- [x] Run all migrations
- [x] Verify database connection
- [x] Test SSL/TLS connection
- [x] Verify schema is correct
- [x] Test query performance
- [ ] Update Vercel environment variables
- [ ] Test preview deployments
- [ ] Migrate production data (if applicable)
- [ ] Monitor production performance

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon + Vercel Integration](https://neon.tech/docs/guides/vercel)
- [Connection Pooling Guide](https://neon.tech/docs/connect/connection-pooling)
- [Database Branching](https://neon.tech/docs/introduction/branching)
- [PostgreSQL Best Practices](https://neon.tech/docs/postgres/postgres-best-practices)

## Support

For issues with:
- **Neon**: Contact Neon support or check their Discord
- **Application**: Create an issue in the repository
- **Migrations**: Check migration logs and database state
