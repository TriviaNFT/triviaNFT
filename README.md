# TriviaNFT - Cardano Trivia Game with NFT Rewards

A blockchain-based trivia game built on Cardano where players earn NFTs for perfect scores and can forge higher-tier NFTs.

## 🎮 Features

- **Trivia Sessions**: Play trivia games across multiple categories
- **NFT Rewards**: Earn NFTs for achieving perfect scores
- **NFT Forging**: Combine multiple NFTs to create rarer, higher-tier NFTs
- **Leaderboards**: Compete globally and by category
- **Guest & Wallet Modes**: Play as guest or connect Cardano wallet
- **Daily Limits**: Fair play with session limits and cooldowns

## 🏗️ Architecture

The application is built on Vercel's serverless platform with:

- **Frontend**: Next.js with React Native Web (Expo)
- **Backend**: Vercel Functions (serverless API routes)
- **Database**: Neon PostgreSQL (serverless, with branching)
- **Cache**: Upstash Redis (serverless, edge-optimized)
- **Workflows**: Inngest (NFT minting and forging orchestration)
- **Blockchain**: Cardano (via Blockfrost API)
- **Storage**: AWS S3 or Vercel Blob (NFT assets)

## 📋 Prerequisites

Before deploying, you'll need accounts and credentials for:

- [Vercel](https://vercel.com) - Hosting platform
- [Neon](https://neon.tech) - PostgreSQL database
- [Upstash](https://upstash.com) - Redis cache
- [Inngest](https://inngest.com) - Workflow orchestration
- [Blockfrost](https://blockfrost.io) - Cardano API
- Cardano wallet with seed phrase (for transaction signing)

## 🚀 Quick Start (Local Development)

Get up and running with Vercel Dev in minutes. This ensures your local environment matches production exactly.

### One-Command Setup

```bash
npm i -g vercel && cd apps/web && vercel link && vercel dev
```

This will:
1. Install Vercel CLI globally
2. Navigate to the web app directory
3. Link your local project to Vercel (follow the prompts)
4. Start the development server at http://localhost:3000

**First time?** See [VERCEL_SETUP.md](VERCEL_SETUP.md) for detailed setup instructions including environment variables.

### What You Get

✅ **Production Parity** - Same runtime as production deployment  
✅ **API Routes** - All serverless functions work locally  
✅ **Environment Variables** - Loaded from `.env.local`  
✅ **Inngest Workflows** - NFT minting and forging workflows  
✅ **Hot Reload** - Changes reflected automatically  

### Daily Workflow

```bash
# Start development server
cd apps/web
vercel dev

# Run tests (in another terminal)
pnpm test:e2e        # End-to-end tests
pnpm test:unit       # Unit tests
pnpm verify          # Run all tests
```

**Need faster UI iteration?** You can optionally use `pnpm dev:ui` for Metro/Expo, but always test with Vercel Dev before committing.

---

## 🚀 Deployment Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd trivia-nft
pnpm install
```

### 2. Set Up Services

Follow these guides in order:

1. **[Neon Setup](#neon-postgresql-setup)** - Database configuration
2. **[Upstash Setup](#upstash-redis-setup)** - Redis cache configuration
3. **[Inngest Setup](#inngest-setup)** - Workflow orchestration
4. **[Vercel Setup](#vercel-deployment)** - Deployment platform

### 3. Configure Environment Variables

See [Environment Variables](#environment-variables) section below for complete configuration.

### 4. Deploy

```bash
# Deploy to Vercel
vercel

# Or push to GitHub (automatic deployment)
git push origin main
```

## 🗄️ Neon PostgreSQL Setup

Neon provides serverless PostgreSQL with automatic branching for preview environments.

### Create Neon Project

1. Visit [Neon Console](https://console.neon.tech)
2. Click "New Project"
3. Choose region (closest to your users)
4. Note your project name

### Get Connection Strings

You'll need two connection strings:

**Pooled Connection** (for Vercel Functions):
```
postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require
```

**Direct Connection** (for migrations):
```
postgresql://user:pass@host.neon.tech/db?sslmode=require
```

Find these in: Neon Console → Your Project → Connection Details

### Run Migrations

```bash
cd services/api
pnpm migrate up
```

### Enable Vercel Integration

1. In Neon Console, go to Integrations
2. Connect to Vercel
3. Select your Vercel project
4. Enable automatic database branching

**Result**: Each preview deployment gets its own database branch automatically.

## 🔴 Upstash Redis Setup

Upstash provides serverless Redis with edge caching and REST API.

### Create Upstash Database

1. Visit [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Choose region (closest to your users)
4. Select "Global" for edge caching

### Get Credentials

Find these in: Upstash Console → Your Database → REST API

- **REDIS_URL**: `https://[endpoint].upstash.io`
- **REDIS_TOKEN**: Long alphanumeric token

### Test Connection

```bash
# Test Redis connectivity
npx tsx scripts/test-redis-connectivity.ts
```

## 🔄 Inngest Setup

Inngest orchestrates long-running NFT minting and forging workflows.

### Create Inngest Account

1. Visit [Inngest](https://app.inngest.com)
2. Sign up and create an app
3. Note your app ID

### Get API Keys

Find these in: Inngest Dashboard → Your App → Manage → Keys

- **INNGEST_EVENT_KEY**: For sending events from your API
- **INNGEST_SIGNING_KEY**: For verifying Inngest requests

### Connect to Vercel

1. In Inngest Dashboard, go to Apps → Your App → Manage
2. Click "Sync" to register your functions
3. Add your Vercel deployment URL as webhook endpoint

### Test Locally

```bash
# Start Inngest Dev Server
npx inngest-cli@latest dev

# In another terminal, start your app
cd apps/web
pnpm dev
```

Visit http://localhost:8288 to see Inngest Dev Server UI.

## ☁️ Vercel Deployment

### Connect Repository

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`

### Configure Environment Variables

See [Environment Variables](#environment-variables) section for complete list.

Add variables in: Vercel Dashboard → Your Project → Settings → Environment Variables

### Deploy

**Automatic Deployment**:
- Push to `main` branch → Production deployment
- Push to any branch → Preview deployment

**Manual Deployment**:
```bash
vercel --prod  # Deploy to production
vercel         # Deploy to preview
```

### Verify Deployment

1. Check deployment logs in Vercel Dashboard
2. Visit deployment URL
3. Test API endpoints: `https://[your-url].vercel.app/api/health`
4. Check Inngest functions registered: `https://[your-url].vercel.app/api/inngest`

## 🔐 Environment Variables

### Required Variables (16)

#### Database (2)

```bash
# Neon pooled connection (for Vercel Functions)
DATABASE_URL=postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require

# Neon direct connection (for migrations)
DATABASE_URL_UNPOOLED=postgresql://user:pass@host.neon.tech/db?sslmode=require
```

#### Redis (2)

```bash
# Upstash REST API endpoint
REDIS_URL=https://[endpoint].upstash.io

# Upstash REST API token
REDIS_TOKEN=AXlzASQgNzk4YjQ5YTktMGVhZC00NzE5LWI4ZjYtOTM0ZDQ5ZjI1YmU0abc123
```

#### Inngest (2)

```bash
# Event key (for sending events)
INNGEST_EVENT_KEY=DhWVJWVkE-OFHZVAcenzQ5z8PQW64it3cv5FXAk4SmrwNE7cQy2z_RCyqtccdMFQ

# Signing key (for verifying requests)
INNGEST_SIGNING_KEY=signkey-prod-166eac79aab9e423896aae0727d89d1c4e63ed57
```

#### Blockchain (7)

```bash
# Blockfrost API key
BLOCKFROST_PROJECT_ID=preprodWAuGSqaryUNPRLQw5NmFbL9YgTduoG5y  # testnet
# BLOCKFROST_PROJECT_ID=mainnetXYZ789ABC123DEF456GHI789JKL012  # production

# Blockfrost IPFS project ID
BLOCKFROST_IPFS_PROJECT_ID=ipfse4BtZvIZjMY0Dxsfv9kbiFSmsmuxNBVx

# Network: preprod (testnet) or mainnet (production)
CARDANO_NETWORK=preprod

# NFT policy ID (56-character hex string)
NFT_POLICY_ID=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

# Payment address (must have ADA for fees)
PAYMENT_ADDRESS=addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk

# Wallet seed phrase (24 words) - KEEP SECRET!
WALLET_SEED_PHRASE=word1 word2 word3 ... word24

# Royalty configuration (CIP-27)
ROYALTY_ADDRESS=addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk
ROYALTY_RATE=0.025  # 2.5%
```

#### Authentication (2)

```bash
# JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=Xk7mp9Qw2Rt5Yh8Nj3Lp6Vb4Zx1Cd0Fg9Hk2Mn5Pq8Rs

# JWT issuer (your app identifier)
JWT_ISSUER=trivia-nft
```

#### Optional: AWS S3 (3)

If using S3 for NFT asset storage:

```bash
S3_BUCKET=trivia-nft-assets
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Environment-Specific Configuration

**Development** (local):
- Use testnet credentials
- Can use local PostgreSQL/Redis or cloud services
- Inngest Dev Server (no keys needed)

**Preview** (Git branches):
- Use testnet credentials
- Automatic Neon database branching
- Automatic Inngest sandbox environments

**Production** (main branch):
- Use mainnet credentials
- Production database and services
- Different secrets from development

### Security Best Practices

- ✅ Use different secrets for each environment
- ✅ Mark sensitive variables as secret in Vercel
- ✅ Never commit secrets to Git
- ✅ Use testnet for development/preview
- ✅ Rotate secrets every 90 days
- ⚠️ **WALLET_SEED_PHRASE** is the most sensitive - protect it!

## 🧪 Testing

### Run Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Run E2E Tests

E2E tests automatically use Vercel Dev for production-like testing:

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run E2E tests (automatically starts Vercel Dev)
cd apps/web
pnpm test:e2e

# Run in UI mode
pnpm test:e2e:ui

# Run all tests (unit + E2E)
pnpm verify
```

**Note:** E2E tests will start Vercel Dev automatically if it's not already running. For faster iteration, start Vercel Dev manually in one terminal and run tests in another.

### Test Workflows Locally

```bash
# Terminal 1: Start Inngest Dev Server
npx inngest-cli@latest dev

# Terminal 2: Start Vercel Dev
cd apps/web
vercel dev

# Terminal 3: Trigger test workflows
npx tsx inngest/test-workflows.ts
```

Visit http://localhost:8288 to see workflow execution in Inngest Dev Server.

## 📊 Monitoring

### Vercel Analytics

Monitor in Vercel Dashboard:
- Deployment logs
- Function execution logs
- Error rates
- Response times

### Neon Monitoring

Monitor in Neon Console:
- Query performance
- Connection pool usage
- Database size
- Active queries

### Upstash Monitoring

Monitor in Upstash Console:
- Request count
- Cache hit rate
- Memory usage
- Latency

### Inngest Monitoring

Monitor in Inngest Dashboard:
- Workflow execution status
- Step-by-step execution logs
- Retry attempts
- Error rates

### Health Check

```bash
# Check API health
curl https://[your-url].vercel.app/api/health

# Test database connectivity
npx tsx scripts/test-database-connectivity.ts

# Test Redis connectivity
npx tsx scripts/test-redis-connectivity.ts

# Monitor production health
npx tsx scripts/monitor-production-health.ts
```

## 🔧 Development

### Project Structure

```
trivia-nft/
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/             # App router pages
│       │   └── api/         # API routes (Vercel Functions)
│       ├── inngest/         # Inngest workflow functions
│       ├── src/             # React components and utilities
│       └── e2e/             # Playwright E2E tests
├── services/
│   └── api/                 # Shared API services
│       ├── migrations/      # Database migrations
│       └── src/             # Database models and services
├── packages/
│   └── shared/              # Shared utilities and types
└── scripts/                 # Deployment and utility scripts
```

### Local Development with Vercel Dev

**Recommended approach** - ensures production parity:

```bash
# Install dependencies
pnpm install

# Start Vercel Dev (production-like environment)
cd apps/web
vercel dev                   # Starts at http://localhost:3000

# Start Inngest Dev Server (separate terminal)
npx inngest-cli@latest dev   # Starts at http://localhost:8288

# Run database migrations
cd services/api
pnpm migrate up
```

**Alternative for rapid UI iteration:**

```bash
# Use Metro/Expo for faster hot reload (UI work only)
cd apps/web
pnpm dev:ui                  # Starts at http://localhost:8081

# Note: API routes won't work with Metro
# Always test with Vercel Dev before committing
```

See [VERCEL_SETUP.md](VERCEL_SETUP.md) for detailed setup instructions.

### Database Migrations

```bash
# Create new migration
cd services/api
pnpm migrate create <migration-name>

# Run migrations
pnpm migrate up

# Rollback last migration
pnpm migrate down
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## 📚 Documentation

- **[Complete NFT System Guide](COMPLETE_NFT_SYSTEM_GUIDE.md)** - NFT minting and forging
- **[Environment Variables Setup](VERCEL_ENV_SETUP.md)** - Detailed env var configuration
- **[Deployment Guide](.kiro/specs/vercel-inngest-deployment/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment
- **[Requirements](.kiro/specs/vercel-inngest-deployment/requirements.md)** - System requirements
- **[Design](.kiro/specs/vercel-inngest-deployment/design.md)** - Architecture and design decisions

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx tsx scripts/test-database-connectivity.ts

# Check connection string format
# Should include -pooler for Vercel Functions
# Should include ?sslmode=require
```

### Redis Connection Issues

```bash
# Test Redis connection
npx tsx scripts/test-redis-connectivity.ts

# Verify REDIS_URL uses HTTPS (not redis://)
# Verify REDIS_TOKEN is correct
```

### Inngest Workflow Issues

```bash
# Check Inngest endpoint
curl https://[your-url].vercel.app/api/inngest

# Verify signing key is correct
# Check Inngest dashboard for webhook delivery logs
```

### Build Failures

```bash
# Clear build cache
vercel --force

# Check build logs in Vercel Dashboard
# Verify all dependencies are installed
# Check for TypeScript errors
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## 📄 License

[Your License Here]

## 🔗 Links

- **Production**: [Your production URL]
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **Upstash Console**: https://console.upstash.com
- **Inngest Dashboard**: https://app.inngest.com
- **Blockfrost**: https://blockfrost.io

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review Vercel deployment logs
- Check service dashboards (Neon, Upstash, Inngest)
