# Database Migration Quick Start

Quick reference for backing up and restoring your database to Neon.

## Prerequisites

```bash
# Install PostgreSQL client tools
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

## Environment Variables

```bash
# For backup (source database)
export DATABASE_URL="postgresql://user:pass@host:port/database"

# For restore (Neon target)
export NEON_DATABASE_URL="postgresql://user:pass@neon-host/database"
```

## Quick Commands

### 1. Backup Current Database

```bash
cd services/api
pnpm backup:database
```

**Output**: Creates `backups/backup-TIMESTAMP.sql` and `backups/backup-TIMESTAMP.json`

### 2. Verify Backup

```bash
# Check files exist
ls -lh backups/

# View metadata
cat backups/backup-*.json | jq
```

### 3. Store Backup Securely

```bash
# Example: Upload to S3
aws s3 cp backups/backup-*.sql s3://your-bucket/
aws s3 cp backups/backup-*.json s3://your-bucket/
```

### 4. Restore to Neon (Test First!)

```bash
# Test on non-production database first!
export NEON_DATABASE_URL="postgresql://user:pass@test-neon-host/database"
cd services/api
pnpm restore:database

# Or specify a specific backup
pnpm restore:database backup-2024-01-15T10-30-00-000Z.sql
```

### 5. Verify Restore

The restore script automatically:
- ✅ Verifies checksum
- ✅ Compares row counts
- ✅ Tests critical queries
- ✅ Checks extensions

Review the report at the end of the restore process.

## What Gets Backed Up

- ✅ All tables and data
- ✅ Indexes
- ✅ Constraints (foreign keys, unique, check)
- ✅ Triggers
- ✅ Functions
- ✅ Extensions
- ✅ Sequences

## What to Check After Restore

1. **Row Counts**: Verify all tables have correct number of rows
2. **Critical Queries**: Ensure all test queries pass
3. **Extensions**: Verify uuid-ossp and other extensions are installed
4. **Application**: Test your application with the restored database

## Troubleshooting

### Command not found: pg_dump or psql
Install PostgreSQL client tools (see Prerequisites)

### Connection failed
Check your DATABASE_URL or NEON_DATABASE_URL environment variable

### Checksum mismatch
Backup file may be corrupted - re-run backup

### Row count mismatch
Review restore logs for specific errors

## Safety Tips

1. ⚠️ **Always test restore on non-production database first**
2. ⚠️ **Store backups securely before proceeding**
3. ⚠️ **Schedule migration during low-traffic period**
4. ⚠️ **Have rollback plan ready**
5. ⚠️ **Keep backups for at least 30 days**

## Full Documentation

See [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) for complete documentation.
