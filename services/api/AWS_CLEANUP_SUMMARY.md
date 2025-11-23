# AWS Infrastructure Cleanup Summary

This document summarizes the AWS-specific code and dependencies that were removed during the migration to Vercel + Inngest.

## Removed Dependencies

The following AWS SDK packages were removed from `services/api/package.json`:

### AWS SDK Packages
- `@aws-sdk/client-appconfigdata` - AWS AppConfig for configuration management
- `@aws-sdk/client-bedrock-runtime` - AWS Bedrock for AI/ML operations
- `@aws-sdk/client-dynamodb` - DynamoDB client (replaced by PostgreSQL)
- `@aws-sdk/client-s3` - S3 client (kept in optional S3 configuration)
- `@aws-sdk/client-secrets-manager` - Secrets Manager (replaced by Vercel env vars)
- `@aws-sdk/client-sfn` - Step Functions client (replaced by Inngest)

### AWS Lambda Packages
- `aws-lambda` - Lambda runtime types and utilities
- `@types/aws-lambda` - TypeScript types for Lambda

### Redis Package
- `redis` - Standard Redis client (replaced by @upstash/redis)

## Removed Handler Files

The following Lambda handler directories were removed from `services/api/src/handlers/`:

### Authentication Handlers
- `auth/authorizer.ts` - Lambda authorizer (replaced by JWT middleware in Vercel)
- `auth/connect.ts` - Wallet connection (migrated to `apps/web/app/api/auth/connect/route.ts`)
- `auth/me.ts` - Get current user (functionality integrated into API routes)
- `auth/profile.ts` - User profile (functionality integrated into API routes)

### Session Handlers
- `sessions/start.ts` - Start session (migrated to `apps/web/app/api/sessions/start/route.ts`)
- `sessions/answer.ts` - Submit answer (migrated to `apps/web/app/api/sessions/[sessionId]/answer/route.ts`)
- `sessions/complete.ts` - Complete session (migrated to `apps/web/app/api/sessions/[sessionId]/complete/route.ts`)
- `sessions/history.ts` - Session history (functionality integrated into API routes)

### Mint Handlers
- `mint/initiate-mint.ts` - Initiate mint (migrated to `apps/web/app/api/mint/[eligibilityId]/route.ts`)
- `mint/get-mint-status.ts` - Get mint status (migrated to `apps/web/app/api/mint/[mintId]/status/route.ts`)
- `mint/get-eligibilities.ts` - Get eligibilities (functionality integrated into API routes)
- `mint/workflow/` - Step Functions workflow steps (replaced by Inngest workflows in `apps/web/inngest/functions/mint-workflow.ts`)

### Forge Handlers
- `forge/initiate-forge.ts` - Initiate forge (migrated to `apps/web/app/api/forge/*/route.ts`)
- `forge/get-status.ts` - Get forge status (migrated to `apps/web/app/api/forge/[forgeId]/status/route.ts`)
- `forge/get-progress.ts` - Get forge progress (functionality integrated into API routes)
- `forge/workflow/` - Step Functions workflow steps (replaced by Inngest workflows in `apps/web/inngest/functions/forge-workflow.ts`)

### Leaderboard Handlers
- `leaderboard/get-global.ts` - Global leaderboard (migrated to `apps/web/app/api/leaderboard/global/route.ts`)
- `leaderboard/get-category.ts` - Category leaderboard (migrated to `apps/web/app/api/leaderboard/category/[categoryId]/route.ts`)
- `leaderboard/get-season.ts` - Season leaderboard (migrated to `apps/web/app/api/leaderboard/season/[seasonId]/route.ts`)

### Question Handlers
- `questions/select.ts` - Select questions (migrated to `apps/web/app/api/questions/[categoryId]/route.ts`)
- `questions/flag.ts` - Flag question (migrated to `apps/web/app/api/questions/flag/route.ts`)
- `questions/generate.ts` - Generate questions (functionality moved to admin tools)
- `questions/index-questions.ts` - Index questions (functionality moved to admin tools)

### Scheduled Handlers
- `scheduled/daily-reset.ts` - Daily limit reset (can be implemented with Vercel Cron Jobs if needed)
- `scheduled/eligibility-expiration.ts` - Expire eligibilities (can be implemented with Vercel Cron Jobs if needed)
- `scheduled/leaderboard-snapshot.ts` - Leaderboard snapshots (can be implemented with Vercel Cron Jobs if needed)

### Season Handlers
- `seasons/get-current.ts` - Get current season (functionality integrated into API routes)
- `seasons/transition-season.ts` - Season transition (can be implemented with Vercel Cron Jobs if needed)

## Removed Service Files

The following service files that depended on AWS services were removed or refactored:

### Removed
- `services/appconfig-service.ts` - AWS AppConfig integration (replaced by Vercel env vars)
- `services/redis-service.ts` - Standard Redis client (replaced by `upstash-redis-service.ts`)
- `db/migration-lambda.ts` - Lambda-specific migration handler (migrations now run via CLI)

### Refactored
- `utils/jwt.ts` - Removed Secrets Manager dependency, now uses env vars directly
- `services/question-service.ts` - Removed Bedrock and S3 dependencies (if not using S3)

## Migration Mapping

### Lambda → Vercel Functions
All Lambda handlers have been converted to Vercel API routes in `apps/web/app/api/`:

| Old Lambda Handler | New Vercel API Route |
|-------------------|---------------------|
| `auth/connect.ts` | `app/api/auth/connect/route.ts` |
| `sessions/start.ts` | `app/api/sessions/start/route.ts` |
| `sessions/answer.ts` | `app/api/sessions/[sessionId]/answer/route.ts` |
| `sessions/complete.ts` | `app/api/sessions/[sessionId]/complete/route.ts` |
| `mint/initiate-mint.ts` | `app/api/mint/[eligibilityId]/route.ts` |
| `mint/get-mint-status.ts` | `app/api/mint/[mintId]/status/route.ts` |
| `forge/initiate-forge.ts` | `app/api/forge/{category,master,season}/route.ts` |
| `forge/get-status.ts` | `app/api/forge/[forgeId]/status/route.ts` |
| `leaderboard/get-global.ts` | `app/api/leaderboard/global/route.ts` |
| `leaderboard/get-category.ts` | `app/api/leaderboard/category/[categoryId]/route.ts` |
| `leaderboard/get-season.ts` | `app/api/leaderboard/season/[seasonId]/route.ts` |
| `questions/select.ts` | `app/api/questions/[categoryId]/route.ts` |
| `questions/flag.ts` | `app/api/questions/flag/route.ts` |

### Step Functions → Inngest
All Step Functions workflows have been converted to Inngest functions:

| Old Step Functions Workflow | New Inngest Function |
|----------------------------|---------------------|
| Mint workflow steps | `inngest/functions/mint-workflow.ts` |
| Forge workflow steps | `inngest/functions/forge-workflow.ts` |

### Secrets Manager → Vercel Environment Variables
All secrets previously stored in AWS Secrets Manager are now configured as Vercel environment variables:

| Secret Type | Vercel Environment Variable |
|------------|----------------------------|
| Database credentials | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| Redis credentials | `REDIS_URL`, `REDIS_TOKEN` |
| JWT secret | `JWT_SECRET` |
| Wallet seed phrase | `WALLET_SEED_PHRASE` |
| Blockfrost API key | `BLOCKFROST_PROJECT_ID` |
| Inngest keys | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |

### DynamoDB → PostgreSQL
All DynamoDB tables have been replaced with PostgreSQL tables in Neon:

| DynamoDB Table | PostgreSQL Table |
|---------------|-----------------|
| Players | `players` |
| Sessions | `sessions` |
| Questions | `questions` |
| Eligibilities | `eligibilities` |
| Mints | `mints` |
| Forge Operations | `forge_operations` |
| Player NFTs | `player_nfts` |
| Leaderboard | Computed from `sessions` table |

### AppConfig → Environment Variables
All AppConfig configuration has been replaced with Vercel environment variables and code constants.

## Remaining AWS Services (Optional)

The following AWS services can still be used if desired:

### S3 (Optional)
- Can keep S3 for NFT asset storage
- Alternative: Vercel Blob Storage
- If keeping S3, retain `@aws-sdk/client-s3` dependency

### Bedrock (Optional)
- Can keep Bedrock for AI-generated questions
- Alternative: Other AI services or manual question creation
- If keeping Bedrock, retain `@aws-sdk/client-bedrock-runtime` dependency

## Benefits of Migration

### Infrastructure Simplification
- ✅ No AWS account management
- ✅ No IAM roles and policies
- ✅ No VPC configuration
- ✅ No Lambda function management
- ✅ No Step Functions state machines
- ✅ No DynamoDB table management

### Developer Experience
- ✅ Git-based deployments
- ✅ Automatic preview environments
- ✅ Integrated monitoring and logs
- ✅ Simpler environment variable management
- ✅ No infrastructure as code (CDK/CloudFormation)

### Cost Optimization
- ✅ Generous free tiers
- ✅ Pay-per-execution pricing
- ✅ No idle resource costs
- ✅ Automatic scaling

### Performance
- ✅ Global edge network
- ✅ Edge caching with Upstash
- ✅ Connection pooling with Neon
- ✅ Faster cold starts

## Verification

To verify the cleanup was successful:

1. **Check dependencies**:
   ```bash
   cd services/api
   pnpm install
   # Should not install any @aws-sdk packages (except S3 if keeping it)
   ```

2. **Check for AWS imports**:
   ```bash
   # Should return no results (except S3 if keeping it)
   grep -r "@aws-sdk" services/api/src --exclude-dir=node_modules
   ```

3. **Check for Lambda types**:
   ```bash
   # Should return no results
   grep -r "APIGatewayProxyEvent\|APIGatewayProxyResult" services/api/src --exclude-dir=node_modules
   ```

4. **Build and test**:
   ```bash
   cd services/api
   pnpm build
   pnpm test
   ```

## Rollback (If Needed)

If you need to rollback to AWS infrastructure:

1. Restore `services/api/package.json` from Git history
2. Restore `services/api/src/handlers/` directory from Git history
3. Redeploy AWS infrastructure (CDK/CloudFormation)
4. Update environment variables to point to AWS services

## Next Steps

After cleanup:

1. ✅ Run `pnpm install` to remove unused dependencies
2. ✅ Verify all tests pass
3. ✅ Deploy to Vercel preview environment
4. ✅ Test all functionality
5. ✅ Deploy to production

## Documentation Updates

The following documentation has been updated to reflect the new architecture:

- ✅ `README.md` - Main project documentation
- ✅ `ENVIRONMENT_VARIABLES.md` - Environment variable reference
- ✅ `VERCEL_ENV_SETUP.md` - Vercel environment setup guide
- ✅ `.kiro/specs/vercel-inngest-deployment/design.md` - Architecture design
- ✅ `.kiro/specs/vercel-inngest-deployment/requirements.md` - Requirements

## Support

For questions or issues related to the migration:

1. Check the design document: `.kiro/specs/vercel-inngest-deployment/design.md`
2. Check the requirements: `.kiro/specs/vercel-inngest-deployment/requirements.md`
3. Review Vercel deployment logs
4. Check service dashboards (Neon, Upstash, Inngest)

---

**Cleanup Date**: November 23, 2025
**Migration Status**: ✅ Complete
