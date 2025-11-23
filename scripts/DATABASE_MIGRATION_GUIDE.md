# Database Migration Guide

This guide covers the complete process of backing up your current production database and restoring it to Neon PostgreSQL.

## Overview

The migration process consists of two main steps:

1. **Backup**: Create a full backup of your current production database
2. **Restore**: Restore the backup to your Neon production database

## Prerequisites

### Required Tools

- **PostgreSQL Client Tools**: `pg_dump` and `psql` must be installed
  - macOS: `brew install postgresql`
  - Ubuntu/Debian: `apt-get install postgresql-client`
  - Windows: Download from [PostgreSQL website](https://www.postgresql.org/download/windows/)

### Required Environment Variables

For **backup** (source database):
```bash
DATABASE_URL=postgresql://user:pass@host:port/database
# OR
DATABASE_URL_UNPOOLED=postgresql://user:pass@host:port/database
```

For **restore** (Neon target database):
```bash
NEON_DATABASE_URL=postgresql://user:pass@neon-host/database
# OR use DATABASE_URL/DATABASE_URL_UNPOOLED if already pointing to Neon
```

## Step 1: Backup Current Production Database

### Run Backup Script

```bash
# Using npm
npm run backup:database

# Using pnpm
pnpm backup:database

# Using tsx directly
tsx scripts/backup-production-database.ts
```

### What the Backup Script Does

1. ✅ Connects to your current production database
2. ✅ Collects table information and row counts
3. ✅ Creates a timestamped SQL backup file using `pg_dump`
4. ✅ Calculates SHA-256 checksum for integrity verification
5. ✅ Verifies backup file structure and completeness
6. ✅ Saves metadata (tables, row counts, checksum) to JSON file
7. ✅ Generates detailed backup report

### Backup Output

The script creates two files in the `backups/` directory:

```
backups/
├── backup-2024-01-15T10-30-00-000Z.sql      # SQL backup file
└── backup-2024-01-15T10-30-00-000Z.json     # Metadata file
```

### Backup Report Example

```
================================================================================
📋 BACKUP REPORT
================================================================================

📦 Backup Details:
   Timestamp: 2024-01-15T10:30:00.000Z
   Filename: backup-2024-01-15T10-30-00-000Z.sql
   Size: 45.23 MB
   Checksum: a1b2c3d4e5f6...
   Location: /path/to/project/backups

🗄️  Database Info:
   Connection: postgresql://user:****@host:5432/database
   Tables: 13

📊 Row Counts:
   Total rows: 125,432

   Top tables by row count:
   - sessions: 45,231 rows
   - questions: 25,000 rows
   - players: 15,432 rows
   - player_nfts: 12,345 rows
   - eligibilities: 8,901 rows

================================================================================
✅ BACKUP COMPLETED SUCCESSFULLY

📝 Next Steps:
   1. Verify backup file exists and is readable
   2. Store backup in secure location (S3, external drive, etc.)
   3. Test restore process in non-production environment
   4. Keep metadata file: backup-2024-01-15T10-30-00-000Z.json
================================================================================
```

### Verify Backup

After backup completes, verify the files:

```bash
# Check backup file exists
ls -lh backups/backup-*.sql

# Check metadata file exists
ls -lh backups/backup-*.json

# View metadata
cat backups/backup-*.json | jq
```

### Store Backup Securely

**Important**: Store the backup in a secure location before proceeding!

Options:
- Upload to S3/cloud storage
- Copy to external drive
- Store in secure backup service

```bash
# Example: Upload to S3
aws s3 cp backups/backup-*.sql s3://your-backup-bucket/
aws s3 cp backups/backup-*.json s3://your-backup-bucket/

# Example: Copy to external drive
cp backups/backup-* /Volumes/BackupDrive/database-backups/
```

## Step 2: Restore to Neon Production Database

### Important: Test First!

**⚠️ WARNING**: Always test the restore process on a non-production Neon database first!

Create a test Neon database:
1. Go to Neon console
2. Create a new project/database for testing
3. Use that connection string for initial restore testing

### Run Restore Script

```bash
# Using npm (uses most recent backup)
npm run restore:database

# Using pnpm (uses most recent backup)
pnpm restore:database

# Using tsx directly (uses most recent backup)
tsx scripts/restore-to-neon.ts

# Specify a specific backup file
tsx scripts/restore-to-neon.ts backup-2024-01-15T10-30-00-000Z.sql
```

### What the Restore Script Does

1. ✅ Initializes connection to Neon database
2. ✅ Lists available backup files (uses most recent if not specified)
3. ✅ Loads backup metadata
4. ✅ Verifies backup file integrity (checksum validation)
5. ✅ Restores backup to Neon using `psql`
6. ✅ Collects restored table information and row counts
7. ✅ Compares row counts between original and restored database
8. ✅ Verifies PostgreSQL extensions are installed
9. ✅ Tests critical queries to ensure data integrity
10. ✅ Generates detailed restore report

### Restore Report Example

```
================================================================================
📋 RESTORE REPORT
================================================================================

📦 Backup Details:
   Filename: backup-2024-01-15T10-30-00-000Z.sql
   Original timestamp: 2024-01-15T10:30:00.000Z
   Original size: 45.23 MB
   Original tables: 13

🗄️  Restore Results:
   Tables restored: 13
   Critical queries: PASSED
   Row count matches: 13/13

================================================================================
✅ RESTORE COMPLETED SUCCESSFULLY

📝 Next Steps:
   1. Verify application functionality with restored database
   2. Run integration tests
   3. Check application logs for any issues
   4. Monitor database performance
================================================================================
```

### Critical Queries Tested

The restore script automatically tests these critical queries:

1. ✅ Players table query
2. ✅ Sessions with player join
3. ✅ Eligibilities with expiration check
4. ✅ NFT catalog query
5. ✅ Player NFTs with category join
6. ✅ Forge operations query
7. ✅ JSONB query on sessions
8. ✅ Leaderboard aggregation

## Troubleshooting

### Backup Issues

**Error: `pg_dump: command not found`**
- Install PostgreSQL client tools (see Prerequisites)

**Error: `Connection failed`**
- Verify DATABASE_URL is set correctly
- Check database is accessible from your machine
- Verify SSL settings if required

**Error: `Permission denied`**
- Ensure database user has read permissions
- Check file system permissions for backups directory

### Restore Issues

**Error: `psql: command not found`**
- Install PostgreSQL client tools (see Prerequisites)

**Error: `Checksum mismatch`**
- Backup file may be corrupted
- Re-run backup process
- Verify file wasn't modified

**Error: `Row count mismatch`**
- Some data may not have been restored
- Check restore logs for specific errors
- Verify backup was complete

**Warning: `Some errors occurred during restore`**
- Review specific errors in output
- Many errors like "already exists" are non-critical
- Focus on errors that affect data integrity

## Best Practices

### Before Migration

1. ✅ Test the entire process on a non-production database first
2. ✅ Notify team members about the migration
3. ✅ Schedule migration during low-traffic period
4. ✅ Have rollback plan ready
5. ✅ Backup current Neon database (if any data exists)

### During Migration

1. ✅ Monitor backup progress
2. ✅ Verify backup files are created successfully
3. ✅ Store backups securely before proceeding
4. ✅ Monitor restore progress
5. ✅ Review all warnings and errors

### After Migration

1. ✅ Run application integration tests
2. ✅ Verify critical user flows work
3. ✅ Monitor application logs for database errors
4. ✅ Check database performance metrics
5. ✅ Keep backup files for at least 30 days

## Migration Checklist

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] PostgreSQL client tools installed
- [ ] Environment variables configured
- [ ] Test database created in Neon
- [ ] Team notified of migration
- [ ] Maintenance window scheduled

### Backup Phase
- [ ] Backup script executed successfully
- [ ] Backup files created (SQL + JSON)
- [ ] Backup integrity verified
- [ ] Backup stored in secure location
- [ ] Backup metadata reviewed

### Test Restore Phase
- [ ] Test Neon database created
- [ ] Restore script executed on test database
- [ ] Row counts verified
- [ ] Critical queries tested
- [ ] Application tested with test database

### Production Restore Phase
- [ ] Production Neon database ready
- [ ] Restore script executed on production
- [ ] Row counts verified
- [ ] Critical queries tested
- [ ] Extensions verified

### Post-Migration
- [ ] Application deployed with new connection string
- [ ] Integration tests passed
- [ ] User flows verified
- [ ] Performance monitoring enabled
- [ ] Backup files archived

## Support

If you encounter issues during migration:

1. Review the error messages in the script output
2. Check the troubleshooting section above
3. Verify all prerequisites are met
4. Test on a non-production database first
5. Consult Neon documentation: https://neon.tech/docs

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql Documentation](https://www.postgresql.org/docs/current/app-psql.html)
