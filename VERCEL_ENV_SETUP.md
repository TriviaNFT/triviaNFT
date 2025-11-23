# Vercel Environment Variables Setup Guide

This guide provides step-by-step instructions for configuring all required environment variables in Vercel for the TriviaNFT application migration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup Checklist](#quick-setup-checklist)
3. [Detailed Configuration](#detailed-configuration)
4. [Environment-Specific Values](#environment-specific-values)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before configuring Vercel environment variables, ensure you have:

- ✅ Vercel account and project created
- ✅ Neon PostgreSQL database set up (Task 1 completed)
- ✅ Upstash Redis database set up (Task 2 completed)
- ✅ Inngest account and integration configured (Task 3 completed)
- ✅ Blockfrost API account with project IDs
- ✅ Cardano wallet with seed phrase for transaction signing

## Quick Setup Checklist

Use this checklist to track your progress:

- [ ] Database variables configured (DATABASE_URL, DATABASE_URL_UNPOOLED)
- [ ] Redis variables configured (REDIS_URL, REDIS_TOKEN)
- [ ] Inngest variables configured (INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY)
- [ ] Blockchain variables configured (BLOCKFROST_PROJECT_ID, NFT_POLICY_ID, etc.)
- [ ] Authentication variables configured (JWT_SECRET, JWT_ISSUER)
- [ ] Optional S3 variables configured (if keeping S3)
- [ ] Environment scopes set correctly (Production/Preview/Development)
- [ ] Sensitive variables marked as secret
- [ ] Test deployment triggered to verify configuration

## Detailed Configuration

### 1. Access Vercel Environment Variables

1. Navigate to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Or visit: `https://vercel.com/[your-team]/[your-project]/settings/environment-variables`

### 2. Database Configuration (Neon PostgreSQL)

**Requirement: 5.3**

#### DATABASE_URL (Pooled Connection)

- **Purpose**: Primary database connection for Vercel Functions
- **Source**: Neon Console → Your Project → Connection Details → "Pooled connection"
- **Format**: `postgresql://[user]:[password]@[host]-pooler.neon.tech/[database]?sslmode=require`
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  postgresql://neondb_owner:npg_abc123@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
  ```

**Why pooled?** Vercel Functions are serverless and create many short-lived connections. The pooler manages these efficiently.

#### DATABASE_URL_UNPOOLED (Direct Connection)

- **Purpose**: Direct database access for migrations
- **Source**: Neon Console → Your Project → Connection Details → "Direct connection"
- **Format**: `postgresql://[user]:[password]@[host].neon.tech/[database]?sslmode=require`
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  postgresql://neondb_owner:npg_abc123@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
  ```

**Note**: Remove `-pooler` from the hostname for direct connection.

### 3. Redis Configuration (Upstash Redis)

**Requirement: 5.4**

#### REDIS_URL

- **Purpose**: Upstash Redis REST API endpoint
- **Source**: Upstash Console → Your Database → REST API → "UPSTASH_REDIS_REST_URL"
- **Format**: `https://[endpoint].upstash.io`
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  https://us1-merry-cat-12345.upstash.io
  ```

#### REDIS_TOKEN

- **Purpose**: Authentication token for Upstash REST API
- **Source**: Upstash Console → Your Database → REST API → "UPSTASH_REDIS_REST_TOKEN"
- **Format**: Long alphanumeric string
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  AXlzASQgNzk4YjQ5YTktMGVhZC00NzE5LWI4ZjYtOTM0ZDQ5ZjI1YmU0abc123def456
  ```

### 4. Inngest Configuration

**Requirement: 5.5**

#### INNGEST_EVENT_KEY

- **Purpose**: Authenticate when sending events to Inngest from your API
- **Source**: Inngest Dashboard → Your App → Manage → Keys → "Event Key"
- **Format**: Long alphanumeric string
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  DhWVJWVkE-OFHZVAcenzQ5z8PQW64it3cv5FXAk4SmrwNE7cQy2z_RCyqtccdMFQXKnk1FAe6TrPXW6FT8F6ag
  ```

#### INNGEST_SIGNING_KEY

- **Purpose**: Verify requests from Inngest to your API endpoint
- **Source**: Inngest Dashboard → Your App → Manage → Keys → "Signing Key"
- **Format**: `signkey-prod-[hex-string]`
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  signkey-prod-166eac79aab9e423896aae0727d89d1c4e63ed57515fe5c14ea87d7c9b72b745
  ```

**Important**: Use different keys for Production vs Preview/Development environments.

### 5. Blockchain Configuration (Blockfrost + Cardano)

**Requirement: 5.6**

#### BLOCKFROST_PROJECT_ID

- **Purpose**: Access Cardano blockchain data and submit transactions
- **Source**: Blockfrost Dashboard → Your Project → Project ID
- **Format**: `[network][project-id]` (e.g., `preprodABC123` or `mainnetXYZ789`)
- **Environment Scope**: 
  - Production: Use mainnet project ID
  - Preview/Development: Use preprod project ID
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  preprodWAuGSqaryUNPRLQw5NmFbL9YgTduoG5y  # For testnet
  mainnetXYZ789ABC123DEF456GHI789JKL012  # For production
  ```

#### BLOCKFROST_IPFS_PROJECT_ID

- **Purpose**: Upload NFT images and metadata to IPFS via Blockfrost
- **Source**: Blockfrost Dashboard → IPFS Project → Project ID
- **Format**: `ipfs[project-id]`
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  ipfse4BtZvIZjMY0Dxsfv9kbiFSmsmuxNBVx
  ```

#### CARDANO_NETWORK

- **Purpose**: Specify which Cardano network to use
- **Values**: `preprod` (testnet) or `mainnet` (production)
- **Environment Scope**: 
  - Production: `mainnet`
  - Preview/Development: `preprod`
- **Example**:
  ```
  preprod  # For testing
  mainnet  # For production
  ```

#### NFT_POLICY_ID

- **Purpose**: The Cardano policy ID for your NFT collection
- **Source**: Generated when you create your NFT policy script
- **Format**: 56-character hexadecimal string
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
  ```

**Note**: Use different policy IDs for testnet and mainnet.

#### PAYMENT_ADDRESS

- **Purpose**: Cardano address that pays for transaction fees
- **Source**: Your Cardano wallet (must have sufficient ADA)
- **Format**: 
  - Testnet: `addr_test1[...]`
  - Mainnet: `addr1[...]`
- **Environment Scope**: 
  - Production: Mainnet address
  - Preview/Development: Testnet address
- **Example**:
  ```
  addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk7xttml9m03rmxkj4pm340hwlatfd8ncrrr08tqw9md0y
  ```

**Important**: Ensure this wallet has sufficient ADA for transaction fees.

#### WALLET_SEED_PHRASE

- **Purpose**: 24-word mnemonic for signing transactions
- **Source**: Your Cardano wallet recovery phrase
- **Format**: 24 words separated by spaces
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ⚠️ **CRITICAL** - This is the most sensitive variable!
- **Example**:
  ```
  word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24
  ```

**⚠️ SECURITY WARNING**: 
- Never commit this to Git
- Never share this with anyone
- Use different wallets for testnet and mainnet
- This wallet must be the same one that minted the original NFTs for forging to work

#### ROYALTY_ADDRESS

- **Purpose**: Address to receive NFT royalties when sold on marketplaces (CIP-27)
- **Source**: Your Cardano wallet (can be same as payment address)
- **Format**: Same as PAYMENT_ADDRESS
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk7xttml9m03rmxkj4pm340hwlatfd8ncrrr08tqw9md0y
  ```

#### ROYALTY_RATE

- **Purpose**: Percentage of sale price to receive as royalty
- **Format**: Decimal number (0.025 = 2.5%, 0.05 = 5%, 0.10 = 10%)
- **Environment Scope**: Production, Preview, Development
- **Recommended**: 0.025 (2.5%) to 0.10 (10%)
- **Example**:
  ```
  0.025
  ```

### 6. Authentication Configuration (JWT)

**Requirement: 5.7**

#### JWT_SECRET

- **Purpose**: Secret key for signing and verifying JWT tokens
- **Source**: Generate a strong random string
- **Format**: At least 32 characters, alphanumeric + special characters
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Generation**:
  ```bash
  # Using OpenSSL
  openssl rand -base64 32
  
  # Using Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Example**:
  ```
  Xk7mp9Qw2Rt5Yh8Nj3Lp6Vb4Zx1Cd0Fg9Hk2Mn5Pq8Rs
  ```

**Important**: Use different secrets for Production vs Preview/Development.

#### JWT_ISSUER

- **Purpose**: Identifier for your application in JWT claims
- **Format**: String identifier (typically your app name)
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  trivia-nft
  ```

### 7. AWS S3 Configuration (Optional)

**Requirement: 5.1** (if keeping S3 for asset storage)

If you're keeping S3 for NFT asset storage instead of migrating to Vercel Blob:

#### S3_BUCKET

- **Purpose**: S3 bucket name where NFT assets are stored
- **Source**: AWS S3 Console
- **Format**: Bucket name (lowercase, no special characters)
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  trivia-nft-assets
  ```

#### S3_REGION

- **Purpose**: AWS region where your S3 bucket is located
- **Source**: AWS S3 Console → Bucket Properties
- **Format**: AWS region code
- **Environment Scope**: Production, Preview, Development
- **Example**:
  ```
  us-east-1
  ```

#### AWS_ACCESS_KEY_ID

- **Purpose**: IAM user access key with S3 permissions
- **Source**: AWS IAM Console → Users → Security Credentials
- **Format**: 20-character alphanumeric string
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  AKIAIOSFODNN7EXAMPLE
  ```

#### AWS_SECRET_ACCESS_KEY

- **Purpose**: IAM user secret key
- **Source**: AWS IAM Console (shown only once when created)
- **Format**: 40-character alphanumeric string
- **Environment Scope**: Production, Preview, Development
- **Sensitive**: ✅ Yes - Mark as secret
- **Example**:
  ```
  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  ```

**IAM Permissions Required**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::trivia-nft-assets/*",
        "arn:aws:s3:::trivia-nft-assets"
      ]
    }
  ]
}
```

### 8. Testing and Development Flags

#### MINT_TO_BACKEND_WALLET

- **Purpose**: Control where NFTs are minted (for testing forging)
- **Values**: `true` or `false`
- **Environment Scope**: 
  - Production: `false` (mint to user's wallet)
  - Preview/Development: `true` (mint to backend wallet for testing)
- **Example**:
  ```
  false
  ```

## Environment-Specific Values

### Development Environment

Use these settings for local development with `vercel dev`:

```bash
# Database - Can use local PostgreSQL or Neon dev database
DATABASE_URL=postgresql://localhost:5432/trivianft_dev
DATABASE_URL_UNPOOLED=postgresql://localhost:5432/trivianft_dev

# Redis - Can use local Redis or Upstash
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=local-dev-token

# Inngest - Use Dev Server (no keys needed)
# Run: npx inngest-cli@latest dev
# INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY not required

# Blockchain - Use testnet
BLOCKFROST_PROJECT_ID=preprod[your-dev-project-id]
CARDANO_NETWORK=preprod
PAYMENT_ADDRESS=addr_test1[your-testnet-address]
WALLET_SEED_PHRASE=[testnet wallet seed phrase]

# Auth - Use development secret
JWT_SECRET=local-dev-secret-change-in-production
JWT_ISSUER=trivia-nft-dev

# Testing
MINT_TO_BACKEND_WALLET=true
```

### Preview Environment

Use these settings for Vercel preview deployments (Git branches):

```bash
# Database - Neon automatically creates branch databases
DATABASE_URL=[neon-preview-pooled-connection]
DATABASE_URL_UNPOOLED=[neon-preview-direct-connection]

# Redis - Use same as development or separate preview instance
REDIS_URL=[upstash-preview-url]
REDIS_TOKEN=[upstash-preview-token]

# Inngest - Automatically creates sandbox environments
INNGEST_EVENT_KEY=[preview-event-key]
INNGEST_SIGNING_KEY=[preview-signing-key]

# Blockchain - Use testnet
BLOCKFROST_PROJECT_ID=preprod[your-preview-project-id]
CARDANO_NETWORK=preprod
PAYMENT_ADDRESS=addr_test1[your-testnet-address]
WALLET_SEED_PHRASE=[testnet wallet seed phrase]

# Auth - Use preview secret (different from production)
JWT_SECRET=[preview-jwt-secret]
JWT_ISSUER=trivia-nft-preview

# Testing
MINT_TO_BACKEND_WALLET=true
```

### Production Environment

Use these settings for production deployments:

```bash
# Database - Production Neon database
DATABASE_URL=[neon-production-pooled-connection]
DATABASE_URL_UNPOOLED=[neon-production-direct-connection]

# Redis - Production Upstash instance
REDIS_URL=[upstash-production-url]
REDIS_TOKEN=[upstash-production-token]

# Inngest - Production environment
INNGEST_EVENT_KEY=[production-event-key]
INNGEST_SIGNING_KEY=[production-signing-key]

# Blockchain - Use mainnet
BLOCKFROST_PROJECT_ID=mainnet[your-production-project-id]
CARDANO_NETWORK=mainnet
PAYMENT_ADDRESS=addr1[your-mainnet-address]
WALLET_SEED_PHRASE=[mainnet wallet seed phrase - KEEP SECRET!]
NFT_POLICY_ID=[mainnet-policy-id]
ROYALTY_ADDRESS=addr1[your-mainnet-royalty-address]
ROYALTY_RATE=0.025

# Auth - Production secret (strong, unique)
JWT_SECRET=[strong-production-jwt-secret]
JWT_ISSUER=trivia-nft

# Production settings
MINT_TO_BACKEND_WALLET=false
```

## Verification

After configuring all environment variables, verify the setup:

### 1. Check Variable Count

You should have configured:
- **Minimum**: 11 required variables
- **With S3**: 15 variables
- **All optional**: 17+ variables

### 2. Verify Environment Scopes

Ensure each variable is available in the correct environments:
- ✅ Production-only variables (mainnet credentials)
- ✅ Preview-only variables (testnet credentials)
- ✅ Development variables (local/dev credentials)

### 3. Test Deployment

1. Trigger a preview deployment:
   ```bash
   git checkout -b test-env-vars
   git commit --allow-empty -m "Test environment variables"
   git push origin test-env-vars
   ```

2. Check deployment logs for environment variable errors

3. Test API endpoints to verify connections:
   - Database connection
   - Redis connection
   - Inngest webhook
   - Blockfrost API calls

### 4. Verify Sensitive Variables

Ensure these are marked as secret in Vercel (hidden in logs):
- ✅ JWT_SECRET
- ✅ WALLET_SEED_PHRASE
- ✅ AWS_SECRET_ACCESS_KEY
- ✅ REDIS_TOKEN
- ✅ INNGEST_EVENT_KEY
- ✅ INNGEST_SIGNING_KEY
- ✅ BLOCKFROST_PROJECT_ID
- ✅ BLOCKFROST_IPFS_PROJECT_ID

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Symptoms**: `ECONNREFUSED` or `connection timeout` errors

**Solutions**:
- Verify DATABASE_URL includes `-pooler` in hostname
- Check SSL mode is set: `?sslmode=require`
- Verify Neon database is not paused (free tier auto-pauses)
- Check Neon IP allowlist if configured

#### 2. Redis Connection Fails

**Symptoms**: `ECONNREFUSED` or authentication errors

**Solutions**:
- Verify REDIS_URL uses HTTPS (not redis://)
- Check REDIS_TOKEN is correct
- Verify Upstash database is active
- Test connection using Upstash REST API directly

#### 3. Inngest Webhook Not Receiving Events

**Symptoms**: Workflows not triggering, 401 errors

**Solutions**:
- Verify INNGEST_SIGNING_KEY is correct
- Check Inngest endpoint is accessible: `/api/inngest`
- Verify Vercel deployment URL is registered in Inngest
- Check Inngest dashboard for webhook delivery logs

#### 4. Blockfrost API Errors

**Symptoms**: 403 Forbidden, 429 Rate Limit errors

**Solutions**:
- Verify BLOCKFROST_PROJECT_ID matches network (preprod/mainnet)
- Check API key is active in Blockfrost dashboard
- Verify rate limits not exceeded (upgrade plan if needed)
- Ensure CARDANO_NETWORK matches project ID network

#### 5. JWT Verification Fails

**Symptoms**: 401 Unauthorized on protected endpoints

**Solutions**:
- Verify JWT_SECRET is set and matches across environments
- Check JWT_ISSUER matches expected value
- Verify token expiration time is reasonable
- Test token generation and verification locally

#### 6. Transaction Signing Fails

**Symptoms**: "Invalid signature" or "Insufficient funds" errors

**Solutions**:
- Verify WALLET_SEED_PHRASE is correct (24 words)
- Check PAYMENT_ADDRESS has sufficient ADA
- Verify wallet network matches CARDANO_NETWORK
- Ensure wallet is the same one that minted original NFTs

### Getting Help

If you encounter issues not covered here:

1. Check Vercel deployment logs
2. Check Inngest dashboard for workflow errors
3. Check Neon dashboard for database metrics
4. Check Upstash dashboard for Redis metrics
5. Review the design document: `.kiro/specs/vercel-inngest-deployment/design.md`
6. Review the requirements: `.kiro/specs/vercel-inngest-deployment/requirements.md`

## Next Steps

After completing this configuration:

1. ✅ Mark Task 4 as complete in `tasks.md`
2. ➡️ Proceed to Task 5: Update database connection configuration
3. ➡️ Continue with remaining migration tasks

## Security Best Practices

### Do's ✅

- ✅ Use different secrets for each environment
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use strong, randomly generated secrets
- ✅ Mark sensitive variables as secret in Vercel
- ✅ Use testnet for development and preview
- ✅ Keep production secrets separate from development
- ✅ Use different wallets for testnet and mainnet
- ✅ Monitor access logs for suspicious activity

### Don'ts ❌

- ❌ Never commit secrets to Git
- ❌ Never share secrets in chat or email
- ❌ Never use production secrets in development
- ❌ Never reuse secrets across projects
- ❌ Never use weak or predictable secrets
- ❌ Never expose secrets in client-side code
- ❌ Never log secrets in application logs
- ❌ Never use the same wallet seed phrase for testnet and mainnet

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Upstash Redis REST API](https://docs.upstash.com/redis/features/restapi)
- [Inngest Environment Variables](https://www.inngest.com/docs/platform/environments)
- [Blockfrost API Documentation](https://docs.blockfrost.io/)
- [Cardano CIP-27 Royalties](https://cips.cardano.org/cips/cip27/)
