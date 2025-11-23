# Production Environment Setup - Quick Checklist

Use this checklist to track progress on Task 22: Configure production environment.

## Sub-Task 1: Set up Production Neon Database

### Database Creation
- [ ] Navigate to Neon Console (https://console.neon.tech/)
- [ ] Create new project: `trivia-nft-production`
- [ ] Select region closest to users
- [ ] PostgreSQL version 16
- [ ] Save connection strings securely

### Connection Configuration
- [ ] Note pooled connection string (with `-pooler`)
- [ ] Note direct connection string (without `-pooler`)
- [ ] Verify SSL mode is `require`
- [ ] Configure compute settings (0.25 vCPU to start)
- [ ] Enable auto-suspend (5 minutes)
- [ ] Set max connections (100)

### Database Setup
- [ ] Create `.env.production.local` with DATABASE_URL_UNPOOLED
- [ ] Test database connection: `tsx scripts/test-database-connectivity.ts`
- [ ] Run migrations: `cd services/api && pnpm migrate up`
- [ ] Verify schema: `psql "$DATABASE_URL_UNPOOLED" -c "\dt"`
- [ ] Confirm all tables created (players, sessions, eligibilities, etc.)

### Security & Monitoring
- [ ] Enable connection encryption (SSL)
- [ ] Configure IP allowlist (optional)
- [ ] Enable Point-in-Time Recovery (if on paid plan)
- [ ] Set up monitoring alerts
- [ ] Enable database branching for preview deployments

---

## Sub-Task 2: Set up Production Upstash Redis

### Redis Creation
- [ ] Navigate to Upstash Console (https://console.upstash.com/)
- [ ] Create new database: `trivia-nft-production`
- [ ] Select type: Regional or Global
- [ ] Select region closest to Neon database
- [ ] Set eviction policy: No eviction
- [ ] Save REST URL and token securely

### Redis Configuration
- [ ] Note REST URL (https://...)
- [ ] Note REST token
- [ ] Verify TLS is enabled
- [ ] Configure memory limit
- [ ] Set up edge caching (if using Global)

### Redis Testing
- [ ] Add REDIS_URL and REDIS_TOKEN to `.env.production.local`
- [ ] Test connection: `tsx scripts/test-redis-connectivity.ts`
- [ ] Test SET operation with curl
- [ ] Test GET operation with curl
- [ ] Verify operations succeed

### Monitoring
- [ ] Review metrics dashboard
- [ ] Set up alerts for high memory usage
- [ ] Set up alerts for high latency
- [ ] Monitor request count and hit rate

---

## Sub-Task 3: Configure Production Environment Variables in Vercel

### Access Vercel
- [ ] Navigate to Vercel project settings
- [ ] Go to Settings → Environment Variables
- [ ] Prepare all variable values before starting

### Database Variables (Production scope only)
- [ ] `DATABASE_URL` - Neon pooled connection (with `-pooler`)
- [ ] `DATABASE_URL_UNPOOLED` - Neon direct connection (no `-pooler`)

### Redis Variables (Production scope only)
- [ ] `REDIS_URL` - Upstash REST URL (https://...)
- [ ] `REDIS_TOKEN` - Upstash REST token (mark as secret ✅)

### Inngest Variables (Production scope only)
- [ ] `INNGEST_EVENT_KEY` - Production event key (mark as secret ✅)
- [ ] `INNGEST_SIGNING_KEY` - Production signing key, starts with `signkey-prod-` (mark as secret ✅)

### Blockchain Variables - Mainnet (Production scope only)
- [ ] `BLOCKFROST_PROJECT_ID` - Mainnet project ID, starts with `mainnet` (mark as secret ✅)
- [ ] `BLOCKFROST_IPFS_PROJECT_ID` - IPFS project ID, starts with `ipfs` (mark as secret ✅)
- [ ] `CARDANO_NETWORK` - Set to `mainnet`
- [ ] `NFT_POLICY_ID` - Mainnet policy ID (56-char hex)
- [ ] `PAYMENT_ADDRESS` - Mainnet address, starts with `addr1`
- [ ] `WALLET_SEED_PHRASE` - Mainnet wallet 24 words (mark as secret ✅ ⚠️ CRITICAL)
- [ ] `ROYALTY_ADDRESS` - Mainnet royalty address, starts with `addr1`
- [ ] `ROYALTY_RATE` - Decimal rate (e.g., `0.025`)

### Authentication Variables (Production scope only)
- [ ] `JWT_SECRET` - Strong random string, min 32 chars (mark as secret ✅)
- [ ] `JWT_ISSUER` - Set to `trivia-nft`

### Optional S3 Variables (Production scope only, if keeping S3)
- [ ] `S3_BUCKET` - Production bucket name
- [ ] `S3_REGION` - AWS region
- [ ] `AWS_ACCESS_KEY_ID` - IAM access key (mark as secret ✅)
- [ ] `AWS_SECRET_ACCESS_KEY` - IAM secret key (mark as secret ✅)

### Production Flags (Production scope only)
- [ ] `MINT_TO_BACKEND_WALLET` - Set to `false`

### Verification
- [ ] Count variables: 11-17 depending on optional ones
- [ ] All variables scoped to "Production" only
- [ ] All sensitive variables marked as secret
- [ ] No development/preview values in production
- [ ] All mainnet credentials (not testnet)

---

## Sub-Task 4: Set up Production Inngest Environment

### Access Inngest
- [ ] Navigate to Inngest Dashboard (https://www.inngest.com/dashboard)
- [ ] Select your app (e.g., "trivia-nft")

### Environment Setup
- [ ] Navigate to Manage → Environments
- [ ] Verify Production environment exists and is active
- [ ] Navigate to Manage → Keys
- [ ] Copy production Event Key
- [ ] Copy production Signing Key (starts with `signkey-prod-`)

### Webhook Configuration
- [ ] Navigate to Manage → Webhooks
- [ ] Add production webhook URL: `https://[your-domain].vercel.app/api/inngest`
- [ ] Set environment to Production
- [ ] Test webhook (should return 200 OK)
- [ ] Verify in Vercel logs

### Function Configuration
- [ ] Navigate to Functions tab
- [ ] Verify `mint-nft` workflow is registered
- [ ] Verify `forge-nft` workflow is registered
- [ ] Review retry settings (default: 3 retries)
- [ ] Review timeout settings (default: 5 minutes per step)

### Monitoring Setup
- [ ] Enable monitoring in Inngest dashboard
- [ ] Set up alerts for high error rate (>5%)
- [ ] Set up alerts for long duration (>10 minutes)
- [ ] Set up alerts for failed runs
- [ ] Configure notification channels (email, Slack)

### Rate Limits
- [ ] Review rate limits in Settings
- [ ] Adjust if expecting high volume
- [ ] Set up throttling to prevent abuse

---

## Final Verification

### Run Verification Script
- [ ] Create `.env.production.local` with all production values
- [ ] Run: `tsx scripts/verify-production-env.ts`
- [ ] Fix any failed checks
- [ ] Resolve any warnings

### Manual Verification
- [ ] DATABASE_URL includes `-pooler`
- [ ] DATABASE_URL_UNPOOLED does NOT include `-pooler`
- [ ] REDIS_URL starts with `https://`
- [ ] INNGEST_SIGNING_KEY starts with `signkey-prod-`
- [ ] BLOCKFROST_PROJECT_ID starts with `mainnet`
- [ ] CARDANO_NETWORK is `mainnet`
- [ ] PAYMENT_ADDRESS starts with `addr1` (not `addr_test1`)
- [ ] WALLET_SEED_PHRASE has exactly 24 words
- [ ] JWT_SECRET is at least 32 characters
- [ ] ROYALTY_RATE is between 0 and 1
- [ ] MINT_TO_BACKEND_WALLET is `false`

### Security Verification
- [ ] All secrets are different from preview/development
- [ ] JWT_SECRET is strong and randomly generated
- [ ] WALLET_SEED_PHRASE is mainnet wallet (not testnet)
- [ ] PAYMENT_ADDRESS has sufficient ADA for fees
- [ ] All sensitive variables marked as secret in Vercel
- [ ] No secrets committed to Git
- [ ] No development values in production

### Service Status
- [ ] Neon database is active (not paused)
- [ ] Upstash Redis is active
- [ ] Inngest production environment is active
- [ ] All service dashboards accessible
- [ ] No service outages or maintenance

### Documentation
- [ ] Read full guide: `PRODUCTION_SETUP_GUIDE.md`
- [ ] Review environment setup: `VERCEL_ENV_SETUP.md`
- [ ] Review example file: `.env.vercel.example`
- [ ] Understand requirements: `requirements.md`
- [ ] Understand design: `design.md`

---

## Completion Criteria

Task 22 is complete when:

- ✅ Production Neon database created and configured
- ✅ Production Upstash Redis created and configured
- ✅ All production environment variables configured in Vercel
- ✅ Production Inngest environment configured
- ✅ Verification script passes with no failures
- ✅ All security checks pass
- ✅ Ready to proceed to Task 23 (data migration) or Task 24 (production deployment)

---

## Next Steps

After completing Task 22:

1. **If migrating from existing database:**
   - ✅ Mark Task 22 complete
   - ➡️ Proceed to Task 23: Data migration

2. **If no data migration needed:**
   - ✅ Mark Task 22 complete
   - ➡️ Skip to Task 24: Deploy to production

---

## Troubleshooting

### Database Issues
- **Cannot connect**: Check SSL mode, verify not paused, test with psql
- **Migrations fail**: Check permissions, verify schema, review error logs
- **Slow queries**: Check indexes, review query plans, increase compute

### Redis Issues
- **Cannot connect**: Verify HTTPS URL, check token, test with curl
- **High latency**: Check region, enable edge caching, review metrics
- **Memory full**: Increase limit, review TTLs, check eviction policy

### Inngest Issues
- **Webhook fails**: Verify URL, check signing key, review Vercel logs
- **Functions not registered**: Redeploy, check function exports, review Inngest logs
- **Workflows fail**: Check step errors, review retry settings, verify credentials

### Environment Variable Issues
- **Variables not accessible**: Check scope, verify names, redeploy
- **Wrong values**: Verify production values, check for typos, review secrets
- **Secrets exposed**: Rotate immediately, mark as secret, review logs

---

## Support Resources

- 📖 [Production Setup Guide](PRODUCTION_SETUP_GUIDE.md)
- 📖 [Environment Setup Guide](VERCEL_ENV_SETUP.md)
- 📋 [Environment Checklist](VERCEL_ENV_CHECKLIST.md)
- 📝 [Requirements Document](requirements.md)
- 🎨 [Design Document](design.md)

### Service Documentation
- [Neon Docs](https://neon.tech/docs)
- [Upstash Docs](https://docs.upstash.com/)
- [Inngest Docs](https://www.inngest.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Blockfrost Docs](https://docs.blockfrost.io/)

### Service Status
- [Neon Status](https://neonstatus.com/)
- [Upstash Status](https://status.upstash.com/)
- [Inngest Status](https://status.inngest.com/)
- [Vercel Status](https://www.vercel-status.com/)
