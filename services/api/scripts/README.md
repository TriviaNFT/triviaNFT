# API Scripts

This directory contains utility scripts for database setup, seeding, and maintenance.

## Database Setup

### setup-local-db.sh

Sets up a local PostgreSQL database for development.

```bash
./scripts/setup-local-db.sh
```

This script:
- Creates the `trivianft` database
- Creates the `trivia_admin` user
- Grants necessary privileges
- Runs database migrations

## Seed Data Scripts

### Prerequisites

1. Install dependencies:
   ```bash
   cd services/api
   pnpm install
   ```

2. Set up database connection:
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/trivianft"
   ```

### generate-nft-assets.ts

Generates placeholder NFT artwork (SVG) and metadata (JSON) files for all categories.

```bash
pnpm seed:nft-assets
```

**Output:**
- Creates `seed-data/nft-art/{category}/{category}-{1-10}.svg`
- Creates `seed-data/nft-metadata/{category}/{category}-{1-10}.json`
- Generates 10 NFTs per category (90 total)

**What it does:**
- Creates SVG artwork with category-specific colors and designs
- Generates CIP-25 compliant metadata JSON files
- Includes attributes (rarity, type, etc.) for each NFT

**Note:** These are placeholder assets. In production, replace with actual artwork before uploading to S3.

### seed-nft-catalog.ts

Populates the `nft_catalog` table with NFT records.

```bash
DATABASE_URL="postgresql://..." pnpm seed:nft-catalog
```

**What it does:**
- Inserts 10 NFT records per category into the database
- Sets S3 keys for artwork and metadata
- Includes NFT names, descriptions, and attributes
- Skips categories that already have 10+ NFTs

**Requirements:**
- Database must be running and migrated
- Categories must exist in the database

### seed-questions.ts

Generates initial trivia questions using AWS Bedrock (or mock data for development).

```bash
# With AWS credentials configured
AWS_PROFILE=your-profile DATABASE_URL="postgresql://..." pnpm seed:questions

# Or for local development (uses mock data)
DATABASE_URL="postgresql://..." pnpm seed:questions
```

**What it does:**
- Generates 100 questions per category (900 total)
- Uses AWS Bedrock Claude model for question generation
- Falls back to mock questions if Bedrock is unavailable
- Calculates SHA256 hash for deduplication
- Inserts questions into the database

**Options:**
- Set `BEDROCK_ENABLED=false` to force mock data
- Set `QUESTIONS_PER_CATEGORY=50` to generate fewer questions

### Seed All Data

Run all seed scripts in sequence:

```bash
DATABASE_URL="postgresql://..." pnpm seed:all
```

This runs:
1. `seed:nft-assets` - Generate artwork and metadata
2. `seed:nft-catalog` - Populate NFT catalog table
3. `seed:questions` - Generate trivia questions

## Uploading Assets to S3

After generating assets locally, upload them to S3:

```bash
# Upload NFT artwork
aws s3 sync seed-data/nft-art/ s3://your-bucket/nft-art/ \
  --acl private \
  --content-type image/svg+xml

# Upload NFT metadata
aws s3 sync seed-data/nft-metadata/ s3://your-bucket/nft-metadata/ \
  --acl private \
  --content-type application/json
```

**Note:** Update the `s3_art_key` and `s3_meta_key` in the database if using different paths.

## Build Lambda Layer

### build-layer.sh

Builds a Lambda layer with Node.js dependencies.

```bash
./scripts/build-layer.sh
```

This creates a Lambda layer ZIP file with all production dependencies.

## Troubleshooting

### Database Connection Issues

If you get connection errors:

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check DATABASE_URL format:
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://user:password@host:port/database
   ```

3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Bedrock Access Issues

If question generation fails:

1. Verify AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

2. Check Bedrock model access:
   ```bash
   aws bedrock list-foundation-models --region us-east-1
   ```

3. Use mock data for development:
   ```bash
   BEDROCK_ENABLED=false pnpm seed:questions
   ```

### Seed Script Errors

If seed scripts fail:

1. Check database schema is up to date:
   ```bash
   pnpm migrate:up
   ```

2. Verify categories exist:
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM categories"
   ```

3. Check for duplicate data:
   ```bash
   psql $DATABASE_URL -c "SELECT category_id, COUNT(*) FROM nft_catalog GROUP BY category_id"
   ```

## Development Workflow

1. **Initial Setup:**
   ```bash
   ./scripts/setup-local-db.sh
   pnpm seed:all
   ```

2. **Reset Database:**
   ```bash
   dropdb trivianft
   ./scripts/setup-local-db.sh
   pnpm seed:all
   ```

3. **Update Seed Data:**
   ```bash
   # Regenerate assets
   pnpm seed:nft-assets
   
   # Update database
   psql $DATABASE_URL -c "TRUNCATE nft_catalog CASCADE"
   pnpm seed:nft-catalog
   ```

## Production Deployment

For production deployment:

1. **Generate Production Assets:**
   - Replace placeholder SVGs with actual artwork
   - Update metadata with final descriptions
   - Ensure all images are optimized

2. **Upload to S3:**
   ```bash
   aws s3 sync seed-data/nft-art/ s3://prod-bucket/nft-art/
   aws s3 sync seed-data/nft-metadata/ s3://prod-bucket/nft-metadata/
   ```

3. **Run Seed Scripts:**
   ```bash
   # Via Lambda or direct connection to RDS
   DATABASE_URL="postgresql://..." pnpm seed:nft-catalog
   DATABASE_URL="postgresql://..." pnpm seed:questions
   ```

4. **Verify Data:**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM nft_catalog"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM questions"
   ```

## Notes

- **Categories:** Already seeded in the initial migration (1_initial-schema.sql)
- **Season:** Initial season (Winter Season 1) is created in the migration
- **NFT Catalog:** Must be seeded before minting can occur
- **Questions:** Should have at least 100 per category for proper gameplay
- **Idempotency:** All seed scripts check for existing data and skip if present

