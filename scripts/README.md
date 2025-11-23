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
```

## Notes

- All scripts are referenced from package.json files using relative paths
- Scripts are development/operations tools and are NOT included in production builds
- The `src/` folders contain application code; scripts are kept separate
