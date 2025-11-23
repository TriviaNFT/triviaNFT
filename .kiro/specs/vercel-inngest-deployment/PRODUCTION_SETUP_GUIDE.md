# Production Environment Setup Guide

This guide provides step-by-step instructions for configuring the production environment for the TriviaNFT application on Vercel with Neon PostgreSQL, Upstash Redis, and Inngest.

## Overview

Task 22 involves setting up all production infrastructure and configuring environment variables. This is a critical step before deploying to production.

**Prerequisites:**
- ✅ Tasks 1-21 completed (preview environment tested and validated)
- ✅ Vercel account with production project
- ✅ Access to create production databases and services
- ✅ Production Cardano wallet with mainnet ADA
- ✅ Production NFT policy ID (mainnet)

## Sub-Task Checklist

- [ ] 1. Set up production Neon database
- [ ] 2. Set up production Upstash Redis
- [ ] 3. Configure production environment variables in Vercel
- [ ] 4. Set up production Inngest environment

---

## 1. Set up Production Neon Database

### 1.1 Create Production Neon Project

1. **Navigate to Neon Console**
   - Go to: https://console.neon.tech/
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - **Project Name**: `trivia-nft-production`
   - **Region**: Choose closest to your users (e.g., `US East (Ohio)` or `EU (Frankfurt)`)
   - **PostgreSQL Version**: 16 (latest stable)
   - Click "Create Project"

3. **Note Connection Details**
   - After creation, you'll see the connection details
   - **Save these securely** - you'll need them for environment variables

### 1.2 Configure Connection Pooling

Neon automatically provides connection pooling. You'll get two connection strings:

**Pooled Connection** (for Vercel Functions):
```
postgresql://[user]:[password]@[host]-pooler.us-east-2.aws.neon.tech/[database]?sslmode=require
```

**Direct Connection** (for migrations):
```
postgresql://[user]:[password]@[host].us-east-2.aws.neon.tech/[database]?sslmode=require
```

### 1.3 Configure Database Settings

1. **Navigate to Project Settings**
   - Click on your project
   - Go to "Settings" → "General"

2. **Configure Compute Settings**
   - **Compute Size**: Start with 0.25 vCPU (can scale up)
   - **Auto-suspend**: Enable (5 minutes of inactivity)
   - **Auto-scaling**: Enable if on paid plan

3. **Configure Connection Limits**
   - **Max Connections**: 100 (default is fine for most cases)
   - Connection pooler will handle serverless connections efficiently

### 1.4 Set Up Database Branching (Optional but Recommended)

1. **Enable Branching**
   - Go to "Settings" → "Branching"
   - Enable "Automatic branching for preview deployments"
   - This creates isolated databases for each preview deployment

2. **Configure Branch Settings**
   - **Branch Retention**: 7 days (or as needed)
   - **Auto-delete**: Enable for merged branches

### 1.5 Run Production Migrations

**Important**: Run migrations BEFORE configuring environment variables in Vercel.

1. **Set up local environment**
   ```bash
   # Create .env.production.local file
   DATABASE_URL_UNPOOLED="postgresql://[user]:[password]@[host].us-east-2.aws.neon.tech/[database]?sslmode=require"
   ```

2. **Test connection**
   ```bash
   # Test database connectivity
   tsx scripts/test-database-connectivity.ts
   ```

3. **Run migrations**
   ```bash
   # Run all migrations
   cd services/api
   pnpm migrate up
   ```

4. **Verify schema**
   ```bash
   # Connect to database and verify tables
   psql "$DATABASE_URL_UNPOOLED" -c "\dt"
   ```

   Expected tables:
   - players
   - sessions
   - eligibilities
   - mints
   - forge_operations
   - player_nfts
   - nft_catalog
   - categories
   - questions
   - seasons

### 1.6 Security Configuration

1. **Enable IP Allowlist** (Optional but recommended)
   - Go to "Settings" → "Security"
   - Add Vercel's IP ranges if you want to restrict access
   - Note: This may complicate preview deployments

2. **Enable Connection Encryption**
   - Already enabled by default with `?sslmode=require`
   - Verify SSL is enforced in connection strings

3. **Set Up Database User Permissions**
   - Default user has full permissions
   - For production, consider creating a limited user:
   ```sql
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
   ```

### 1.7 Backup Configuration

1. **Enable Point-in-Time Recovery**
   - Go to "Settings" → "Backups"
   - Enable PITR (available on paid plans)
   - Retention: 7-30 days

2. **Set Up Manual Backups**
   - Schedule regular manual backups
   - Store backup scripts in `scripts/` directory

### 1.8 Monitoring Setup

1. **Enable Monitoring**
   - Go to "Monitoring" tab
   - Review metrics:
     - Connection count
     - Query performance
     - Storage usage
     - CPU usage

2. **Set Up Alerts** (if available on your plan)
   - High connection count
   - Slow queries
   - Storage approaching limit

---

## 2. Set up Production Upstash Redis

### 2.1 Create Production Redis Database

1. **Navigate to Upstash Console**
   - Go to: https://console.upstash.com/
   - Sign in to your account

2. **Create New Database**
   - Click "Create Database"
   - **Name**: `trivia-nft-production`
   - **Type**: Regional (for consistent latency) or Global (for worldwide distribution)
   - **Region**: Choose closest to your Neon database region
   - **Eviction**: No eviction (we manage TTLs explicitly)
   - Click "Create"

### 2.2 Configure Redis Settings

1. **Navigate to Database Settings**
   - Click on your database
   - Go to "Details" tab

2. **Note Connection Details**
   - **REST URL**: `https://[endpoint].upstash.io`
   - **REST Token**: Long alphanumeric string
   - **Save these securely** for environment variables

3. **Configure TLS**
   - TLS is enabled by default for REST API
   - Verify "TLS Enabled" is checked

### 2.3 Configure Memory and Eviction

1. **Memory Limit**
   - Free tier: 256 MB
   - Paid tier: Scale as needed
   - Monitor usage in dashboard

2. **Eviction Policy**
   - Set to "noeviction" (we use explicit TTLs)
   - This prevents automatic key deletion

### 2.4 Test Redis Connection

1. **Test from local environment**
   ```bash
   # Create .env.production.local
   REDIS_URL="https://[endpoint].upstash.io"
   REDIS_TOKEN="[your-token]"
   ```

2. **Run connectivity test**
   ```bash
   tsx scripts/test-redis-connectivity.ts
   ```

3. **Test basic operations**
   ```bash
   # Using curl
   curl -H "Authorization: Bearer [your-token]" \
        -d '["SET", "test-key", "test-value"]' \
        https://[endpoint].upstash.io
   
   curl -H "Authorization: Bearer [your-token]" \
        -d '["GET", "test-key"]' \
        https://[endpoint].upstash.io
   ```

### 2.5 Configure Edge Caching (Optional)

1. **Enable Global Replication** (if using Global database)
   - Automatically replicates data to edge locations
   - Reduces latency for global users

2. **Configure Read Regions**
   - Select regions where your users are located
   - Data is replicated to these regions

### 2.6 Security Configuration

1. **Rotate REST Token** (if needed)
   - Go to "Details" → "REST API"
   - Click "Rotate Token"
   - Update environment variables immediately

2. **Enable IP Allowlist** (Optional)
   - Go to "Security" tab
   - Add allowed IP ranges
   - Note: May complicate Vercel deployments

### 2.7 Monitoring Setup

1. **Review Metrics**
   - Go to "Metrics" tab
   - Monitor:
     - Request count
     - Latency
     - Memory usage
     - Hit rate

2. **Set Up Alerts** (if available)
   - High memory usage
   - High latency
   - Connection errors

---

## 3. Configure Production Environment Variables in Vercel

### 3.1 Access Vercel Environment Variables

1. **Navigate to Vercel Project**
   - Go to: https://vercel.com/[your-team]/[your-project]
   - Click "Settings" → "Environment Variables"

2. **Prepare Variable Values**
   - Have all values ready before starting
   - Use the checklist below

### 3.2 Database Variables

Add these variables with **Production** scope only:

#### DATABASE_URL
- **Value**: Neon pooled connection string (with `-pooler`)
- **Environment**: Production only
- **Example**: `postgresql://user:pass@host-pooler.us-east-2.aws.neon.tech/db?sslmode=require`

#### DATABASE_URL_UNPOOLED
- **Value**: Neon direct connection string (without `-pooler`)
- **Environment**: Production only
- **Example**: `postgresql://user:pass@host.us-east-2.aws.neon.tech/db?sslmode=require`

### 3.3 Redis Variables

Add these variables with **Production** scope only:

#### REDIS_URL
- **Value**: Upstash REST URL
- **Environment**: Production only
- **Example**: `https://us1-merry-cat-12345.upstash.io`

#### REDIS_TOKEN
- **Value**: Upstash REST token
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Example**: `AXlzASQgNzk4YjQ5YTktMGVhZC00NzE5LWI4ZjYtOTM0ZDQ5ZjI1YmU0abc123`

### 3.4 Inngest Variables

Add these variables with **Production** scope only:

#### INNGEST_EVENT_KEY
- **Value**: Production event key from Inngest dashboard
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Get from**: Inngest Dashboard → Your App → Manage → Keys → Event Key

#### INNGEST_SIGNING_KEY
- **Value**: Production signing key from Inngest dashboard
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Format**: `signkey-prod-[hex-string]`
- **Get from**: Inngest Dashboard → Your App → Manage → Keys → Signing Key

### 3.5 Blockchain Variables (Mainnet)

Add these variables with **Production** scope only:

#### BLOCKFROST_PROJECT_ID
- **Value**: Mainnet Blockfrost project ID
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Format**: `mainnet[project-id]`
- **Get from**: https://blockfrost.io/dashboard

#### BLOCKFROST_IPFS_PROJECT_ID
- **Value**: Blockfrost IPFS project ID
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Format**: `ipfs[project-id]`

#### CARDANO_NETWORK
- **Value**: `mainnet`
- **Environment**: Production only

#### NFT_POLICY_ID
- **Value**: Your mainnet NFT policy ID (56-char hex)
- **Environment**: Production only
- **Example**: `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2`

#### PAYMENT_ADDRESS
- **Value**: Mainnet Cardano address (starts with `addr1`)
- **Environment**: Production only
- **Example**: `addr1qxyz...`
- **⚠️ Ensure this wallet has sufficient ADA for transaction fees**

#### WALLET_SEED_PHRASE
- **Value**: 24-word mnemonic for mainnet wallet
- **Environment**: Production only
- **Sensitive**: ⚠️ **CRITICAL SECRET** - Mark as secret
- **Format**: 24 words separated by spaces
- **⚠️ This is the most sensitive variable - never share or commit**

#### ROYALTY_ADDRESS
- **Value**: Mainnet address for royalty payments
- **Environment**: Production only
- **Example**: `addr1qxyz...` (can be same as PAYMENT_ADDRESS)

#### ROYALTY_RATE
- **Value**: Decimal royalty rate (e.g., `0.025` for 2.5%)
- **Environment**: Production only
- **Recommended**: 0.025 to 0.10

### 3.6 Authentication Variables

Add these variables with **Production** scope only:

#### JWT_SECRET
- **Value**: Strong random string (min 32 characters)
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret
- **Generate**: `openssl rand -base64 32`
- **⚠️ Must be different from preview/development secrets**

#### JWT_ISSUER
- **Value**: `trivia-nft`
- **Environment**: Production only

### 3.7 Optional S3 Variables (if keeping S3)

If using S3 for asset storage:

#### S3_BUCKET
- **Value**: Production S3 bucket name
- **Environment**: Production only

#### S3_REGION
- **Value**: AWS region (e.g., `us-east-1`)
- **Environment**: Production only

#### AWS_ACCESS_KEY_ID
- **Value**: IAM access key
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret

#### AWS_SECRET_ACCESS_KEY
- **Value**: IAM secret key
- **Environment**: Production only
- **Sensitive**: ✅ Mark as secret

### 3.8 Production Flags

#### MINT_TO_BACKEND_WALLET
- **Value**: `false`
- **Environment**: Production only
- **Purpose**: Mint NFTs to user's wallet (not backend wallet)

### 3.9 Verify All Variables

After adding all variables, verify:

1. **Count**: Should have 11-17 variables depending on optional ones
2. **Scopes**: All set to "Production" only
3. **Secrets**: All sensitive variables marked as secret
4. **Values**: All values are production-ready (mainnet, strong secrets)

---

## 4. Set up Production Inngest Environment

### 4.1 Access Inngest Dashboard

1. **Navigate to Inngest**
   - Go to: https://www.inngest.com/dashboard
   - Sign in to your account

2. **Select Your App**
   - Click on your app (e.g., "trivia-nft")
   - Or create a new app if needed

### 4.2 Create Production Environment

1. **Navigate to Environments**
   - Click "Manage" → "Environments"
   - You should see existing environments (Development, Preview)

2. **Verify Production Environment**
   - Production environment is created automatically
   - Verify it's listed and active

### 4.3 Configure Production Keys

1. **Navigate to Keys**
   - Click "Manage" → "Keys"
   - You'll see keys for each environment

2. **Get Production Keys**
   - **Event Key**: Used to send events from your API
   - **Signing Key**: Used to verify requests from Inngest
   - Copy both keys securely

3. **Verify Keys in Vercel**
   - Ensure these keys match what you added to Vercel environment variables
   - `INNGEST_EVENT_KEY` = Event Key
   - `INNGEST_SIGNING_KEY` = Signing Key (starts with `signkey-prod-`)

### 4.4 Configure Webhook URL

1. **Navigate to Webhooks**
   - Click "Manage" → "Webhooks"

2. **Add Production Webhook**
   - **URL**: `https://[your-production-domain].vercel.app/api/inngest`
   - **Environment**: Production
   - Click "Add Webhook"

3. **Test Webhook**
   - Click "Test" to send a test request
   - Verify it returns 200 OK
   - Check Vercel logs for incoming request

### 4.5 Configure Workflow Settings

1. **Navigate to Functions**
   - Click "Functions" to see registered workflows
   - You should see:
     - `mint-nft` (mint workflow)
     - `forge-nft` (forge workflow)

2. **Configure Retry Settings** (if needed)
   - Default: 3 retries with exponential backoff
   - Can customize per function if needed

3. **Configure Timeout Settings**
   - Default: 5 minutes per step
   - Increase if blockchain confirmations take longer

### 4.6 Set Up Monitoring and Alerts

1. **Enable Monitoring**
   - Go to "Monitoring" tab
   - Review metrics:
     - Function runs
     - Success rate
     - Average duration
     - Error rate

2. **Configure Alerts** (if available on your plan)
   - **High Error Rate**: Alert if >5% of runs fail
   - **Long Duration**: Alert if runs take >10 minutes
   - **Failed Runs**: Alert on any failed run

3. **Set Up Notification Channels**
   - Email notifications
   - Slack integration (if available)
   - Webhook notifications

### 4.7 Configure Rate Limits

1. **Review Rate Limits**
   - Go to "Settings" → "Rate Limits"
   - Default limits should be sufficient for most cases

2. **Adjust if Needed**
   - Increase limits if you expect high volume
   - Set up throttling to prevent abuse

### 4.8 Test Production Environment

1. **Deploy to Production** (after all configuration)
   ```bash
   git checkout main
   git pull origin main
   vercel --prod
   ```

2. **Verify Inngest Connection**
   - Check Inngest dashboard for incoming requests
   - Verify functions are registered
   - Check webhook delivery logs

3. **Test Workflow Execution**
   - Trigger a test mint workflow
   - Monitor execution in Inngest dashboard
   - Verify all steps complete successfully

---

## Verification Checklist

After completing all sub-tasks, verify:

### Database
- [ ] Production Neon database created
- [ ] Migrations run successfully
- [ ] Connection pooling configured
- [ ] Backup and monitoring enabled
- [ ] Connection strings added to Vercel

### Redis
- [ ] Production Upstash Redis created
- [ ] Connection tested successfully
- [ ] REST API credentials added to Vercel
- [ ] Monitoring enabled

### Environment Variables
- [ ] All 11-17 variables configured in Vercel
- [ ] All variables scoped to "Production" only
- [ ] All sensitive variables marked as secret
- [ ] All values are production-ready (mainnet, strong secrets)
- [ ] No development/preview values in production

### Inngest
- [ ] Production environment verified
- [ ] Production keys configured in Vercel
- [ ] Webhook URL configured
- [ ] Functions registered
- [ ] Monitoring and alerts enabled

### Security
- [ ] Different secrets for production vs preview/development
- [ ] Strong, randomly generated secrets (min 32 chars)
- [ ] Mainnet credentials only in production
- [ ] Testnet credentials only in preview/development
- [ ] WALLET_SEED_PHRASE is mainnet wallet
- [ ] PAYMENT_ADDRESS has sufficient ADA

### Testing
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] Inngest webhook tested
- [ ] Ready for production deployment (Task 24)

---

## Next Steps

After completing Task 22:

1. ✅ Mark Task 22 as complete in `tasks.md`
2. ➡️ Proceed to Task 23: Data migration (if migrating from existing database)
3. ➡️ Or skip to Task 24: Deploy to production (if no data migration needed)

---

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to Neon database

**Solutions**:
- Verify connection string includes `?sslmode=require`
- Check database is not paused (free tier auto-pauses)
- Verify IP allowlist if configured
- Test with `psql` command locally

### Redis Connection Issues

**Problem**: Cannot connect to Upstash Redis

**Solutions**:
- Verify REDIS_URL uses `https://` (not `redis://`)
- Check REDIS_TOKEN is correct
- Test with curl command
- Verify database is active in Upstash console

### Inngest Webhook Issues

**Problem**: Inngest cannot reach webhook endpoint

**Solutions**:
- Verify webhook URL is correct production domain
- Check Vercel deployment is live
- Verify INNGEST_SIGNING_KEY is correct
- Check Vercel logs for incoming requests
- Test webhook manually from Inngest dashboard

### Environment Variable Issues

**Problem**: Variables not accessible in production

**Solutions**:
- Verify variables are scoped to "Production"
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables
- Check Vercel deployment logs for errors

---

## Security Reminders

### Critical Secrets

These variables are **CRITICAL** and must be kept secret:

1. **WALLET_SEED_PHRASE**: Controls mainnet wallet with real ADA and NFTs
2. **JWT_SECRET**: Compromised secret allows token forgery
3. **INNGEST_SIGNING_KEY**: Prevents unauthorized workflow execution
4. **BLOCKFROST_PROJECT_ID**: Prevents unauthorized blockchain access

### Best Practices

- ✅ Use different secrets for each environment
- ✅ Rotate secrets every 90 days
- ✅ Never commit secrets to Git
- ✅ Never share secrets in chat or email
- ✅ Use strong, randomly generated secrets
- ✅ Monitor access logs for suspicious activity
- ✅ Enable 2FA on all service accounts

---

## References

- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Blockfrost API](https://docs.blockfrost.io/)
- [Cardano Documentation](https://docs.cardano.org/)

---

## Support

If you encounter issues:

1. Check service status pages:
   - [Neon Status](https://neonstatus.com/)
   - [Upstash Status](https://status.upstash.com/)
   - [Inngest Status](https://status.inngest.com/)
   - [Vercel Status](https://www.vercel-status.com/)

2. Review documentation:
   - `.kiro/specs/vercel-inngest-deployment/design.md`
   - `.kiro/specs/vercel-inngest-deployment/requirements.md`
   - `VERCEL_ENV_SETUP.md`

3. Check logs:
   - Vercel deployment logs
   - Inngest dashboard logs
   - Neon query logs
   - Upstash metrics

4. Contact support:
   - Neon: support@neon.tech
   - Upstash: support@upstash.com
   - Inngest: support@inngest.com
   - Vercel: support@vercel.com
