# Database Migrations

This directory contains SQL migration files for the TriviaNFT database schema.

## Overview

Migrations are managed using a custom migration runner that executes SQL files in order. Each migration is tracked in the `pgmigrations` table to ensure it only runs once.

## Migration Files

- `1_initial-schema.sql` - Initial database schema with all tables, indexes, and constraints

## Running Migrations

### Locally

```bash
# Set database connection string
export DATABASE_URL="postgresql://username:password@localhost:5432/trivianft"

# Run migrations
cd services/api
pnpm migrate:up
```

### During Deployment

Migrations are automatically run during CDK deployment via a Lambda function. The Lambda function:
1. Retrieves database credentials from AWS Secrets Manager
2. Connects to the Aurora cluster
3. Runs any pending migrations
4. Records completed migrations in the `pgmigrations` table

### Manual Execution via Lambda

You can manually trigger the migration Lambda:

```bash
aws lambda invoke \
  --function-name TriviaNFT-MigrationFunction-staging \
  --payload '{"action":"migrate","secretArn":"arn:aws:secretsmanager:..."}' \
  response.json
```

## Creating New Migrations

1. Create a new SQL file with an incremented number:
   ```bash
   touch migrations/2_add_new_feature.sql
   ```

2. Write your migration SQL:
   ```sql
   -- Migration: Add new feature
   -- Description: What this migration does
   
   ALTER TABLE players ADD COLUMN new_field VARCHAR(100);
   CREATE INDEX idx_players_new_field ON players(new_field);
   ```

3. Update `src/db/migrate.ts` to include the new migration file in the `migrationFiles` array

4. Test locally before deploying:
   ```bash
   DATABASE_URL="postgresql://..." pnpm migrate:up
   ```

## Migration Best Practices

1. **Always use transactions**: Each migration runs in a transaction and rolls back on error
2. **Make migrations idempotent**: Use `IF NOT EXISTS` and `IF EXISTS` where possible
3. **Test rollback**: Ensure migrations can be rolled back if needed
4. **Keep migrations small**: One logical change per migration
5. **Document changes**: Include comments explaining what and why
6. **Test with data**: Test migrations on a copy of production data
7. **Avoid data loss**: Never drop columns or tables without backing up data first

## Schema Overview

### Core Tables

- **players** - User accounts (guest and wallet-connected)
- **categories** - Trivia categories
- **questions** - Trivia questions with answers
- **sessions** - Completed game sessions
- **seasons** - Competitive seasons

### NFT Tables

- **nft_catalog** - Pre-generated NFT metadata
- **eligibilities** - Time-limited mint rights
- **mints** - Minting operations
- **player_nfts** - Owned NFTs
- **forge_operations** - Forging operations

### Leaderboard Tables

- **season_points** - Player points per season
- **leaderboard_snapshots** - Daily leaderboard snapshots

### Support Tables

- **question_flags** - Reported question issues
- **pgmigrations** - Migration tracking

## Indexes

The schema includes comprehensive indexes for:
- Foreign key relationships
- Frequently queried columns
- Partial indexes for active/filtered records
- Composite indexes for complex queries

## Constraints

All tables include:
- Primary keys (UUID)
- Foreign key constraints with CASCADE/RESTRICT
- Check constraints for data validation
- Unique constraints for data integrity

## Performance Considerations

- **Partitioning**: Consider partitioning `sessions` and `leaderboard_snapshots` by date for large datasets
- **Materialized Views**: Consider materialized views for complex leaderboard queries
- **Connection Pooling**: Use RDS Proxy for Lambda connection pooling
- **Query Optimization**: Monitor slow queries with `pg_stat_statements`

## Troubleshooting

### Migration Fails

1. Check Lambda logs in CloudWatch
2. Verify database credentials in Secrets Manager
3. Check VPC and security group configuration
4. Verify RDS cluster is available

### Rollback Required

1. Connect to database directly
2. Manually rollback changes
3. Delete migration record from `pgmigrations`
4. Fix migration SQL and re-run

### Connection Issues

1. Verify Lambda is in correct VPC subnets
2. Check security group allows Lambda → RDS traffic
3. Verify RDS Proxy configuration
4. Check database credentials are correct
