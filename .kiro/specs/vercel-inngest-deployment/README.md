# Vercel + Inngest Deployment Specification

This directory contains the complete specification for migrating the TriviaNFT application from AWS infrastructure (Lambda, Step Functions, DynamoDB) to Vercel + Inngest architecture.

## 📋 Specification Documents

### Core Documents

1. **[requirements.md](requirements.md)** - Detailed requirements using EARS patterns
   - Database migration to Neon PostgreSQL
   - Redis migration to Upstash
   - Workflow migration to Inngest
   - API migration to Vercel Functions
   - Environment configuration
   - Testing requirements

2. **[design.md](design.md)** - Comprehensive design document
   - Architecture diagrams
   - Component interfaces
   - Data models
   - Correctness properties
   - Error handling strategies
   - Testing strategy
   - Migration approach

3. **[tasks.md](tasks.md)** - Implementation task list
   - 27 main tasks with sub-tasks
   - Property-based testing tasks
   - Checkpoint tasks
   - Progress tracking

## 📚 Setup Guides

### Environment Configuration

- **[VERCEL_ENV_SETUP.md](../../VERCEL_ENV_SETUP.md)** - Detailed environment variable setup guide
- **[VERCEL_ENV_CHECKLIST.md](../../VERCEL_ENV_CHECKLIST.md)** - Quick checklist for environment variables
- **[.env.vercel.example](../../.env.vercel.example)** - Example environment variable file

### Production Setup (Task 22)

- **[PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md)** - Complete production environment setup guide
  - Neon PostgreSQL production setup
  - Upstash Redis production setup
  - Vercel environment variable configuration
  - Inngest production environment setup
  - Security best practices
  - Verification procedures

- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Quick checklist for production setup
  - Sub-task tracking
  - Verification steps
  - Security checks
  - Troubleshooting tips

### Verification Scripts

- **[scripts/verify-production-env.ts](../../scripts/verify-production-env.ts)** - Automated production environment verification
  - Validates all required variables
  - Checks for production-ready values
  - Ensures no development values in production
  - Verifies security requirements

## 🚀 Current Status

### Completed Tasks (1-21)

✅ Tasks 1-21 have been completed and tested:
- Infrastructure setup (Neon, Upstash, Inngest)
- Code migration (API routes, workflows)
- Testing (unit tests, property tests, integration tests)
- Preview deployment and validation

See checkpoint summaries:
- [CHECKPOINT_21_FINAL.md](CHECKPOINT_21_FINAL.md)
- [CHECKPOINT_21_SUMMARY.md](CHECKPOINT_21_SUMMARY.md)
- [TEST_RESULTS_AFTER_ENV_FIX.md](TEST_RESULTS_AFTER_ENV_FIX.md)

### Current Task (22)

🔄 **Task 22: Configure production environment**

This task involves:
1. Setting up production Neon database
2. Setting up production Upstash Redis
3. Configuring production environment variables in Vercel
4. Setting up production Inngest environment

**Status**: In Progress

**Documentation**:
- [PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md) - Complete setup instructions
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Quick checklist

### Remaining Tasks (23-27)

- [ ] Task 23: Data migration (if migrating from existing database)
- [ ] Task 24: Deploy to production
- [ ] Task 25: Post-deployment monitoring
- [ ] Task 26: Documentation and cleanup
- [ ] Task 27: Final checkpoint - Production validation

## 📖 How to Use This Specification

### For Implementation

1. **Read the requirements** ([requirements.md](requirements.md))
   - Understand what needs to be built
   - Review acceptance criteria
   - Note correctness properties

2. **Review the design** ([design.md](design.md))
   - Understand the architecture
   - Review component interfaces
   - Study error handling strategies

3. **Follow the tasks** ([tasks.md](tasks.md))
   - Execute tasks in order
   - Mark tasks as complete
   - Run tests after each task

### For Production Setup (Current Task)

1. **Read the production setup guide** ([PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md))
   - Follow step-by-step instructions
   - Complete all sub-tasks
   - Verify each step

2. **Use the checklist** ([PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md))
   - Track progress
   - Ensure nothing is missed
   - Verify completion criteria

3. **Run verification script**
   ```bash
   tsx scripts/verify-production-env.ts
   ```

4. **Review security requirements**
   - Different secrets for each environment
   - Strong, randomly generated secrets
   - Mainnet credentials only in production
   - No development values in production

### For Testing

1. **Unit Tests**: Run with `pnpm test`
2. **Property Tests**: Run with `pnpm test` (included in unit tests)
3. **Integration Tests**: Run with `pnpm test:integration`
4. **E2E Tests**: Run with `pnpm test:e2e`

## 🔐 Security Considerations

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

## 📊 Architecture Overview

### Current (AWS)
```
Client → API Gateway → Lambda → PostgreSQL
                     ↓         ↓ Redis
                Step Functions → S3
                     ↓
                Blockfrost
```

### Target (Vercel + Inngest)
```
Client → Vercel Edge → Vercel Functions → Neon PostgreSQL
                                        ↓ Upstash Redis
                       Inngest Workflows → S3/Blob
                                        ↓
                                   Blockfrost
```

## 🔗 External Resources

### Service Documentation
- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Blockfrost API](https://docs.blockfrost.io/)

### Service Dashboards
- [Neon Console](https://console.neon.tech/)
- [Upstash Console](https://console.upstash.com/)
- [Inngest Dashboard](https://www.inngest.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Blockfrost Dashboard](https://blockfrost.io/dashboard)

### Service Status
- [Neon Status](https://neonstatus.com/)
- [Upstash Status](https://status.upstash.com/)
- [Inngest Status](https://status.inngest.com/)
- [Vercel Status](https://www.vercel-status.com/)

## 🆘 Support

If you encounter issues:

1. **Check documentation** in this directory
2. **Review service status** pages
3. **Check service dashboards** for errors
4. **Review logs**:
   - Vercel deployment logs
   - Inngest workflow logs
   - Neon query logs
   - Upstash metrics

4. **Contact support**:
   - Neon: support@neon.tech
   - Upstash: support@upstash.com
   - Inngest: support@inngest.com
   - Vercel: support@vercel.com

## 📝 Notes

### Migration Benefits

1. **Simplified Infrastructure**: No AWS account management, IAM roles, or VPC configuration
2. **Preview Environments**: Automatic database branching and isolated environments per Git branch
3. **Edge Distribution**: Global CDN and edge functions for low latency
4. **Developer Experience**: Git-based deployments, instant rollbacks, and integrated monitoring
5. **Cost Optimization**: Pay-per-execution pricing with generous free tiers

### Key Design Decisions

1. **Neon PostgreSQL**: Native Vercel integration, database branching, serverless pooling
2. **Upstash Redis**: Serverless Redis with edge caching and REST API
3. **Inngest**: Better DX than Step Functions, automatic retries, no infrastructure
4. **Vercel Functions**: Zero-config deployment, edge network distribution
5. **Schema Preservation**: No database changes required - full PostgreSQL compatibility

## 🎯 Success Criteria

The migration is successful when:

- ✅ All existing functionality works identically
- ✅ API contracts are maintained (same endpoints, responses)
- ✅ Database schema is preserved
- ✅ All tests pass (unit, property, integration, E2E)
- ✅ Preview environments work automatically
- ✅ Production deployment is stable
- ✅ Performance is equal or better
- ✅ Monitoring and alerts are configured
- ✅ Documentation is complete

## 📅 Timeline

- **Tasks 1-21**: Completed ✅
- **Task 22**: In Progress 🔄 (Production environment setup)
- **Tasks 23-27**: Pending ⏳ (Data migration, deployment, monitoring)

---

**Last Updated**: Task 22 in progress
**Next Milestone**: Complete production environment setup
**Target**: Production deployment ready
