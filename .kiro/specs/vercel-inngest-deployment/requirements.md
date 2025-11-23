# Requirements Document

## Introduction

This specification defines the requirements for migrating the TriviaNFT application from AWS infrastructure (Lambda, Step Functions, DynamoDB) to a Vercel + Inngest architecture. The migration will enable serverless deployment with improved developer experience, preview environments, and cost optimization while maintaining all existing functionality.

## Glossary

- **System**: The TriviaNFT application backend and frontend
- **Neon**: Serverless PostgreSQL database provider with Vercel integration
- **Upstash**: Serverless Redis provider with Vercel integration
- **Inngest**: Workflow orchestration platform replacing AWS Step Functions
- **Vercel Functions**: Serverless functions replacing AWS Lambda
- **Step Functions**: AWS workflow orchestration service (current)
- **Mint Workflow**: NFT minting process including validation, blockchain transaction, and confirmation
- **Forge Workflow**: NFT forging process including burning multiple NFTs and minting new ones
- **Preview Environment**: Temporary deployment environment for testing branches
- **Database Migration**: Process of moving data from current PostgreSQL to Neon
- **Connection String**: Database URL containing credentials and endpoint information

## Requirements

### Requirement 1

**User Story:** As a developer, I want to migrate the PostgreSQL database to Neon, so that I can use Vercel-native database services with preview environments.

#### Acceptance Criteria

1. WHEN the System connects to the database THEN the System SHALL use Neon PostgreSQL connection string
2. WHEN database migrations run THEN the System SHALL execute all existing migration files successfully on Neon
3. WHEN the System queries the database THEN the System SHALL maintain identical query performance compared to current setup
4. WHEN a preview deployment is created THEN Vercel SHALL provision a separate Neon database branch automatically
5. THE System SHALL support connection pooling through Neon's pooler for serverless functions


### Requirement 2

**User Story:** As a developer, I want to migrate Redis to Upstash, so that I can use serverless Redis compatible with Vercel's edge network.

#### Acceptance Criteria

1. WHEN the System stores session data THEN the System SHALL use Upstash Redis connection
2. WHEN the System retrieves cached data THEN the System SHALL maintain sub-10ms latency through edge caching
3. THE System SHALL support all existing Redis commands used in the application
4. WHEN Redis operations fail THEN the System SHALL retry with exponential backoff
5. THE System SHALL use Upstash REST API for edge function compatibility

### Requirement 3

**User Story:** As a developer, I want to convert AWS Step Functions workflows to Inngest functions, so that I can orchestrate long-running processes on Vercel.

#### Acceptance Criteria

1. WHEN a mint operation is initiated THEN the System SHALL execute the mint workflow using Inngest
2. WHEN a forge operation is initiated THEN the System SHALL execute the forge workflow using Inngest
3. WHEN a workflow step fails THEN Inngest SHALL automatically retry the failed step without re-executing previous steps
4. WHEN a workflow requires waiting THEN the System SHALL use Inngest sleep without consuming compute resources
5. THE System SHALL maintain workflow execution history for debugging and monitoring

### Requirement 4

**User Story:** As a developer, I want to convert Lambda handlers to Vercel API routes, so that I can deploy the API on Vercel infrastructure.

#### Acceptance Criteria

1. WHEN an API request is received THEN the System SHALL handle it through Vercel Functions
2. THE System SHALL maintain all existing API endpoints with identical paths
3. WHEN authentication is required THEN the System SHALL verify JWT tokens identically to current implementation
4. THE System SHALL return responses with identical structure and status codes
5. WHEN errors occur THEN the System SHALL log errors with the same detail level as current implementation


### Requirement 5

**User Story:** As a developer, I want to configure environment variables in Vercel, so that the application can access required secrets and configuration.

#### Acceptance Criteria

1. THE System SHALL store all sensitive credentials in Vercel environment variables
2. WHEN different environments exist THEN the System SHALL use environment-specific variable values
3. THE System SHALL access DATABASE_URL for Neon connection
4. THE System SHALL access REDIS_URL for Upstash connection
5. THE System SHALL access INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY for Inngest authentication
6. THE System SHALL access BLOCKFROST_PROJECT_ID for Cardano blockchain operations
7. THE System SHALL access NFT_POLICY_ID for NFT minting operations

### Requirement 6

**User Story:** As a developer, I want to set up Inngest workflow functions, so that I can handle NFT minting and forging operations reliably.

#### Acceptance Criteria

1. WHEN a mint workflow executes THEN the System SHALL validate eligibility as a retriable step
2. WHEN a mint workflow executes THEN the System SHALL reserve NFT from catalog as a retriable step
3. WHEN a mint workflow executes THEN the System SHALL submit blockchain transaction as a retriable step
4. WHEN a mint workflow executes THEN the System SHALL wait for confirmation using Inngest sleep
5. WHEN a mint workflow executes THEN the System SHALL update database records as a retriable step
6. WHEN a forge workflow executes THEN the System SHALL validate NFT ownership as a retriable step
7. WHEN a forge workflow executes THEN the System SHALL burn input NFTs as a retriable step
8. WHEN a forge workflow executes THEN the System SHALL mint output NFT as a retriable step
9. WHEN any workflow step fails THEN Inngest SHALL retry only the failed step up to 3 times


### Requirement 7

**User Story:** As a developer, I want to maintain the existing database schema, so that I can migrate without data structure changes.

#### Acceptance Criteria

1. THE System SHALL use the existing PostgreSQL schema without modifications
2. THE System SHALL support all existing table structures including players, sessions, eligibilities, mints, and forge_operations
3. THE System SHALL maintain all existing indexes for query performance
4. THE System SHALL preserve all existing constraints and triggers
5. THE System SHALL support JSONB columns for flexible data storage

### Requirement 8

**User Story:** As a developer, I want to configure Vercel deployment settings, so that the application builds and deploys correctly.

#### Acceptance Criteria

1. THE System SHALL use the correct build command for the web application
2. THE System SHALL use the correct output directory for static assets
3. WHEN a Git branch is pushed THEN Vercel SHALL create a preview deployment automatically
4. WHEN the main branch is updated THEN Vercel SHALL deploy to production automatically
5. THE System SHALL configure serverless function timeout to maximum allowed value

### Requirement 9

**User Story:** As a developer, I want to test the migrated application, so that I can verify all functionality works correctly on Vercel.

#### Acceptance Criteria

1. WHEN a user starts a trivia session THEN the System SHALL create and manage the session successfully
2. WHEN a user achieves a perfect score THEN the System SHALL create an eligibility record
3. WHEN a user initiates minting THEN the Inngest mint workflow SHALL complete successfully
4. WHEN a user initiates forging THEN the Inngest forge workflow SHALL complete successfully
5. WHEN the leaderboard is requested THEN the System SHALL return correct rankings
6. WHEN API errors occur THEN the System SHALL return appropriate error messages


### Requirement 10

**User Story:** As a developer, I want to configure Inngest integration with Vercel, so that workflows can be triggered from API routes.

#### Acceptance Criteria

1. THE System SHALL expose an Inngest API endpoint at /api/inngest
2. WHEN Inngest needs to execute a step THEN the System SHALL receive the request at the Inngest endpoint
3. THE System SHALL verify Inngest requests using signing keys
4. WHEN a preview environment is created THEN Inngest SHALL create a corresponding sandbox environment
5. THE System SHALL register all workflow functions with Inngest on deployment

### Requirement 11

**User Story:** As a developer, I want to handle storage for NFT assets, so that images and metadata are accessible.

#### Acceptance Criteria

1. THE System SHALL store NFT images in a publicly accessible location
2. THE System SHALL store NFT metadata in a publicly accessible location
3. WHEN NFT assets are requested THEN the System SHALL serve them with appropriate caching headers
4. THE System SHALL support IPFS pinning for decentralized storage
5. THE System SHALL maintain S3 compatibility for existing asset references

### Requirement 12

**User Story:** As a developer, I want to monitor application performance, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. WHEN errors occur THEN the System SHALL log them with full context
2. THE System SHALL track Inngest workflow execution status
3. THE System SHALL monitor database query performance
4. THE System SHALL track API response times
5. WHEN workflows fail THEN the System SHALL send notifications for investigation
