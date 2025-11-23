# Project Scripts

All utility scripts for the TriviaNFT project are consolidated in this directory.

## Available Scripts

### Database & Seeding

- **`setup-local-db.sh`** - Sets up local PostgreSQL database for development
- **`generate-nft-assets.ts`** - Generates NFT artwork (SVG) and metadata (JSON) files
- **`seed-nft-catalog.ts`** - Populates the nft_catalog table with NFT records
- **`seed-questions.ts`** - Generates trivia questions using AWS Bedrock

### Deployment

- **`deploy-vercel.sh`** - Deploys web app to Vercel (bash)
- **`deploy-vercel.ps1`** - Deploys web app to Vercel (PowerShell)
- **`build-layer.sh`** - Builds Lambda layer with Node.js dependencies

### Asset Management

- **`upload-nft-images.ts`** - Uploads NFT images to S3
- **`upload-nft-images-fixed.ts`** - Fixed version of NFT image uploader
- **`generate-icons.js`** - Generates app icons for web/mobile

### Testing & Performance

- **`measure-performance.js`** - Measures landing page performance metrics (FCP, TTI, LCP)

### Production Monitoring & Verification

- **`monitor-production-health.ts`** - Monitors production deployment health (single check or continuous)
- **`test-database-connectivity.ts`** - Tests database connection and query execution
- **`test-redis-connectivity.ts`** - Tests Redis connection and operations
- **`test-inngest-integration.ts`** - Tests Inngest integration and workflow registration
- **`verify-production-env.ts`** - Verifies all production environment variables are set
- **`verify-preview-deployment.ts`** - Verifies preview deployment configuration
- **`test-preview-deployment.ts`** - Tests preview deployment functionality

### Database Migration

- **`backup-production-database.ts`** - Creates backup of production database
- **`restore-to-neon.ts`** - Restores database backup to Neon
- **`run-migration.js`** - Runs database migrations
- **`run-cleanup.ts`** - Cleans up test data
- **`verify-cleanup.ts`** - Verifies cleanup was successful

## Usage

### From API Service

```bash
cd services/api

# Seed database
pnpm seed:nft-assets
pnpm seed:nft-catalog
pnpm seed:questions
pnpm seed:all  # Runs all seed scripts

# Upload images
pnpm upload-images
```

### From Web App

```bash
cd apps/web

# Measure performance
pnpm measure:performance
```

### From Root

```bash
# Deploy to Vercel
./scripts/deploy-vercel.sh

# Setup local database
./scripts/setup-local-db.sh

# Build Lambda layer
./scripts/build-layer.sh

# Monitor production health
npx tsx scripts/monitor-production-health.ts

# Test database connectivity
npx tsx scripts/test-database-connectivity.ts

# Test Redis connectivity
npx tsx scripts/test-redis-connectivity.ts

# Test Inngest integration
npx tsx scripts/test-inngest-integration.ts

# Verify production environment
npx tsx scripts/verify-production-env.ts

# Backup production database
npx tsx scripts/backup-production-database.ts

# Restore to Neon
npx tsx scripts/restore-to-neon.ts
```

## Production Monitoring

For detailed monitoring instructions after deployment, see:

- **Quick Start:** `.kiro/specs/vercel-inngest-deployment/MONITORING_QUICK_START.md`
- **Full Guide:** `.kiro/specs/vercel-inngest-deployment/TASK_25_MONITORING_GUIDE.md`
- **Checklist:** `.kiro/specs/vercel-inngest-deployment/TASK_25_MONITORING_CHECKLIST.md`

### Quick Health Check

```bash
# Run single health check
npx tsx scripts/monitor-production-health.ts
# Select mode 1, enter production URL

# Run continuous monitoring
npx tsx scripts/monitor-production-health.ts
# Select mode 2, enter production URL
```

## Database Migration

For database migration instructions, see:

- **Quick Start:** `scripts/MIGRATION_QUICK_START.md`
- **Full Guide:** `scripts/DATABASE_MIGRATION_GUIDE.md`
- **Overview:** `scripts/README_MIGRATION.md`

## Notes

- All scripts are referenced from package.json files using relative paths
- Scripts are development/operations tools and are NOT included in production builds
- The `src/` folders contain application code; scripts are kept separate
- Monitoring scripts require production environment variables to be set
