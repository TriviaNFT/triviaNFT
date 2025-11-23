# Vercel Environment Variables Configuration

This directory contains comprehensive documentation and tooling for configuring environment variables in Vercel for the TriviaNFT application migration.

## 📚 Documentation Files

### 1. Quick Start
**[VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md)** - Start here!
- Quick reference checklist of all variables
- Environment scope settings
- Security checklist
- Validation steps

### 2. Comprehensive Guide
**[VERCEL_ENV_SETUP.md](VERCEL_ENV_SETUP.md)** - Complete reference
- Detailed setup instructions for each variable
- Where to get each value
- Format specifications and examples
- Environment-specific configurations
- Troubleshooting guide
- Security best practices

### 3. Template File
**[.env.vercel.example](.env.vercel.example)** - Copy-paste template
- All variables with comments
- Format examples
- Configuration instructions

### 4. Task Summary
**[TASK_4_COMPLETION_SUMMARY.md](TASK_4_COMPLETION_SUMMARY.md)** - Implementation details
- What was delivered
- Requirements satisfied
- How to use the documentation
- Next steps

## 🛠️ Verification Tool

### Automated Verification Script
**[scripts/verify-vercel-env.ts](scripts/verify-vercel-env.ts)**

Validates that all required environment variables are configured correctly.

**Usage**:
```bash
# From services/api directory
cd services/api
pnpm verify:env

# Or from project root
npx tsx scripts/verify-vercel-env.ts

# For specific environment
npx tsx scripts/verify-vercel-env.ts --env production
```

**What it checks**:
- ✅ All required variables are set
- ✅ Variable formats are correct
- ✅ Network consistency (testnet vs mainnet)
- ✅ Database URL consistency (pooled vs unpooled)
- ✅ Provides detailed error messages

## 🚀 Quick Start Guide

### Step 1: Review Documentation
```bash
# Read the quick checklist
cat VERCEL_ENV_CHECKLIST.md

# Read the comprehensive guide
cat VERCEL_ENV_SETUP.md
```

### Step 2: Gather Credentials

Collect the following from previous tasks:
- ✅ Neon database connection strings (Task 1)
- ✅ Upstash Redis credentials (Task 2)
- ✅ Inngest keys (Task 3)
- 📝 Blockfrost API keys
- 📝 Cardano wallet information
- 📝 JWT secret (generate new)

### Step 3: Configure in Vercel

1. Go to Vercel project settings:
   ```
   https://vercel.com/[your-team]/[your-project]/settings/environment-variables
   ```

2. Add each variable from the checklist

3. Set environment scopes:
   - Production: Mainnet credentials
   - Preview: Testnet credentials
   - Development: Local/dev credentials

4. Mark sensitive variables as secret

### Step 4: Verify Configuration

```bash
cd services/api
pnpm verify:env
```

Expected output when configured correctly:
```
✅ VERIFICATION PASSED
All required environment variables are configured correctly!
```

## 📋 Required Variables (16)

### Database (2)
- `DATABASE_URL` - Neon pooled connection
- `DATABASE_URL_UNPOOLED` - Neon direct connection

### Redis (2)
- `REDIS_URL` - Upstash REST URL
- `REDIS_TOKEN` - Upstash REST token

### Inngest (2)
- `INNGEST_EVENT_KEY` - Event key
- `INNGEST_SIGNING_KEY` - Signing key

### Blockchain (7)
- `BLOCKFROST_PROJECT_ID` - Cardano API
- `BLOCKFROST_IPFS_PROJECT_ID` - IPFS uploads
- `CARDANO_NETWORK` - Network (preprod/mainnet)
- `NFT_POLICY_ID` - Policy ID
- `PAYMENT_ADDRESS` - Transaction fee address
- `WALLET_SEED_PHRASE` - 24-word seed phrase ⚠️
- `ROYALTY_ADDRESS` - Royalty recipient
- `ROYALTY_RATE` - Royalty percentage

### Authentication (2)
- `JWT_SECRET` - Token signing secret ⚠️
- `JWT_ISSUER` - App identifier

## 🔒 Security Warnings

### Critical Secrets
These variables contain highly sensitive information:
- ⚠️ `WALLET_SEED_PHRASE` - Controls wallet funds
- ⚠️ `JWT_SECRET` - Authenticates users
- ⚠️ `AWS_SECRET_ACCESS_KEY` - AWS account access

### Best Practices
- ✅ Use different secrets for each environment
- ✅ Never commit secrets to Git
- ✅ Mark sensitive variables as secret in Vercel
- ✅ Use testnet for development/preview
- ✅ Rotate secrets every 90 days

## 🔍 Troubleshooting

### Verification Script Fails

**Problem**: Script shows missing variables
```
❌ Missing required variable: DATABASE_URL
```

**Solution**: Configure the variable in Vercel and redeploy

### Network Mismatch

**Problem**: Network consistency error
```
❌ Network mismatch: CARDANO_NETWORK=preprod but BLOCKFROST_PROJECT_ID uses mainnet
```

**Solution**: Ensure all blockchain variables use the same network

### Database Connection Fails

**Problem**: Connection timeout or refused
```
ECONNREFUSED
```

**Solution**: 
- Verify DATABASE_URL includes `-pooler`
- Check SSL mode: `?sslmode=require`
- Verify Neon database is active

## 📖 Additional Resources

### External Documentation
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Upstash Redis REST API](https://docs.upstash.com/redis/features/restapi)
- [Inngest Environment Variables](https://www.inngest.com/docs/platform/environments)
- [Blockfrost API](https://docs.blockfrost.io/)

### Project Documentation
- [Requirements](.kiro/specs/vercel-inngest-deployment/requirements.md)
- [Design](.kiro/specs/vercel-inngest-deployment/design.md)
- [Tasks](.kiro/specs/vercel-inngest-deployment/tasks.md)

## ✅ Completion Checklist

Before proceeding to Task 5:

- [ ] Read VERCEL_ENV_CHECKLIST.md
- [ ] Read VERCEL_ENV_SETUP.md
- [ ] Gathered all required credentials
- [ ] Configured all 16 required variables in Vercel
- [ ] Set environment scopes correctly
- [ ] Marked sensitive variables as secret
- [ ] Ran verification script successfully
- [ ] Tested preview deployment

## 🎯 Next Steps

After completing this task:

1. ✅ Mark Task 4 complete in `tasks.md`
2. ➡️ Proceed to Task 5: Update database connection configuration
3. ➡️ Continue with remaining migration tasks

## 💡 Tips

### For Development
- Use Inngest Dev Server (no keys needed)
- Use testnet for blockchain operations
- Can use local PostgreSQL or Neon dev database

### For Preview Deployments
- Neon automatically creates database branches
- Inngest automatically creates sandbox environments
- Use testnet credentials

### For Production
- Use mainnet credentials
- Ensure all secrets are rotated from development
- Monitor deployment logs carefully

## 🤝 Getting Help

If you encounter issues:

1. Check the troubleshooting section in VERCEL_ENV_SETUP.md
2. Run the verification script for detailed errors
3. Review Vercel deployment logs
4. Check service dashboards (Neon, Upstash, Inngest)
5. Refer to the design document for architecture details

---

**Task 4 Status**: ✅ Complete

All documentation and tooling has been created. Ready to configure variables in Vercel and proceed to Task 5.
