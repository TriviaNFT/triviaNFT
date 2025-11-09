# Implementation Plan

- [x] 1. Set up monorepo structure and tooling

  - Create pnpm workspace with apps/web, apps/mobile, services/api, infra, packages/shared
  - Configure TypeScript with shared tsconfig.base.json
  - Set up ESLint and Prettier with shared configurations
  - Configure Vitest for unit testing
  - Add GitHub Actions workflow for CI (lint, test, build)
  - _Requirements: 36, 37, 38, 39_

- [x] 2. Initialize CDK infrastructure project


  - Create CDK app with TypeScript
  - Set up stack organization (WebStack, ApiStack, DataStack, WorkflowStack, ObservabilityStack, SecurityStack)
  - Configure CDK context for staging and production environments
  - Create reusable constructs for Lambda functions and API endpoints
  - _Requirements: 36, 37, 38, 39_

- [x] 3. Implement SecurityStack with secrets and WAF





  - [x] 3.1 Create Secrets Manager secrets for JWT, Blockfrost, IPFS, database, Redis, and policy signing key


    - Define secret structures with placeholder values
    - Set up secret rotation policies
    - Configure IAM policies for Lambda access
    - _Requirements: 44, 45_
  
  - [x] 3.2 Configure WAF with rate limiting and CAPTCHA rules

    - Create WAF WebACL with rate-based rules (100 requests/5min per IP)
    - Add CAPTCHA challenge for suspicious patterns
    - Configure IP reputation lists
    - Set up WAF logging to S3
    - _Requirements: 44_


- [x] 4. Implement DataStack with Aurora and Redis





  - [x] 4.1 Create Aurora Serverless v2 PostgreSQL cluster


    - Configure cluster with min 0.5 ACUs, max 16 ACUs
    - Enable auto-pause with 5-minute delay
    - Set up RDS Proxy for connection pooling
    - Configure encryption at rest and in transit
    - Create database and initial admin user
    - _Requirements: 49, 50_
  
  - [x] 4.2 Create ElastiCache Redis cluster


    - Configure cluster mode enabled with 2 shards, 2 replicas
    - Use cache.r7g.large node type
    - Enable encryption at rest and in transit
    - Configure automatic failover
    - Set up backup retention (7 days)
    - _Requirements: 1, 2, 3, 4, 8_
  
  - [x] 4.3 Implement database schema with migrations


    - Create migration tool setup (node-pg-migrate or Flyway)
    - Write initial schema migration with all tables (players, categories, questions, sessions, eligibilities, mints, player_nfts, forge_operations, seasons, season_points)
    - Create indexes for performance (foreign keys, partial indexes, composite indexes)
    - Add unique constraints for data integrity
    - _Requirements: 49, 50_

- [x] 5. Create shared TypeScript models and utilities





  - [x] 5.1 Define core data models and interfaces


    - Create Player, Session, Question, Eligibility, NFT, ForgeOperation interfaces
    - Define API request/response types
    - Create enum types for statuses
    - Add Zod schemas for validation
    - _Requirements: 1, 10, 15, 16, 17_
  
  - [x] 5.2 Implement shared utility functions


    - Create date/time utilities (timezone handling, countdown calculations)
    - Implement crypto utilities (JWT signing/verification, hashing)
    - Add validation helpers
    - Create error classes (ValidationError, NotFoundError, UnauthorizedError)
    - _Requirements: 3, 45_
  
  - [x] 5.3 Create API client for frontend


    - Implement HTTP client with axios or fetch
    - Add request/response interceptors for auth tokens
    - Create typed methods for all API endpoints
    - Implement retry logic with exponential backoff
    - _Requirements: 40, 41, 42, 43_

- [x] 6. Implement authentication Lambda functions





  - [x] 6.1 Create wallet connection endpoint (POST /auth/connect)


    - Validate stake key format
    - Check if player exists in database
    - Generate JWT token with stake key claim
    - Return token and player info
    - _Requirements: 5, 42, 43, 45_
  
  - [x] 6.2 Create profile creation endpoint (POST /auth/profile)


    - Validate username uniqueness
    - Validate email format (optional)
    - Create player record in Aurora
    - Associate stake key with player
    - _Requirements: 5_
  
  - [x] 6.3 Create current user endpoint (GET /auth/me)


    - Validate JWT token
    - Fetch player info from Aurora
    - Return player profile with stats
    - _Requirements: 5, 45_


- [x] 7. Implement question generation and storage




  - [x] 7.1 Create Bedrock question generation Lambda


    - Configure Bedrock client with Claude model
    - Implement prompt template for category-specific questions
    - Parse and validate JSON response
    - Calculate SHA256 hash for deduplication
    - Upload questions to S3 bucket
    - _Requirements: 7, 36_
  
  - [x] 7.2 Create question indexing Lambda


    - Read questions from S3
    - Check for duplicates using SHA256 hash
    - Insert new questions into Aurora questions table
    - Update question pool count
    - _Requirements: 7, 50_
  
  - [x] 7.3 Implement question selection service


    - Query Aurora for category questions
    - Filter out questions seen by player (check Redis)
    - Apply reused/new ratio based on pool size
    - Shuffle and return questions without correct answers to client
    - _Requirements: 7, 8, 36_
  
  - [x] 7.4 Create question flagging endpoint (POST /questions/flag)


    - Validate question ID exists
    - Insert flag record into question_flags table
    - Store player ID and reason
    - Set handled = false for admin review
    - _Requirements: 9_

- [x] 8. Implement session management Lambda functions





  - [x] 8.1 Create session start endpoint (POST /sessions/start)


    - Check daily limit in Redis (limit:daily:{identifier}:{date})
    - Check cooldown in Redis (cooldown:{identifier})
    - Acquire session lock in Redis (lock:session:{identifier})
    - Select 10 questions using question selection service
    - Store session state in Redis (session:{sessionId})
    - Return session with questions (no correct answers)
    - _Requirements: 1, 2, 3, 4, 6, 8_
  
  - [x] 8.2 Create answer submission endpoint (POST /sessions/{id}/answer)


    - Retrieve session from Redis
    - Validate question index and timing
    - Compare answer with correct index
    - Update score and session state in Redis
    - Add question to seen set in Redis
    - Return result with correct answer and explanation
    - _Requirements: 1, 8, 33_
  
  - [x] 8.3 Create session completion endpoint (POST /sessions/{id}/complete)


    - Calculate final score and timing
    - Determine win/loss status (6+ correct = win)
    - If perfect (10/10), create eligibility in Aurora
    - Update season points in Redis leaderboard
    - Persist completed session to Aurora
    - Release session lock in Redis
    - Delete session from Redis
    - Return final results with eligibility ID if applicable
    - _Requirements: 1, 10, 20, 21, 34_
  
  - [x] 8.4 Create session history endpoint (GET /sessions/history)


    - Query Aurora for player's completed sessions
    - Support pagination with limit and offset
    - Return sessions with scores and timestamps
    - _Requirements: 30_


- [x] 9. Implement NFT minting workflow with Step Functions





  - [x] 9.1 Create eligibility listing endpoint (GET /eligibilities)


    - Query Aurora for active eligibilities for player
    - Filter out expired eligibilities
    - Return list with expiration countdowns
    - _Requirements: 10, 11, 12_
  
  - [x] 9.2 Create mint initiation endpoint (POST /mint/{eligibilityId})


    - Validate eligibility exists and is active
    - Check NFT stock availability in catalog
    - Start Step Function execution
    - Return mint operation ID for status polling
    - _Requirements: 10, 13, 14_
  
  - [x] 9.3 Implement Step Function mint workflow


    - Create ValidateEligibility Lambda (check Aurora, mark as 'used')
    - Create SelectNFT Lambda (query nft_catalog for available NFT)
    - Create UploadToIPFS Lambda (fetch from S3, pin to IPFS, store CID)
    - Create BuildTransaction Lambda (use Lucid to construct mint tx)
    - Create SignTransaction Lambda (sign with centralized policy key)
    - Create SubmitTransaction Lambda (submit via Blockfrost)
    - Create CheckConfirmation Lambda (poll for confirmation)
    - Create UpdateDatabase Lambda (insert into mints and player_nfts tables)
    - Configure retry logic and error handling
    - _Requirements: 10, 14, 50_
  
  - [x] 9.4 Create mint status endpoint (GET /mint/{mintId}/status)


    - Query Step Function execution status
    - Return current state and transaction hash
    - Include NFT details if confirmed
    - _Requirements: 14_

- [x] 10. Implement forging workflows with Step Functions




  - [x] 10.1 Create forge progress endpoint (GET /forge/progress)


    - Query player_nfts for owned NFTs
    - Group by category and calculate progress
    - Check requirements for Category, Master, and Seasonal forging
    - Return progress objects with canForge flags
    - _Requirements: 15, 16, 17, 29_
  
  - [x] 10.2 Create forge initiation endpoints


    - Implement POST /forge/category for Category Ultimate
    - Implement POST /forge/master for Master Ultimate
    - Implement POST /forge/season for Seasonal Ultimate
    - Validate ownership via Blockfrost on-chain query
    - Validate forge requirements (count, categories, season)
    - Start Step Function execution
    - Return forge operation ID
    - _Requirements: 15, 16, 17, 18, 35_
  
  - [x] 10.3 Implement Step Function forge workflow


    - Create ValidateOwnership Lambda (query blockchain)
    - Create BuildBurnTx Lambda (create burn transaction)
    - Create SignBurnTx Lambda (sign with centralized key)
    - Create SubmitBurn Lambda (submit to blockchain)
    - Create CheckBurnConfirmation Lambda (poll for confirmation)
    - Create BuildMintUltimate Lambda (create Ultimate NFT mint tx)
    - Create SignMintTx Lambda (sign with policy key)
    - Create SubmitMint Lambda (submit to blockchain)
    - Create CheckMintConfirmation Lambda (poll for confirmation)
    - Create UpdateForgeRecord Lambda (insert forge_operations, update player_nfts)
    - Configure retry logic and compensation for failures
    - _Requirements: 15, 16, 17, 18_
  
  - [x] 10.4 Create forge status endpoint (GET /forge/{forgeId}/status)


    - Query Step Function execution status
    - Return burn and mint transaction hashes
    - Include Ultimate NFT details if confirmed
    - _Requirements: 15, 16, 17_


- [x] 11. Implement leaderboard system




  - [x] 11.1 Create leaderboard update service


    - Implement composite score calculation with tie-breakers
    - Update Redis ZSET (ladder:global:{seasonId})
    - Update season_points table in Aurora
    - Handle concurrent updates safely
    - _Requirements: 21, 22, 25_
  
  - [x] 11.2 Create global leaderboard endpoint (GET /leaderboard/global)


    - Query Redis ZSET with ZREVRANGE
    - Decode tie-breaker data from scores
    - Fetch usernames from Aurora
    - Support pagination with limit and offset
    - Return ranked entries with metadata
    - _Requirements: 25, 26_
  
  - [x] 11.3 Create category leaderboard endpoint (GET /leaderboard/category/{id})


    - Query Redis ZSET for category-specific ladder
    - Apply same ranking logic as global
    - Support pagination
    - _Requirements: 25_
  
  - [x] 11.4 Create season standings endpoint (GET /leaderboard/season/{id})


    - Query leaderboard_snapshots for historical seasons
    - Query Redis for current season
    - Return final standings with prizes awarded
    - _Requirements: 26, 28_

- [x] 12. Implement season management




  - [x] 12.1 Create season configuration in Aurora


    - Insert initial season record (Winter Season 1)
    - Set start date, end date, and grace period
    - Create season_points records for active players
    - _Requirements: 19, 23_
  
  - [x] 12.2 Create EventBridge rule for season transition


    - Configure cron expression for quarterly transition
    - Create Lambda to finalize current season
    - Award prize to top player on global ladder
    - Create new season record
    - Reset seasonal points in Redis
    - Archive previous season leaderboard
    - _Requirements: 19, 24, 26_
  
  - [x] 12.3 Create season info endpoint (GET /seasons/current)


    - Return current season details
    - Include countdown to season end
    - Show active categories for seasonal forging
    - _Requirements: 19, 27, 28_

- [x] 13. Implement scheduled tasks with EventBridge





  - [x] 13.1 Create daily reset Lambda


    - Configure EventBridge rule for midnight ET
    - Reset daily session limits in Redis
    - Clear question seen sets in Redis
    - Update daily statistics
    - _Requirements: 3, 8_
  
  - [x] 13.2 Create eligibility expiration Lambda


    - Configure EventBridge rule for every minute
    - Scan eligibilities table for expired entries
    - Update status to 'expired'
    - Return NFTs to available stock
    - _Requirements: 10, 11_
  
  - [x] 13.3 Create leaderboard snapshot Lambda


    - Configure EventBridge rule for daily at 1 AM ET
    - Read entire Redis ZSET for each ladder
    - Insert into leaderboard_snapshots table
    - Maintain historical records
    - _Requirements: 26_


- [x] 14. Implement AWS AppConfig for game parameters



  - [x] 14.1 Create AppConfig application and environment


    - Set up AppConfig application for TriviaNFT
    - Create staging and production environments
    - Configure deployment strategy (gradual rollout)
    - _Requirements: 36, 37, 38, 39_
  
  - [x] 14.2 Create configuration profile with game settings


    - Define JSON schema for all game parameters
    - Set initial values (questions per session: 10, timer: 10s, cooldown: 60s, etc.)
    - Configure validation rules
    - _Requirements: 36, 37, 38, 39_
  
  - [x] 14.3 Integrate AppConfig client in Lambda functions


    - Add AppConfig SDK to Lambda layers
    - Implement configuration caching with TTL
    - Use configuration values in session and eligibility logic
    - _Requirements: 36, 37, 38, 39_

- [x] 15. Implement ApiStack with API Gateway and Lambda integration





  - [x] 15.1 Create API Gateway HTTP API


    - Configure CORS for web clients
    - Set up JWT authorizer using auth Lambda
    - Define routes for all endpoints
    - Configure request validation
    - _Requirements: 45_
  
  - [x] 15.2 Deploy all Lambda functions


    - Package Lambda functions with dependencies
    - Configure VPC attachment for Aurora/Redis access
    - Set environment variables from Secrets Manager
    - Configure memory, timeout, and concurrency
    - Enable X-Ray tracing
    - _Requirements: 46, 47_
  
  - [x] 15.3 Create Lambda layers for shared dependencies


    - Create layer for node_modules (AWS SDK, Lucid, etc.)
    - Create layer for shared utilities
    - Attach layers to Lambda functions
    - _Requirements: 46_

- [x] 16. Implement WorkflowStack with Step Functions





  - [x] 16.1 Create mint workflow state machine


    - Define state machine with all mint steps
    - Configure retry policies and error handling
    - Set up CloudWatch logging
    - Create IAM roles for Lambda invocations
    - _Requirements: 14_
  
  - [x] 16.2 Create forge workflow state machine


    - Define state machine with burn and mint steps
    - Configure compensation logic for failures
    - Set up CloudWatch logging
    - _Requirements: 15, 16, 17_
  
  - [x] 16.3 Create EventBridge rules


    - Create rule for daily reset (midnight ET)
    - Create rule for eligibility expiration (every minute)
    - Create rule for leaderboard snapshot (1 AM ET)
    - Create rule for season transition (quarterly)
    - _Requirements: 3, 8, 10, 11, 19, 26_


- [x] 17. Implement ObservabilityStack with monitoring and alarms






  - [x] 17.1 Create CloudWatch dashboards

    - Create dashboard for API metrics (latency, error rate, throughput)
    - Create dashboard for database metrics (connections, query time)
    - Create dashboard for Redis metrics (memory, latency, evictions)
    - Create dashboard for blockchain metrics (tx success rate, confirmation time)
    - _Requirements: 47_
  
  - [x] 17.2 Configure CloudWatch alarms


    - Create alarm for API error rate > 5%
    - Create alarm for Lambda function errors > 10
    - Create alarm for database connection failures > 5
    - Create alarm for blockchain transaction failures > 10%
    - Create alarm for Step Function execution failures > 3
    - Configure SNS topic for alarm notifications
    - _Requirements: 48_
  
  - [x] 17.3 Set up structured logging


    - Implement JSON logging format in all Lambda functions
    - Include correlation IDs for request tracing
    - Sanitize sensitive data (wallet addresses, keys)
    - Configure log retention (30 days)
    - _Requirements: 46_

- [x] 18. Implement WebStack with S3 and CloudFront




  - [x] 18.1 Create S3 bucket for static hosting

    - Configure bucket for static website hosting
    - Enable versioning
    - Set up lifecycle policies for old versions
    - Configure bucket policy for CloudFront access
    - _Requirements: 40, 41_
  
  - [x] 18.2 Create CloudFront distribution


  - [x] 18.2 Create CloudFront distribution


    - Configure origin with S3 bucket
    - Attach WAF WebACL
    - Set up custom domain with ACM certificate
    - Configure caching policies (24h for static assets)
    - Enable compression (Gzip/Brotli)
    - Set up origin shield for cost optimization
    - _Requirements: 40, 41, 44_
  
  - [x] 18.3 Configure Route 53 for custom domain

    - Create hosted zone for domain
    - Create A record pointing to CloudFront
    - Configure health checks
    - _Requirements: 40_

- [x] 19. Create Expo Web frontend application




  - [x] 19.1 Initialize Expo Web project


    - Create Expo app with TypeScript template
    - Configure Expo Router for navigation
    - Set up Tailwind CSS / NativeWind
    - Configure environment variables (EXPO_PUBLIC_*)
    - _Requirements: 40, 41_
  
  - [x] 19.2 Implement design system components


    - Create theme configuration with color palette
    - Implement Button component with variants
    - Create Card component with shadows
    - Implement Timer component with countdown
    - Create Badge component for categories
    - Implement ProgressBar component
    - _Requirements: 40_
  
  - [x] 19.3 Implement authentication flow


    - Create WalletConnect component with CIP-30 support
    - Implement wallet detection logic
    - Create profile creation form
    - Implement JWT token storage and refresh
    - Create protected route wrapper
    - _Requirements: 5, 42, 43, 45_


- [x] 20. Implement core gameplay UI components





  - [x] 20.1 Create category selection screen


    - Display grid of category cards with icons
    - Show NFT count and stock availability per category
    - Implement category selection and navigation
    - Display daily session limit and countdown
    - _Requirements: 6, 13, 27_
  
  - [x] 20.2 Create session flow component


    - Implement session start screen with rules message
    - Create QuestionCard component with timer
    - Implement answer option buttons with touch targets (44x44px)
    - Show progress indicator (question X of 10)
    - Handle answer submission and feedback
    - Display timeout message when timer expires
    - _Requirements: 1, 32, 33, 40_
  
  - [x] 20.3 Create session results screen


    - Display final score and timing
    - Show correct/incorrect breakdown
    - Display perfect score message with mint eligibility
    - Show "Mint Now" button if eligible
    - Display session statistics
    - _Requirements: 10, 34_
  
  - [x] 20.4 Implement session state management


    - Create React context for active session
    - Handle timer countdown with useEffect
    - Implement auto-advance on timeout
    - Handle browser refresh and session recovery
    - Prevent multiple active sessions
    - _Requirements: 1, 2_

- [x] 21. Implement NFT minting and inventory UI





  - [x] 21.1 Create mint eligibility display


    - Show active eligibilities with expiration countdown
    - Display category and NFT preview
    - Implement "Mint Now" button
    - Show guest wallet connection prompt
    - _Requirements: 10, 11, 12_
  
  - [x] 21.2 Create minting interface


    - Display NFT details and metadata
    - Show minting progress with status updates
    - Poll mint status endpoint
    - Display transaction hash and blockchain explorer link
    - Show success/error states
    - _Requirements: 14_
  
  - [x] 21.3 Create NFT inventory view


    - Display grid of owned NFTs with images
    - Show NFT details (name, category, traits)
    - Group by category
    - Implement filtering and sorting
    - _Requirements: 27, 30_

- [x] 22. Implement forging UI




  - [x] 22.1 Create forge progress display


    - Show progress bars for each forge type
    - Display NFTs collected toward requirements
    - Highlight forge-ready indicators
    - Show requirements (e.g., "7/10 Science NFTs")
    - _Requirements: 29_
  
  - [x] 22.2 Create forge confirmation dialog


    - Display warning message about NFT consumption
    - List all NFTs that will be consumed
    - Show preview of Ultimate NFT
    - Implement Cancel and Confirm buttons
    - _Requirements: 35_
  
  - [x] 22.3 Create forge execution interface


    - Display forging progress with steps
    - Show burn and mint transaction hashes
    - Poll forge status endpoint
    - Display success with new Ultimate NFT
    - Handle errors and retry options
    - _Requirements: 15, 16, 17_


- [x] 23. Implement leaderboard and profile UI





  - [x] 23.1 Create leaderboard component


    - Display ranked list with player usernames
    - Show points, NFTs minted, perfect scores
    - Highlight current player's rank
    - Implement pagination
    - Support global and category views
    - _Requirements: 25, 26_
  
  - [x] 23.2 Create season display


    - Show current season name and countdown
    - Display season prize information
    - List past seasons with final standings
    - Show player's rank in each season
    - _Requirements: 19, 28_
  
  - [x] 23.3 Create player profile screen


    - Display username and wallet address
    - Show remaining plays with reset countdown
    - Display perfect score counts by category
    - Show owned NFTs with images
    - Display activity log (mints and forges)
    - Show season statistics
    - _Requirements: 27, 28, 30_

- [x] 24. Implement PWA features




  - [x] 24.1 Create web app manifest


    - Define app name, short name, and description
    - Configure icons (192x192, 512x512)
    - Set display mode to standalone
    - Configure theme and background colors
    - _Requirements: 41_
  
  - [x] 24.2 Implement service worker


    - Cache static assets on install
    - Implement offline shell
    - Handle fetch events with cache-first strategy
    - Update cache on new version
    - _Requirements: 41_
  
  - [x] 24.3 Add install prompt


    - Detect PWA install capability
    - Show install banner on supported browsers
    - Handle beforeinstallprompt event
    - Track installation analytics
    - _Requirements: 41_

- [x] 25. Implement error handling and user feedback





  - [x] 25.1 Create error boundary component


    - Catch React errors and display fallback UI
    - Log errors to backend API
    - Provide recovery options
    - _Requirements: 46_
  
  - [x] 25.2 Implement toast notification system


    - Create toast component for success/error messages
    - Display network error notifications
    - Show session timeout warnings
    - Display mint/forge status updates
    - _Requirements: 32, 33, 34, 35_
  
  - [x] 25.3 Add loading states and skeletons


    - Create loading spinner component
    - Implement skeleton screens for data loading
    - Show progress indicators for long operations
    - _Requirements: 40_


- [x] 26. Implement responsive design and mobile optimization





  - [x] 26.1 Configure responsive breakpoints


    - Set up Tailwind breakpoints (sm, md, lg, xl)
    - Create responsive layout components
    - Test on desktop (1280x720+) and mobile (375x667+)
    - _Requirements: 40_
  
  - [x] 26.2 Optimize touch interactions


    - Ensure all buttons are 44x44px minimum
    - Add touch feedback (active states)
    - Implement swipe gestures where appropriate
    - Test on iOS and Android devices
    - _Requirements: 40_
  
  - [x] 26.3 Optimize performance for mobile


    - Implement code splitting with React.lazy
    - Optimize images with responsive sizes
    - Minimize bundle size
    - Test on 3G network conditions
    - _Requirements: 40, 41_

- [x] 27. Set up CI/CD pipeline




  - [x] 27.1 Configure GitHub Actions for testing


    - Create workflow for linting and type checking
    - Add unit test execution
    - Configure test coverage reporting
    - Run on pull requests
    - _Requirements: 46_
  
  - [x] 27.2 Configure GitHub Actions for CDK deployment


    - Set up OIDC authentication with AWS
    - Create workflow for CDK synth and diff on PRs
    - Create workflow for CDK deploy on main branch
    - Configure environment-specific deployments
    - _Requirements: 36_
  
  - [x] 27.3 Configure frontend deployment


    - Add Expo Web build step
    - Sync build output to S3
    - Invalidate CloudFront cache
    - Run on successful CDK deployment
    - _Requirements: 40, 41_

- [x] 28. Create initial data and seed database





  - [x] 28.1 Create category seed data


    - Insert 9 categories (Science, History, Geography, Sports, Arts, Entertainment, Technology, Literature, General)
    - Set all categories as active
    - _Requirements: 6_
  
  - [x] 28.2 Create NFT catalog seed data


    - Upload NFT artwork to S3 for each category
    - Create metadata JSON files
    - Insert catalog records (10 NFTs per category minimum)
    - _Requirements: 13, 50_
  
  - [x] 28.3 Generate initial question pool


    - Run Bedrock generation for each category
    - Generate 100 questions per category
    - Index questions in Aurora
    - _Requirements: 7_
  
  - [x] 28.4 Create initial season


    - Insert Season 1 (Winter) record
    - Set start date, end date (3 months), grace period (7 days)
    - _Requirements: 19_


- [x] 29. Implement security hardening





  - [x] 29.1 Configure API Gateway throttling

    - Set burst limit to 500 requests
    - Set rate limit to 1000 requests/second
    - Configure per-method limits for expensive operations
    - _Requirements: 44_
  
  - [x] 29.2 Implement input validation


    - Add Zod schema validation to all API endpoints
    - Sanitize user input before database storage
    - Validate wallet addresses and stake keys
    - _Requirements: 45_
  
  - [x] 29.3 Configure security headers

    - Set Content-Security-Policy headers
    - Enable HSTS (Strict-Transport-Security)
    - Configure X-Frame-Options
    - Set X-Content-Type-Options
    - _Requirements: 45_
  
  - [x] 29.4 Set up secrets rotation

    - Configure automatic rotation for JWT secret (90 days)
    - Configure rotation for policy signing key (90 days)
    - Set up rotation Lambda functions
    - _Requirements: 45_

- [x] 30. Configure monitoring and alerting





  - [x] 30.1 Set up CloudWatch Logs Insights queries


    - Create query for API error patterns
    - Create query for slow database queries
    - Create query for blockchain transaction failures
    - Save queries to dashboard
    - _Requirements: 46_
  
  - [x] 30.2 Configure SNS topics for alerts


    - Create topic for critical alerts
    - Create topic for warning alerts
    - Subscribe email addresses
    - Configure alarm actions
    - _Requirements: 48_
  
  - [x] 30.3 Enable AWS X-Ray tracing


    - Enable X-Ray on all Lambda functions
    - Configure sampling rules
    - Create service map
    - Set up trace analysis
    - _Requirements: 47_

- [x] 31. Perform integration testing





  - [x] 31.1 Test complete session flow


    - Test guest session creation
    - Test wallet connection and profile creation
    - Test session with all correct answers
    - Test session with mixed answers
    - Test session timeout handling
    - Verify eligibility creation for perfect score
    - _Requirements: 1, 2, 5, 10_
  
  - [x] 31.2 Test minting flow


    - Test mint initiation with valid eligibility
    - Test IPFS upload and pinning
    - Test blockchain transaction submission
    - Test confirmation polling
    - Test database updates
    - Verify NFT appears in inventory
    - _Requirements: 14_
  
  - [x] 31.3 Test forging flow


    - Test Category Ultimate forging with 10 NFTs
    - Test Master Ultimate forging with 10 categories
    - Test Seasonal Ultimate forging
    - Test ownership validation
    - Test burn and mint transactions
    - Verify forge records in database
    - _Requirements: 15, 16, 17_
  
  - [x] 31.4 Test leaderboard updates


    - Test points calculation after session
    - Test tie-breaker logic
    - Test Redis ZSET updates
    - Test leaderboard pagination
    - Verify season points in Aurora
    - _Requirements: 21, 22, 25_


- [x] 32. Perform end-to-end testing with Playwright




  - [x] 32.1 Set up Playwright test environment


    - Install Playwright and configure browsers
    - Create test fixtures for authentication
    - Set up test database and Redis
    - Configure test environment variables
    - _Requirements: 46_
  
  - [x] 32.2 Create E2E test scenarios


    - Test guest user completes session
    - Test user connects wallet and creates profile
    - Test user achieves perfect score and mints NFT
    - Test user forges Category Ultimate
    - Test leaderboard updates after session
    - Test session timeout handling
    - Test daily limit enforcement
    - _Requirements: 1, 2, 3, 5, 10, 14, 15, 25_

- [x] 33. Perform load testing




  - [x] 33.1 Set up load testing tool (Artillery or k6)


    - Install and configure load testing tool
    - Create test scenarios for concurrent sessions
    - Create test scenarios for answer submissions
    - Create test scenarios for leaderboard queries
    - _Requirements: 47_
  
  - [x] 33.2 Execute load tests and analyze results


    - Run test with 1000 concurrent users
    - Measure API response times (p50, p95, p99)
    - Measure database query latency
    - Measure Redis operation latency
    - Identify bottlenecks and optimize
    - _Requirements: 47_

- [x] 34. Deploy to staging environment




  - [x] 34.1 Deploy infrastructure to staging


    - Run CDK deploy for all stacks
    - Verify all resources created successfully
    - Configure Cardano preprod network
    - Set up test Blockfrost API key
    - _Requirements: 36_
  
  - [x] 34.2 Deploy frontend to staging


    - Build Expo Web application
    - Sync to staging S3 bucket
    - Invalidate CloudFront cache
    - Verify PWA functionality
    - _Requirements: 40, 41_
  
  - [x] 34.3 Run smoke tests in staging


    - Test all API endpoints
    - Test wallet connection
    - Test session flow
    - Test minting and forging
    - Verify monitoring and alarms
    - _Requirements: 46, 47, 48_

- [x] 35. Deploy to production environment





  - [x] 35.1 Deploy infrastructure to production


    - Run CDK deploy for all stacks
    - Configure Cardano mainnet
    - Set up production Blockfrost API key
    - Verify all resources and configurations
    - _Requirements: 36_
  
  - [x] 35.2 Deploy frontend to production


    - Build Expo Web application with production config
    - Sync to production S3 bucket
    - Invalidate CloudFront cache
    - Configure custom domain


    - _Requirements: 40, 41_
  
  - [x] 35.3 Perform production validation

    - Run smoke tests on production
    - Verify monitoring dashboards
    - Test alarm notifications
    - Monitor initial traffic
    - _Requirements: 46, 47, 48_

- [x] 36. Create documentation




  - [x] 36.1 Write API documentation


    - Document all API endpoints with request/response examples
    - Create OpenAPI/Swagger specification
    - Document authentication flow
    - Document error codes and messages
    - _Requirements: 45_
  
  - [x] 36.2 Write deployment documentation


    - Document infrastructure setup
    - Document environment configuration
    - Document deployment process
    - Document rollback procedures
    - _Requirements: 36_
  
  - [x] 36.3 Write user documentation


    - Create gameplay guide
    - Document wallet connection process
    - Explain NFT minting and forging
    - Document leaderboard and seasons
    - Create FAQ
    - _Requirements: 1, 5, 10, 15, 16, 17, 25_
