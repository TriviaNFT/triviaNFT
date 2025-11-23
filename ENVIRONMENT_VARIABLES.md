# Environment Variables Reference

Complete reference for all environment variables required for the TriviaNFT application.

## Quick Reference Table

| Variable | Required | Source | Environment | Sensitive |
|----------|----------|--------|-------------|-----------|
| `DATABASE_URL` | ✅ Yes | Neon Console | All | No |
| `DATABASE_URL_UNPOOLED` | ✅ Yes | Neon Console | All | No |
| `REDIS_URL` | ✅ Yes | Upstash Console | All | No |
| `REDIS_TOKEN` | ✅ Yes | Upstash Console | All | ⚠️ Yes |
| `INNGEST_EVENT_KEY` | ✅ Yes | Inngest Dashboard | All | ⚠️ Yes |
| `INNGEST_SIGNING_KEY` | ✅ Yes | Inngest Dashboard | All | ⚠️ Yes |
| `BLOCKFROST_PROJECT_ID` | ✅ Yes | Blockfrost Dashboard | All | ⚠️ Yes |
| `BLOCKFROST_IPFS_PROJECT_ID` | ✅ Yes | Blockfrost Dashboard | All | ⚠️ Yes |
| `CARDANO_NETWORK` | ✅ Yes | Manual | All | No |
| `NFT_POLICY_ID` | ✅ Yes | Policy Script | All | No |
| `PAYMENT_ADDRESS` | ✅ Yes | Cardano Wallet | All | No |
| `WALLET_SEED_PHRASE` | ✅ Yes | Cardano Wallet | All | 🔴 Critical |
| `ROYALTY_ADDRESS` | ✅ Yes | Cardano Wallet | All | No |
| `ROYALTY_RATE` | ✅ Yes | Manual | All | No |
| `JWT_SECRET` | ✅ Yes | Generate | All | ⚠️ Yes |
| `JWT_ISSUER` | ✅ Yes | Manual | All | No |
| `S3_BUCKET` | ⭕ Optional | AWS Console | All | No |
| `S3_REGION` | ⭕ Optional | AWS Console | All | No |
| `AWS_ACCESS_KEY_ID` | ⭕ Optional | AWS IAM | All | ⚠️ Yes |
| `AWS_SECRET_ACCESS_KEY` | ⭕ Optional | AWS IAM | All | 🔴 Critical |
| `MINT_TO_BACKEND_WALLET` | ⭕ Optional | Manual | Dev/Preview | No |

## Database Variables

### DATABASE_URL

**Purpose**: Primary database connection for Vercel Functions (serverless)

**Where to get it**:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click "Connection Details"
4. Copy "Pooled connection" string

**Format**:
```
postgresql://[user]:[password]@[host]-pooler.neon.tech/[database]?sslmode=require
```

**Example**:
```
postgresql://neondb_owner:npg_abc123@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Important Notes**:
- Must include `-pooler` in hostname for connection pooling
- Must include `?sslmode=require` for SSL connection
- Use this for all Vercel Function database queries

**Environment Scope**: Production, Preview, Development

---

### DATABASE_URL_UNPOOLED

**Purpose**: Direct database connection for migrations and admin tasks

**Where to get it**:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click "Connection Details"
4. Copy "Direct connection" string

**Format**:
```
postgresql://[user]:[password]@[host].neon.tech/[database]?sslmode=require
```

**Example**:
```
postgresql://neondb_owner:npg_abc123@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Important Notes**:
- Remove `-pooler` from hostname (compared to DATABASE_URL)
- Use only for migrations and direct database operations
- Not recommended for Vercel Functions (use DATABASE_URL instead)

**Environment Scope**: Production, Preview, Development

---

## Redis Variables

### REDIS_URL

**Purpose**: Upstash Redis REST API endpoint

**Where to get it**:
1. Go to [Upstash Console](https://console.upstash.com)
2. Select your Redis database
3. Go to "REST API" tab
4. Copy "UPSTASH_REDIS_REST_URL"

**Format**:
```
https://[endpoint].upstash.io
```

**Example**:
```
https://us1-merry-cat-12345.upstash.io
```

**Important Notes**:
- Must use HTTPS (not redis://)
- REST API is required for edge function compatibility
- Global replication recommended for low latency

**Environment Scope**: Production, Preview, Development

---

### REDIS_TOKEN

**Purpose**: Authentication token for Upstash REST API

**Where to get it**:
1. Go to [Upstash Console](https://console.upstash.com)
2. Select your Redis database
3. Go to "REST API" tab
4. Copy "UPSTASH_REDIS_REST_TOKEN"

**Format**: Long alphanumeric string

**Example**:
```
AXlzASQgNzk4YjQ5YTktMGVhZC00NzE5LWI4ZjYtOTM0ZDQ5ZjI1YmU0abc123def456
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Treat like a password - never commit to Git
- Rotate regularly (every 90 days recommended)

**Environment Scope**: Production, Preview, Development

---

## Inngest Variables

### INNGEST_EVENT_KEY

**Purpose**: Authenticate when sending events to Inngest from your API

**Where to get it**:
1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Select your app
3. Go to "Manage" → "Keys"
4. Copy "Event Key"

**Format**: Long alphanumeric string

**Example**:
```
DhWVJWVkE-OFHZVAcenzQ5z8PQW64it3cv5FXAk4SmrwNE7cQy2z_RCyqtccdMFQXKnk1FAe6TrPXW6FT8F6ag
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Used by your API to trigger workflows
- Different keys for production vs preview recommended

**Environment Scope**: Production, Preview, Development

---

### INNGEST_SIGNING_KEY

**Purpose**: Verify requests from Inngest to your API endpoint

**Where to get it**:
1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Select your app
3. Go to "Manage" → "Keys"
4. Copy "Signing Key"

**Format**: `signkey-prod-[hex-string]` or `signkey-test-[hex-string]`

**Example**:
```
signkey-prod-166eac79aab9e423896aae0727d89d1c4e63ed57515fe5c14ea87d7c9b72b745
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Used to verify Inngest webhook requests
- Production uses `signkey-prod-`, preview uses `signkey-test-`

**Environment Scope**: Production, Preview, Development

---

## Blockchain Variables

### BLOCKFROST_PROJECT_ID

**Purpose**: Access Cardano blockchain data and submit transactions

**Where to get it**:
1. Go to [Blockfrost Dashboard](https://blockfrost.io/dashboard)
2. Create or select a project
3. Copy the "Project ID"

**Format**: `[network][project-id]`

**Examples**:
```
preprodWAuGSqaryUNPRLQw5NmFbL9YgTduoG5y  # Testnet
mainnetXYZ789ABC123DEF456GHI789JKL012  # Production
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Use `preprod` prefix for testnet (development/preview)
- Use `mainnet` prefix for production
- Must match CARDANO_NETWORK setting

**Environment Scope**:
- Production: mainnet project ID
- Preview/Development: preprod project ID

---

### BLOCKFROST_IPFS_PROJECT_ID

**Purpose**: Upload NFT images and metadata to IPFS via Blockfrost

**Where to get it**:
1. Go to [Blockfrost Dashboard](https://blockfrost.io/dashboard)
2. Create or select an IPFS project
3. Copy the "Project ID"

**Format**: `ipfs[project-id]`

**Example**:
```
ipfse4BtZvIZjMY0Dxsfv9kbiFSmsmuxNBVx
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Separate from blockchain project ID
- Can use same project for all environments

**Environment Scope**: Production, Preview, Development

---

### CARDANO_NETWORK

**Purpose**: Specify which Cardano network to use

**Where to get it**: Manual configuration

**Format**: `preprod` or `mainnet`

**Examples**:
```
preprod   # For testnet (development/preview)
mainnet   # For production
```

**Important Notes**:
- Must match BLOCKFROST_PROJECT_ID network
- Must match PAYMENT_ADDRESS network
- Use `preprod` for all testing

**Environment Scope**:
- Production: `mainnet`
- Preview/Development: `preprod`

---

### NFT_POLICY_ID

**Purpose**: The Cardano policy ID for your NFT collection

**Where to get it**: Generated when you create your NFT policy script

**Format**: 56-character hexadecimal string

**Example**:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

**How to generate**:
```bash
# Using cardano-cli
cardano-cli transaction policyid --script-file policy.script

# Or use the provided script
npx tsx scripts/generate-policy-id.ts
```

**Important Notes**:
- Different policy IDs for testnet and mainnet
- Must be consistent across all NFTs in collection
- Cannot be changed after minting begins

**Environment Scope**:
- Production: mainnet policy ID
- Preview/Development: preprod policy ID

---

### PAYMENT_ADDRESS

**Purpose**: Cardano address that pays for transaction fees

**Where to get it**: Your Cardano wallet

**Format**:
- Testnet: `addr_test1[...]`
- Mainnet: `addr1[...]`

**Examples**:
```
addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk7xttml9m03rmxkj4pm340hwlatfd8ncrrr08tqw9md0y  # Testnet
addr1qxj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk7xttml9m03rmxkj4pm340hwlatfd8ncrrr08tqabcdef  # Mainnet
```

**Important Notes**:
- Must have sufficient ADA for transaction fees
- Minting: ~2-3 ADA per transaction
- Forging: ~3-5 ADA per transaction (burn + mint)
- Monitor balance regularly

**Environment Scope**:
- Production: mainnet address
- Preview/Development: testnet address

---

### WALLET_SEED_PHRASE

**Purpose**: 24-word mnemonic for signing transactions

**Where to get it**: Your Cardano wallet recovery phrase

**Format**: 24 words separated by spaces

**Example**:
```
word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24
```

**🔴 CRITICAL SECURITY WARNINGS**:
- This is the MOST sensitive variable
- Controls access to wallet funds
- Never commit to Git
- Never share with anyone
- Never log or display
- Use different wallets for testnet and mainnet
- Must be the same wallet that minted original NFTs for forging

**Important Notes**:
- Must correspond to PAYMENT_ADDRESS
- Must have sufficient ADA balance
- Rotate if compromised immediately

**Environment Scope**:
- Production: mainnet wallet seed phrase
- Preview/Development: testnet wallet seed phrase

---

### ROYALTY_ADDRESS

**Purpose**: Address to receive NFT royalties when sold on marketplaces (CIP-27)

**Where to get it**: Your Cardano wallet (can be same as payment address)

**Format**: Same as PAYMENT_ADDRESS

**Examples**:
```
addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk  # Testnet
addr1qxj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnrlju66nvk  # Mainnet
```

**Important Notes**:
- Can be same as PAYMENT_ADDRESS or different
- Royalties paid when NFTs sold on supporting marketplaces
- Follows CIP-27 standard

**Environment Scope**:
- Production: mainnet address
- Preview/Development: testnet address

---

### ROYALTY_RATE

**Purpose**: Percentage of sale price to receive as royalty

**Where to get it**: Manual configuration

**Format**: Decimal number (0.025 = 2.5%, 0.05 = 5%, 0.10 = 10%)

**Examples**:
```
0.025  # 2.5%
0.05   # 5%
0.10   # 10%
```

**Important Notes**:
- Typical range: 2.5% - 10%
- Higher rates may discourage secondary sales
- Marketplace support varies (CIP-27)

**Environment Scope**: Production, Preview, Development

---

## Authentication Variables

### JWT_SECRET

**Purpose**: Secret key for signing and verifying JWT tokens

**Where to get it**: Generate a strong random string

**Format**: At least 32 characters, alphanumeric + special characters

**How to generate**:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Example**:
```
Xk7mp9Qw2Rt5Yh8Nj3Lp6Vb4Zx1Cd0Fg9Hk2Mn5Pq8Rs
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Use different secrets for each environment
- Minimum 32 characters recommended
- Rotate every 90 days
- Changing this invalidates all existing tokens

**Environment Scope**: Production, Preview, Development (different values)

---

### JWT_ISSUER

**Purpose**: Identifier for your application in JWT claims

**Where to get it**: Manual configuration

**Format**: String identifier (typically your app name)

**Example**:
```
trivia-nft
```

**Important Notes**:
- Used in JWT `iss` claim
- Should be consistent across environments
- Helps identify token source

**Environment Scope**: Production, Preview, Development (same value)

---

## Optional: AWS S3 Variables

Only required if using S3 for NFT asset storage (alternative to Vercel Blob).

### S3_BUCKET

**Purpose**: S3 bucket name where NFT assets are stored

**Where to get it**: AWS S3 Console

**Format**: Bucket name (lowercase, no special characters)

**Example**:
```
trivia-nft-assets
```

**Environment Scope**: Production, Preview, Development

---

### S3_REGION

**Purpose**: AWS region where your S3 bucket is located

**Where to get it**: AWS S3 Console → Bucket Properties

**Format**: AWS region code

**Example**:
```
us-east-1
```

**Environment Scope**: Production, Preview, Development

---

### AWS_ACCESS_KEY_ID

**Purpose**: IAM user access key with S3 permissions

**Where to get it**: AWS IAM Console → Users → Security Credentials

**Format**: 20-character alphanumeric string

**Example**:
```
AKIAIOSFODNN7EXAMPLE
```

**Important Notes**:
- ⚠️ Sensitive - Mark as secret in Vercel
- Requires S3 read/write permissions
- Use IAM user with minimal permissions

**Environment Scope**: Production, Preview, Development

---

### AWS_SECRET_ACCESS_KEY

**Purpose**: IAM user secret key

**Where to get it**: AWS IAM Console (shown only once when created)

**Format**: 40-character alphanumeric string

**Example**:
```
wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Important Notes**:
- 🔴 Critical - Mark as secret in Vercel
- Shown only once when created - save securely
- Rotate if compromised
- Use IAM user with minimal permissions

**Environment Scope**: Production, Preview, Development

---

## Testing Variables

### MINT_TO_BACKEND_WALLET

**Purpose**: Control where NFTs are minted (for testing forging)

**Where to get it**: Manual configuration

**Format**: `true` or `false`

**Examples**:
```
true   # Mint to backend wallet (for testing)
false  # Mint to user's wallet (production)
```

**Important Notes**:
- Set to `true` for development/preview to test forging
- Set to `false` for production
- When `true`, NFTs minted to PAYMENT_ADDRESS

**Environment Scope**:
- Production: `false`
- Preview/Development: `true`

---

## Verification

After configuring all variables, verify your setup:

### Using Verification Script

```bash
# From project root
npx tsx scripts/verify-vercel-env.ts

# For specific environment
npx tsx scripts/verify-vercel-env.ts --env production
```

### Manual Verification Checklist

- [ ] All 16 required variables are set
- [ ] Database URLs include correct suffixes (-pooler vs direct)
- [ ] Redis URL uses HTTPS (not redis://)
- [ ] Inngest keys match environment (prod vs test)
- [ ] Blockfrost project ID matches CARDANO_NETWORK
- [ ] Payment address matches CARDANO_NETWORK
- [ ] JWT_SECRET is at least 32 characters
- [ ] All sensitive variables marked as secret in Vercel
- [ ] Different secrets for production vs preview/development
- [ ] Wallet has sufficient ADA balance

### Test Connections

```bash
# Test database
npx tsx scripts/test-database-connectivity.ts

# Test Redis
npx tsx scripts/test-redis-connectivity.ts

# Test Inngest
curl https://[your-url].vercel.app/api/inngest
```

---

## Security Best Practices

### Critical Secrets (Highest Priority)

1. **WALLET_SEED_PHRASE** - Controls wallet funds
2. **AWS_SECRET_ACCESS_KEY** - AWS account access
3. **JWT_SECRET** - Authenticates users

### All Sensitive Variables

- JWT_SECRET
- WALLET_SEED_PHRASE
- AWS_SECRET_ACCESS_KEY
- REDIS_TOKEN
- INNGEST_EVENT_KEY
- INNGEST_SIGNING_KEY
- BLOCKFROST_PROJECT_ID
- BLOCKFROST_IPFS_PROJECT_ID

### Best Practices

✅ **Do**:
- Use different secrets for each environment
- Mark sensitive variables as secret in Vercel
- Rotate secrets every 90 days
- Use testnet for development/preview
- Use strong, randomly generated secrets
- Monitor wallet balances
- Use different wallets for testnet and mainnet

❌ **Don't**:
- Never commit secrets to Git
- Never share secrets in chat or email
- Never use production secrets in development
- Never reuse secrets across projects
- Never log secrets in application logs
- Never expose secrets in client-side code
- Never use the same wallet seed for testnet and mainnet

---

## Troubleshooting

### Variable Not Found

**Problem**: `Error: Environment variable X is not defined`

**Solution**:
1. Check variable is set in Vercel Dashboard
2. Verify environment scope (Production/Preview/Development)
3. Redeploy after adding variable

### Network Mismatch

**Problem**: `Network mismatch: CARDANO_NETWORK=preprod but BLOCKFROST_PROJECT_ID uses mainnet`

**Solution**: Ensure all blockchain variables use the same network:
- BLOCKFROST_PROJECT_ID prefix matches CARDANO_NETWORK
- PAYMENT_ADDRESS prefix matches network (addr_test1 vs addr1)
- NFT_POLICY_ID is for correct network

### Database Connection Fails

**Problem**: `ECONNREFUSED` or connection timeout

**Solution**:
- Verify DATABASE_URL includes `-pooler`
- Check SSL mode: `?sslmode=require`
- Verify Neon database is active (not paused)

### Redis Connection Fails

**Problem**: Authentication or connection errors

**Solution**:
- Verify REDIS_URL uses HTTPS (not redis://)
- Check REDIS_TOKEN is correct
- Verify Upstash database is active

---

## Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Upstash Redis REST API](https://docs.upstash.com/redis/features/restapi)
- [Inngest Environment Variables](https://www.inngest.com/docs/platform/environments)
- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [Cardano CIP-27 Royalties](https://cips.cardano.org/cips/cip27/)
