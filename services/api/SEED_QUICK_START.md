# Seed Data Quick Start Guide

## TL;DR

```bash
# 1. Setup database
cd services/api
./scripts/setup-local-db.sh

# 2. Install dependencies
pnpm install

# 3. Seed all data
DATABASE_URL="postgresql://trivia_admin:local_dev_password@localhost:5432/trivianft" pnpm seed:all
```

## What Gets Seeded

| Data Type | Count | Source | Notes |
|-----------|-------|--------|-------|
| Categories | 9 | Migration | Already in DB after migration |
| NFT Catalog | 90 (10 per category) | Script | Placeholder artwork |
| Questions | 900 (100 per category) | Script | Bedrock AI or mock |
| Seasons | 1 | Migration | Winter Season 1 (active) |

## Individual Commands

### Generate NFT Assets
```bash
pnpm seed:nft-assets
```
Creates SVG artwork and JSON metadata in `seed-data/` directory.

### Seed NFT Catalog
```bash
DATABASE_URL="postgresql://..." pnpm seed:nft-catalog
```
Populates `nft_catalog` table with 10 NFTs per category.

### Seed Questions
```bash
# With Bedrock AI
AWS_PROFILE=your-profile DATABASE_URL="postgresql://..." pnpm seed:questions

# With mock data (development)
BEDROCK_ENABLED=false DATABASE_URL="postgresql://..." pnpm seed:questions
```
Generates 100 questions per category.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `BEDROCK_ENABLED` | No | `true` | Use AWS Bedrock for questions |
| `QUESTIONS_PER_CATEGORY` | No | `100` | Number of questions to generate |
| `AWS_PROFILE` | No | - | AWS profile for Bedrock access |

## Verification

```bash
# Connect to database
psql "postgresql://trivia_admin:local_dev_password@localhost:5432/trivianft"

# Check data
SELECT 'Categories' as type, COUNT(*) as count FROM categories
UNION ALL
SELECT 'NFT Catalog', COUNT(*) FROM nft_catalog
UNION ALL
SELECT 'Questions', COUNT(*) FROM questions
UNION ALL
SELECT 'Seasons', COUNT(*) FROM seasons WHERE is_active = true;
```

Expected output:
```
    type     | count
-------------+-------
 Categories  |     9
 NFT Catalog |    90
 Questions   |   900
 Seasons     |     1
```

## Troubleshooting

### "DATABASE_URL environment variable is required"
Set the DATABASE_URL:
```bash
export DATABASE_URL="postgresql://trivia_admin:local_dev_password@localhost:5432/trivianft"
```

### "Bedrock generation failed"
Use mock data instead:
```bash
BEDROCK_ENABLED=false pnpm seed:questions
```

### "Already has X NFTs, skipping"
This is normal - scripts are idempotent and skip existing data.

### Reset and Re-seed
```bash
# Drop and recreate database
dropdb trivianft
./scripts/setup-local-db.sh

# Re-run seed scripts
DATABASE_URL="postgresql://..." pnpm seed:all
```

## Production Deployment

1. **Generate production assets** with actual artwork
2. **Upload to S3:**
   ```bash
   aws s3 sync seed-data/nft-art/ s3://prod-bucket/nft-art/
   aws s3 sync seed-data/nft-metadata/ s3://prod-bucket/nft-metadata/
   ```
3. **Run seed scripts** against production database
4. **Verify data** using SQL queries above

## Next Steps

After seeding:
1. ✅ Categories available for session selection
2. ✅ Questions ready for gameplay
3. ✅ NFT catalog ready for minting
4. ✅ Season active for leaderboard

You can now:
- Start a trivia session
- Answer questions
- Earn mint eligibility
- Mint NFTs from catalog

## Documentation

- Full documentation: `services/api/scripts/README.md`
- Implementation summary: `services/api/SEED_DATA_IMPLEMENTATION.md`
- Database schema: `services/api/migrations/1_initial-schema.sql`

