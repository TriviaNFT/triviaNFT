# Implementation Plan

- [x] 1. Set up Neon PostgreSQL database


  - Create Neon project and database
  - Configure connection pooling
  - Run all existing migrations to verify compatibility
  - Test database connection from local environment
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Set up Upstash Redis

  - Create Upstash Redis database
  - Configure REST API access
  - Test Redis operations (set, get, delete, expire)
  - Verify edge caching functionality
  - _Requirements: 2.1, 2.3_

- [x] 3. Set up Inngest account and integration





  - Create Inngest account
  - Install Inngest SDK: `pnpm add inngest`
  - Connect Inngest to Vercel project
  - Configure signing keys in Vercel environment variables
  - _Requirements: 3.1, 10.1, 10.3_

- [x] 4. Configure Vercel environment variables





  - Add DATABASE_URL (Neon pooled connection)
  - Add DATABASE_URL_UNPOOLED (Neon direct connection)
  - Add REDIS_URL and REDIS_TOKEN (Upstash)
  - Add INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY
  - Add BLOCKFROST_PROJECT_ID, NFT_POLICY_ID
  - Add JWT_SECRET, JWT_ISSUER
  - Add S3 credentials (if keeping S3)
  - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 5. Update database connection configuration


  - Update database connection to use Neon connection string
  - Configure connection pooling with appropriate pool size
  - Add SSL configuration for Neon
  - Test connection from Vercel Functions
  - _Requirements: 1.1, 1.5_


- [x] 6. Update Redis client to Upstash






  - Install Upstash Redis SDK: `pnpm add @upstash/redis`
  - Replace existing Redis client with Upstash client
  - Update all Redis operations to use Upstash API
  - Test session management with Upstash Redis
  - _Requirements: 2.1, 2.3_


- [x] 6.1 Write property test for Redis retry logic



  - **Property 1: Redis Retry with Exponential Backoff**
  - **Validates: Requirements 2.4**

- [x] 7. Create Inngest client and configuration





  - Create `lib/inngest.ts` with Inngest client initialization
  - Configure Inngest with app ID and event key
  - Export inngest client for use in workflows and API routes
  - _Requirements: 3.1, 10.1_

- [x] 8. Create Inngest API endpoint

  - Create `app/api/inngest/route.ts`
  - Import Inngest serve function from `inngest/next`
  - Configure endpoint to handle GET, POST, PUT requests
  - Add signing key verification
  - Register workflow functions (will be created in next steps)
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 9. Implement mint workflow with Inngest




- [x] 9.1 Create mint workflow function structure


  - Create `inngest/functions/mint-workflow.ts`
  - Define workflow function with event trigger `mint/initiated`
  - Set up workflow configuration (ID, retries, timeout)
  - _Requirements: 3.1, 6.1_

- [x] 9.2 Implement mint workflow steps

  - Add step: Validate eligibility (check ownership, expiration, usage)
  - Add step: Check NFT stock availability for category
  - Add step: Reserve NFT from catalog (mark as minted)
  - Add step: Create mint operation record in database
  - Add step: Submit blockchain transaction via Blockfrost
  - Add step: Sleep for 2 minutes (blockchain confirmation time)
  - Add step: Check transaction confirmation status
  - Add step: Update mint operation status to confirmed
  - Add step: Mark eligibility as used
  - Add step: Create player_nfts record
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.3 Write property test for mint workflow completion


  - **Property 7: Mint Workflow Completion**
  - **Validates: Requirements 9.3**


- [x] 10. Implement forge workflow with Inngest




- [x] 10.1 Create forge workflow function structure


  - Create `inngest/functions/forge-workflow.ts`
  - Define workflow function with event trigger `forge/initiated`
  - Set up workflow configuration (ID, retries, timeout)
  - _Requirements: 3.2, 6.6_

- [x] 10.2 Implement forge workflow steps

  - Add step: Validate NFT ownership for all input fingerprints
  - Add step: Validate forge requirements (10 NFTs, correct categories/tiers)
  - Add step: Create forge operation record in database
  - Add step: Submit burn transaction for input NFTs
  - Add step: Sleep for 2 minutes (blockchain confirmation)
  - Add step: Check burn transaction confirmation
  - Add step: Submit mint transaction for output NFT
  - Add step: Sleep for 2 minutes (blockchain confirmation)
  - Add step: Check mint transaction confirmation
  - Add step: Update forge operation status to confirmed
  - Add step: Update player_nfts records (mark inputs as burned, add output)
  - _Requirements: 6.6, 6.7, 6.8_

- [x] 10.3 Write property test for forge workflow completion


  - **Property 8: Forge Workflow Completion**
  - **Validates: Requirements 9.4**

- [x] 10.4 Write property test for workflow step retry isolation


  - **Property 4: Workflow Step Retry Isolation**
  - **Validates: Requirements 6.9**

- [x] 11. Convert Lambda handlers to Vercel API routes





- [x] 11.1 Convert authentication handlers


  - Create `app/api/auth/connect/route.ts` (POST /auth/connect)
  - Create `app/api/auth/guest/route.ts` (POST /auth/guest)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11.2 Convert session handlers


  - Create `app/api/sessions/start/route.ts` (POST /sessions/start)
  - Create `app/api/sessions/[sessionId]/answer/route.ts` (POST /sessions/:id/answer)
  - Create `app/api/sessions/[sessionId]/complete/route.ts` (POST /sessions/:id/complete)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_


- [x] 11.3 Convert mint handlers


  - Create `app/api/mint/[eligibilityId]/route.ts` (POST /mint/:eligibilityId)
  - Update to trigger Inngest workflow instead of Step Functions
  - Create `app/api/mint/[mintId]/status/route.ts` (GET /mint/:mintId/status)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11.4 Convert forge handlers


  - Create `app/api/forge/category/route.ts` (POST /forge/category)
  - Create `app/api/forge/master/route.ts` (POST /forge/master)
  - Create `app/api/forge/season/route.ts` (POST /forge/season)
  - Update to trigger Inngest workflow instead of Step Functions
  - Create `app/api/forge/[forgeId]/status/route.ts` (GET /forge/:forgeId/status)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11.5 Convert leaderboard handlers


  - Create `app/api/leaderboard/global/route.ts` (GET /leaderboard/global)
  - Create `app/api/leaderboard/category/[categoryId]/route.ts` (GET /leaderboard/category/:id)
  - Create `app/api/leaderboard/season/[seasonId]/route.ts` (GET /leaderboard/season/:id)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11.6 Convert question handlers


  - Create `app/api/questions/[categoryId]/route.ts` (GET /questions/:categoryId)
  - Create `app/api/questions/flag/route.ts` (POST /questions/flag)
  - Maintain identical request/response structure
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11.7 Write property test for JWT verification consistency

  - **Property 2: JWT Token Verification Consistency**
  - **Validates: Requirements 4.3**

- [x] 11.8 Write property test for API response structure consistency

  - **Property 3: API Response Structure Consistency**
  - **Validates: Requirements 4.4**

- [x] 12. Update API route error handling





  - Implement consistent error response format across all routes
  - Add appropriate HTTP status codes for different error types
  - Add error logging with context
  - _Requirements: 4.5_

- [x] 12.1 Write property test for error message appropriateness


  - **Property 10: Error Message Appropriateness**
  - **Validates: Requirements 9.6**


- [x] 13. Create Vercel configuration file





  - Create `vercel.json` in project root
  - Configure build settings (build command, output directory)
  - Configure serverless function settings (timeout, memory)
  - Configure environment variable requirements
  - Configure rewrites/redirects if needed
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 14. Update package.json scripts for Vercel





  - Update build script to work with Vercel
  - Add vercel-build script if needed
  - Ensure all dependencies are in correct sections
  - _Requirements: 8.1_

- [x] 15. Test database migration on Neon





  - Run all migration files against Neon database
  - Verify all tables, indexes, and constraints are created
  - Verify triggers and functions work correctly
  - Compare schema with current database
  - _Requirements: 1.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Checkpoint - Integration testing





  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Test Inngest workflows locally



- [x] 17.1 Set up Inngest Dev Server


  - Install Inngest CLI: `npx inngest-cli@latest dev`
  - Start Inngest Dev Server
  - Verify workflows are registered
  - _Requirements: 3.5_

- [x] 17.2 Test mint workflow execution


  - Trigger mint workflow with test data
  - Verify all steps execute in order
  - Verify database records are created/updated correctly
  - Test failure scenarios and retry behavior
  - _Requirements: 9.3_

- [x] 17.3 Test forge workflow execution

  - Trigger forge workflow with test data
  - Verify all steps execute in order
  - Verify database records are created/updated correctly
  - Test failure scenarios and retry behavior
  - _Requirements: 9.4_


- [x] 18. Test API routes locally





- [x] 18.1 Test authentication endpoints


  - Test wallet connection flow
  - Test guest user creation
  - Verify JWT token generation and verification
  - _Requirements: 9.1_

- [x] 18.2 Test session endpoints

  - Test session creation
  - Test answer submission
  - Test session completion
  - Verify perfect score creates eligibility
  - _Requirements: 9.1, 9.2_


- [x] 18.3 Write property test for session creation

  - **Property 5: Session Creation Success**
  - **Validates: Requirements 9.1**



- [x] 18.4 Write property test for eligibility creation
  - **Property 6: Perfect Score Eligibility Creation**
  - **Validates: Requirements 9.2**

- [x] 18.5 Test mint endpoints

  - Test mint initiation
  - Test mint status checking
  - Verify workflow is triggered
  - _Requirements: 9.3_

- [x] 18.6 Test forge endpoints

  - Test forge initiation for all types (category, master, season)
  - Test forge status checking
  - Verify workflow is triggered
  - _Requirements: 9.4_

- [x] 18.7 Test leaderboard endpoints

  - Test global leaderboard
  - Test category leaderboard
  - Test season leaderboard
  - Verify ranking calculations
  - _Requirements: 9.5_



- [x] 18.8 Write property test for leaderboard ranking
  - **Property 9: Leaderboard Ranking Correctness**
  - **Validates: Requirements 9.5**

- [ ] 19. Deploy to Vercel preview environment

  - Push code to feature branch
  - Verify Vercel creates preview deployment
  - Verify Neon creates database branch
  - Verify Inngest creates sandbox environment
  - _Requirements: 1.4, 8.3, 10.4_


- [-] 20. Test preview deployment



- [ ] 20.1 Verify environment variables are set


  - Check all required environment variables are accessible
  - Verify correct values for preview environment
  - _Requirements: 5.2_

- [ ] 20.2 Test database connectivity
  - Verify API can connect to Neon database branch
  - Test query execution
  - Verify connection pooling works
  - _Requirements: 1.1, 1.3_

- [ ] 20.3 Test Redis connectivity
  - Verify API can connect to Upstash Redis
  - Test Redis operations
  - Verify edge caching works
  - _Requirements: 2.1, 2.2_

- [ ] 20.4 Test Inngest integration
  - Verify Inngest endpoint is accessible
  - Trigger test workflows
  - Verify workflows execute in sandbox environment
  - _Requirements: 10.2, 10.4_

- [ ] 20.5 Run E2E tests against preview deployment
  - Run existing Playwright E2E tests
  - Verify all tests pass
  - Fix any issues found
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 21. Checkpoint - Preview deployment validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Configure production environment
  - Set up production Neon database
  - Set up production Upstash Redis
  - Configure production environment variables in Vercel
  - Set up production Inngest environment
  - _Requirements: 5.1_

- [ ] 23. Data migration (if migrating from existing database)
- [ ] 23.1 Backup current production database
  - Create full database backup
  - Verify backup integrity
  - Store backup securely

- [ ] 23.2 Restore data to Neon production database
  - Restore backup to Neon
  - Verify all data migrated correctly
  - Compare row counts and data integrity
  - Test critical queries


- [ ] 24. Deploy to production
  - Merge feature branch to main
  - Verify Vercel deploys to production automatically
  - Monitor deployment logs for errors
  - _Requirements: 8.4_

- [ ] 25. Post-deployment monitoring
- [ ] 25.1 Monitor error rates
  - Check Vercel logs for errors
  - Check Inngest dashboard for workflow failures
  - Check Neon dashboard for database errors
  - _Requirements: 12.1, 12.5_

- [ ] 25.2 Monitor workflow execution
  - Verify mint workflows complete successfully
  - Verify forge workflows complete successfully
  - Check workflow execution times
  - _Requirements: 12.2_

- [ ] 25.3 Monitor database performance
  - Check query performance in Neon dashboard
  - Identify slow queries
  - Verify connection pooling is working
  - _Requirements: 12.3_

- [ ] 25.4 Monitor API response times
  - Check Vercel Analytics for response times
  - Identify slow endpoints
  - Verify edge caching is working
  - _Requirements: 12.4_

- [ ] 26. Documentation and cleanup
- [ ] 26.1 Update README with new deployment instructions
  - Document Neon setup
  - Document Upstash setup
  - Document Inngest setup
  - Document Vercel deployment process

- [ ] 26.2 Update environment variable documentation
  - List all required environment variables
  - Document where to get each value
  - Provide example values (non-sensitive)

- [ ] 26.3 Remove AWS-specific code and dependencies
  - Remove AWS SDK dependencies (@aws-sdk/client-sfn)
  - Remove Lambda handler wrappers
  - Remove Step Functions state machine definitions
  - Clean up unused imports

- [ ] 27. Final checkpoint - Production validation
  - Ensure all tests pass, ask the user if questions arise.
