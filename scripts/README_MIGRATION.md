# Database Migration Scripts

This directory contains scripts for migrating your production database to Neon PostgreSQL.

## Quick Links

- **[Quick Start Guide](./MIGRATION_QUICK_START.md)** - Essential commands and quick reference
- **[Complete Migration Guide](./DATABASE_MIGRATION_GUIDE.md)** - Comprehensive documentation

## Available Scripts

### 1. Backup Production Database

**Script**: `backup-production-database.ts`

Creates a full backup of your current production database with integrity verification.

```bash
cd services/api
pnpm backup:database
```

**What it does:**
- Connects to your production database
- Creates timestamped SQL backup file
- Calculates SHA-256 checksum
- Verifies backup integrity
- Saves metadata with row counts
- Generates detailed report

**Output:**
- `backups/backup-TIMESTAMP.sql` - Full database backup
- `backups/backup-TIMESTAMP.json` - Metadata and checksums

### 2. Restore to Neon

**Script**: `restore-to-neon.ts`

Restores a backup to Neon PostgreSQL with comprehensive verification.

```bash
cd services/api
pnpm restore:database

# Or specify a specific backup
pnpm restore:database backup-2024-01-15T10-30-00-000Z.sql
```

**What it does:**
- Verifies backup file integrity
- Restores to Neon database
- Compares row counts
- Tests critical queries
- Verifies extensions
- Generates detailed report

## Prerequisites

### Required Tools

Install PostgreSQL client tools:

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Environment Variables

```bash
# For backup (source database)
export DATABASE_URL="postgresql://user:pass@host:port/database"

# For restore (Neon target)
export NEON_DATABASE_URL="postgresql://user:pass@neon-host/database"
```

## Migration Workflow

### Step 1: Backup

```bash
# Set source database
export DATABASE_URL="postgresql://user:pass@current-host/db"

# Create backup
cd services/api
pnpm backup:database

# Verify backup files
ls -lh backups/
```

### Step 2: Store Securely

```bash
# Upload to S3 (recommended)
aws s3 cp backups/backup-*.sql s3://your-bucket/
aws s3 cp backups/backup-*.json s3://your-bucket/

# Or copy to external drive
cp backups/backup-* /path/to/secure/location/
```

### Step 3: Test Restore

```bash
# IMPORTANT: Test on non-production database first!
export NEON_DATABASE_URL="postgresql://user:pass@test-neon/db"

# Restore
cd services/api
pnpm restore:database

# Review report and verify
```

### Step 4: Production Restore

```bash
# Set production Neon database
export NEON_DATABASE_URL="postgresql://user:pass@prod-neon/db"

# Restore
cd services/api
pnpm restore:database

# Review report and verify
```

## What Gets Migrated

✅ **Data**
- All table data
- Sequences and their current values

✅ **Schema**
- Table structures
- Column definitions
- Data types (including JSONB)

✅ **Constraints**
- Primary keys
- Foreign keys
- Unique constraints
- Check constraints

✅ **Indexes**
- All indexes (except primary key indexes)
- Partial indexes
- Expression indexes

✅ **Database Objects**
- Triggers
- Functions
- Views (if any)

✅ **Extensions**
- uuid-ossp
- pg_stat_statements (if available)

## Verification

The restore script automatically verifies:

1. **Checksum**: Ensures backup file wasn't corrupted
2. **Row Counts**: Compares original vs restored for all tables
3. **Extensions**: Verifies required extensions are installed
4. **Critical Queries**: Tests 8 different query patterns:
   - Simple queries
   - Joins across tables
   - JSONB operations
   - Aggregations
   - Foreign key relationships

## Troubleshooting

### Command not found: pg_dump or psql

**Solution**: Install PostgreSQL client tools (see Prerequisites)

### Connection failed

**Solution**: 
- Verify DATABASE_URL or NEON_DATABASE_URL is set correctly
- Check database is accessible from your machine
- Verify SSL settings if required

### Checksum mismatch

**Solution**:
- Backup file may be corrupted
- Re-run backup process
- Verify file wasn't modified

### Row count mismatch

**Solution**:
- Review restore logs for specific errors
- Check if all tables were restored
- Verify backup was complete

## Safety Checklist

Before migrating to production:

- [ ] PostgreSQL client tools installed
- [ ] Environment variables configured
- [ ] Backup created successfully
- [ ] Backup stored in secure location
- [ ] Test restore completed successfully
- [ ] Test database verified with application
- [ ] Team notified of migration
- [ ] Maintenance window scheduled
- [ ] Rollback plan prepared

## Support

For detailed documentation, see:
- [Complete Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [Quick Start Guide](./MIGRATION_QUICK_START.md)

For Neon-specific questions:
- [Neon Documentation](https://neon.tech/docs)
- [Neon Support](https://neon.tech/docs/introduction/support)
