# Vercel Environment Variables - Quick Checklist

Use this checklist to quickly verify all environment variables are configured in Vercel.

## Access Vercel Settings

🔗 `https://vercel.com/[your-team]/[your-project]/settings/environment-variables`

## Required Variables (16)

### Database (2)
- [ ] `DATABASE_URL` - Neon pooled connection (with `-pooler`)
- [ ] `DATABASE_URL_UNPOOLED` - Neon direct connection (without `-pooler`)

### Redis (2)
- [ ] `REDIS_URL` - Upstash REST URL (https://...)
- [ ] `REDIS_TOKEN` - Upstash REST token

### Inngest (2)
- [ ] `INNGEST_EVENT_KEY` - Event key for sending events
- [ ] `INNGEST_SIGNING_KEY` - Signing key (starts with `signkey-`)

### Blockchain (7)
- [ ] `BLOCKFROST_PROJECT_ID` - Cardano API (preprod/mainnet prefix)
- [ ] `BLOCKFROST_IPFS_PROJECT_ID` - IPFS uploads (ipfs prefix)
- [ ] `CARDANO_NETWORK` - Network name (preprod/mainnet)
- [ ] `NFT_POLICY_ID` - 56-char hex policy ID
- [ ] `PAYMENT_ADDRESS` - Cardano address (addr_test1/addr1)
- [ ] `WALLET_SEED_PHRASE` - 24 words (⚠️ CRITICAL SECRET)
- [ ] `ROYALTY_ADDRESS` - Royalty recipient address
- [ ] `ROYALTY_RATE` - Decimal rate (e.g., 0.025)

### Authentication (2)
- [ ] `JWT_SECRET` - Min 32 chars (⚠️ SECRET)
- [ ] `JWT_ISSUER` - App identifier (e.g., trivia-nft)

## Optional Variables (5)

### AWS S3 (if keeping S3)
- [ ] `S3_BUCKET` - Bucket name
- [ ] `S3_REGION` - AWS region
- [ ] `AWS_ACCESS_KEY_ID` - IAM access key (⚠️ SECRET)
- [ ] `AWS_SECRET_ACCESS_KEY` - IAM secret (⚠️ SECRET)

### Testing
- [ ] `MINT_TO_BACKEND_WALLET` - true/false

## Environment Scopes

For each variable, set the appropriate scope:

### Production Only
- [ ] Mainnet BLOCKFROST_PROJECT_ID
- [ ] Mainnet PAYMENT_ADDRESS
- [ ] Mainnet WALLET_SEED_PHRASE
- [ ] Production JWT_SECRET
- [ ] Production Inngest keys

### Preview Only
- [ ] Testnet BLOCKFROST_PROJECT_ID
- [ ] Testnet PAYMENT_ADDRESS
- [ ] Testnet WALLET_SEED_PHRASE
- [ ] Preview JWT_SECRET
- [ ] Preview Inngest keys

### Development
- [ ] Local/dev database URLs
- [ ] Local/dev Redis
- [ ] Dev Inngest keys (or use Dev Server)

## Security Checklist

### Sensitive Variables (Mark as Secret)
- [ ] `JWT_SECRET`
- [ ] `WALLET_SEED_PHRASE`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `REDIS_TOKEN`
- [ ] `INNGEST_EVENT_KEY`
- [ ] `INNGEST_SIGNING_KEY`
- [ ] `BLOCKFROST_PROJECT_ID`
- [ ] `BLOCKFROST_IPFS_PROJECT_ID`

### Security Best Practices
- [ ] Different secrets for each environment
- [ ] Strong, randomly generated secrets
- [ ] Testnet for preview/development
- [ ] Mainnet only for production
- [ ] Different wallets for testnet/mainnet
- [ ] No secrets committed to Git

## Validation

### Automated Verification
Run the verification script:
```bash
tsx scripts/verify-vercel-env.ts
```

### Manual Checks
- [ ] DATABASE_URL includes `-pooler`
- [ ] DATABASE_URL_UNPOOLED does NOT include `-pooler`
- [ ] REDIS_URL starts with `https://`
- [ ] INNGEST_SIGNING_KEY starts with `signkey-`
- [ ] BLOCKFROST_PROJECT_ID matches CARDANO_NETWORK
- [ ] PAYMENT_ADDRESS matches CARDANO_NETWORK
- [ ] WALLET_SEED_PHRASE has exactly 24 words
- [ ] JWT_SECRET is at least 32 characters
- [ ] ROYALTY_RATE is between 0 and 1

### Network Consistency
- [ ] CARDANO_NETWORK = preprod → BLOCKFROST_PROJECT_ID starts with `preprod`
- [ ] CARDANO_NETWORK = mainnet → BLOCKFROST_PROJECT_ID starts with `mainnet`
- [ ] CARDANO_NETWORK = preprod → PAYMENT_ADDRESS starts with `addr_test1`
- [ ] CARDANO_NETWORK = mainnet → PAYMENT_ADDRESS starts with `addr1`

## Test Deployment

After configuration:
- [ ] Trigger preview deployment
- [ ] Check deployment logs for errors
- [ ] Test database connection
- [ ] Test Redis connection
- [ ] Test Inngest webhook
- [ ] Test API endpoints

## Documentation

- [ ] Read full guide: `VERCEL_ENV_SETUP.md`
- [ ] Review example file: `.env.vercel.example`
- [ ] Check requirements: `.kiro/specs/vercel-inngest-deployment/requirements.md`

## Completion

When all items are checked:
- [ ] All required variables configured
- [ ] All sensitive variables marked as secret
- [ ] Environment scopes set correctly
- [ ] Test deployment successful
- [ ] Mark Task 4 complete in `tasks.md`

---

**Quick Links:**
- 📖 [Full Setup Guide](VERCEL_ENV_SETUP.md)
- 📋 [Example File](.env.vercel.example)
- 🔍 [Verification Script](scripts/verify-vercel-env.ts)
- 📝 [Requirements](.kiro/specs/vercel-inngest-deployment/requirements.md)
