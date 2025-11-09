# Design Document

## Overview

TriviaNFT is a serverless, blockchain-integrated trivia gaming platform built on AWS with Cardano NFT rewards. The architecture follows a modern JAMstack pattern with a static frontend (Expo Web PWA), serverless API (API Gateway + Lambda), and managed data layer (Aurora Serverless v2 + ElastiCache Redis). The system integrates with Cardano blockchain via Blockfrost API and uses AWS Bedrock for AI-powered question generation.

### Key Design Principles

1. **Serverless-First**: Minimize operational overhead with managed services
2. **Stateless API**: Session state in Redis, persistent data in Aurora
3. **Security by Design**: WAF protection, JWT authentication, least-privilege IAM
4. **Scalability**: Auto-scaling at every layer (Aurora, Lambda, Redis, CloudFront)
5. **Observability**: Comprehensive logging, metrics, and alarms
6. **Cost Optimization**: Pay-per-use pricing, efficient caching strategies
7. **Blockchain Integration**: Centralized signer for MVP, path to decentralization

### Technology Stack

**Frontend**:
- Expo Web (React + React Native Web)
- PWA with service workers
- Tailwind CSS / NativeWind for styling
- Lucid/Mesh for Cardano wallet integration

**Backend**:
- API Gateway (HTTP API)
- Lambda (Node.js 20 + TypeScript)
- Aurora Serverless v2 (PostgreSQL)
- ElastiCache Redis (session state, leaderboards)

**Infrastructure**:
- AWS CDK (TypeScript)
- CloudFront + S3 (static hosting)
- AWS AppConfig (game parameters)
- AWS Secrets Manager (credentials)

**Blockchain**:
- Cardano (mainnet/preprod)
- Blockfrost API
- IPFS (NFT.Storage or Blockfrost pinning)

**AI/ML**:
- AWS Bedrock (question generation)

**CI/CD**:
- GitHub Actions with OIDC
- EAS (Expo Application Services) for mobile builds


## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web Browser │  │ Mobile PWA   │  │ Native Apps  │          │
│  │  (Desktop)   │  │ (iOS/Android)│  │  (Future)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   CloudFront    │ (CDN + WAF)
                    │   Distribution  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐         ┌─────────▼─────────┐
     │   S3 Bucket     │         │   API Gateway     │
     │  (Static Web)   │         │   (HTTP API)      │
     └─────────────────┘         └─────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
           ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
           │  Lambda         │   │  Lambda         │   │  Lambda         │
           │  (Sessions)     │   │  (Minting)      │   │  (Leaderboard)  │
           └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                    │                      │                      │
        ┌───────────┴──────────────────────┴──────────────────────┴───────┐
        │                                                                  │
┌───────▼────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│ ElastiCache    │  │   Aurora     │  │ Step         │  │  EventBridge ││
│ Redis          │  │ Serverless v2│  │ Functions    │  │  Rules       ││
│ (Session State)│  │ (PostgreSQL) │  │ (Workflows)  │  │              ││
└────────────────┘  └──────────────┘  └──────┬───────┘  └──────────────┘│
                                              │                           │
                    ┌─────────────────────────┴───────────────────────┐  │
                    │                                                 │  │
           ┌────────▼────────┐  ┌──────────────┐  ┌────────────────┐│  │
           │   Blockfrost    │  │  AWS Bedrock │  │  S3 (NFT Art   ││  │
           │   (Cardano API) │  │  (AI Q Gen)  │  │  & Questions)  ││  │
           └─────────────────┘  └──────────────┘  └────────────────┘│  │
                    │                                                 │  │
           ┌────────▼────────┐                                       │  │
           │  Cardano        │                                       │  │
           │  Blockchain     │                                       │  │
           │  (mainnet/prep) │                                       │  │
           └─────────────────┘                                       │  │
                                                                     │  │
└──────────────────────────────────────────────────────────────────┘  │
                                                                       │
┌──────────────────────────────────────────────────────────────────────┘
│                     Supporting Services
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │ AWS Secrets  │  │ AWS AppConfig│  │  CloudWatch  │
│  │  Manager     │  │              │  │  (Logs/Metrics)│
│  └──────────────┘  └──────────────┘  └──────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

#### 1. Presentation Layer (Frontend)

**Expo Web Application**:
- Single codebase for web and future native apps
- React Native Web for cross-platform UI components
- Expo Router for navigation
- PWA capabilities (manifest, service worker, offline shell)

**Key Features**:
- Responsive design (desktop 1280x720+, mobile 375x667+)
- Real-time timer with visual countdown
- Wallet integration (CIP-30 for web, dApp browser for mobile)
- Category selection and session flow
- Profile, leaderboard, and inventory views
- Forging interface with confirmation dialogs

**State Management**:
- React Context for global state (user, wallet, session)
- Local storage for guest anonymous ID
- Service worker for offline asset caching


#### 2. API Layer

**API Gateway (HTTP API)**:
- RESTful endpoints for all game operations
- JWT authorizer for authenticated routes
- CORS configuration for web clients
- Request validation and transformation
- Integration with Lambda functions

**Lambda Functions** (Node.js 20 + TypeScript):

1. **Auth Functions**:
   - `POST /auth/connect` - Wallet connection, JWT generation
   - `POST /auth/profile` - First-time profile creation
   - `GET /auth/me` - Current user info

2. **Session Functions**:
   - `POST /sessions/start` - Initialize new session
   - `POST /sessions/{id}/answer` - Submit answer
   - `POST /sessions/{id}/complete` - Finalize session
   - `GET /sessions/{id}` - Get session state
   - `GET /sessions/history` - Player session history

3. **Question Functions**:
   - `GET /questions/generate` - Trigger Bedrock generation (admin)
   - `POST /questions/flag` - Report question issue

4. **Mint Functions**:
   - `GET /eligibilities` - List active eligibilities
   - `POST /mint/{eligibilityId}` - Initiate mint (triggers Step Function)
   - `GET /mint/{mintId}/status` - Check mint status

5. **Forge Functions**:
   - `GET /forge/progress` - Get forging progress
   - `POST /forge/category` - Forge Category Ultimate
   - `POST /forge/master` - Forge Master Ultimate
   - `POST /forge/season` - Forge Seasonal Ultimate

6. **Leaderboard Functions**:
   - `GET /leaderboard/global` - Global ladder
   - `GET /leaderboard/category/{id}` - Category ladder
   - `GET /leaderboard/season/{id}` - Season standings

7. **Profile Functions**:
   - `GET /profile` - Player profile with stats
   - `GET /profile/nfts` - Owned NFTs
   - `GET /profile/activity` - Mint/forge history

**Lambda Configuration**:
- Memory: 512MB (sessions), 1024MB (mint/forge)
- Timeout: 30s (API), 5min (workflows)
- VPC: Attached for Aurora/Redis access
- Environment variables from Secrets Manager
- X-Ray tracing enabled
- Reserved concurrency for critical functions


#### 3. Data Layer

**ElastiCache Redis** (Cluster Mode Enabled):

**Purpose**: High-speed session state and leaderboard management

**Data Structures**:

1. **Active Sessions**:
   ```
   Key: session:{sessionId}
   Type: Hash
   TTL: 15 minutes
   Fields: {
     playerId, stakeKey, anonId, categoryId,
     currentQuestion, startedAt, questions: JSON,
     answers: JSON, score
   }
   ```

2. **Session Locks**:
   ```
   Key: lock:session:{stakeKey|anonId}
   Type: String
   TTL: 15 minutes
   Value: sessionId
   ```

3. **Daily Limits**:
   ```
   Key: limit:daily:{stakeKey|anonId}:{date}
   Type: Integer
   TTL: 24 hours
   Value: sessionCount
   ```

4. **Question Seen Tracking**:
   ```
   Key: seen:{stakeKey}:{categoryId}:{date}
   Type: Set
   TTL: 24 hours
   Members: [questionId1, questionId2, ...]
   ```

5. **Leaderboards**:
   ```
   Key: ladder:global:{seasonId}
   Type: Sorted Set
   Members: stakeKey
   Scores: points (with tie-breaker encoding)
   ```

6. **Cooldowns**:
   ```
   Key: cooldown:{stakeKey|anonId}
   Type: String
   TTL: 60 seconds
   Value: lastSessionEndTime
   ```

**Configuration**:
- Node type: cache.r7g.large (2 nodes minimum)
- Engine: Redis 7.x
- Encryption: At-rest and in-transit
- Automatic failover enabled
- Backup retention: 7 days

**Aurora Serverless v2 (PostgreSQL 15)**:

**Purpose**: Persistent storage for all game data

**Scaling Configuration**:
- Min ACUs: 0.5 (can scale to zero with auto-pause)
- Max ACUs: 16
- Auto-pause delay: 5 minutes of inactivity

**Connection Management**:
- RDS Proxy for connection pooling
- Max connections: 100 per Lambda
- Connection timeout: 30s

**Schema** (see provided SQL in requirements):
- Players and authentication
- Categories and NFT catalog
- Questions and flags
- Sessions (completed only)
- Eligibilities and mints
- Player NFTs and forge operations
- Seasons and leaderboard snapshots

**Indexes**:
- B-tree indexes on foreign keys
- Partial indexes on active sessions/eligibilities
- GiST indexes for JSONB queries (session questions)
- Composite indexes for leaderboard queries

**Backup Strategy**:
- Automated daily snapshots (35-day retention)
- Point-in-time recovery enabled
- Cross-region snapshot copy for DR


#### 4. Workflow Layer

**Step Functions** (Standard Workflows):

**Mint Workflow**:
```
StartMint
  ↓
ValidateEligibility (Lambda)
  ↓
[Choice: Eligible?]
  ↓ Yes
SelectNFTFromCatalog (Lambda)
  ↓
UploadToIPFS (Lambda - Blockfrost/NFT.Storage)
  ↓
BuildMintTransaction (Lambda - Lucid)
  ↓
SignTransaction (Lambda - centralized signer)
  ↓
SubmitToBlockchain (Lambda - Blockfrost)
  ↓
[Wait: 30s]
  ↓
CheckConfirmation (Lambda)
  ↓
[Choice: Confirmed?]
  ↓ Yes
UpdateDatabase (Lambda)
  ↓
NotifyPlayer (Lambda - optional)
  ↓
Success
```

**Forge Workflow**:
```
StartForge
  ↓
ValidateOwnership (Lambda - query blockchain)
  ↓
[Choice: Owns all inputs?]
  ↓ Yes
BuildBurnTransaction (Lambda)
  ↓
SignBurnTransaction (Lambda)
  ↓
SubmitBurn (Lambda)
  ↓
[Wait: 30s]
  ↓
CheckBurnConfirmation (Lambda)
  ↓
[Choice: Confirmed?]
  ↓ Yes
BuildMintUltimate (Lambda)
  ↓
SignMintTransaction (Lambda)
  ↓
SubmitMint (Lambda)
  ↓
[Wait: 30s]
  ↓
CheckMintConfirmation (Lambda)
  ↓
[Choice: Confirmed?]
  ↓ Yes
UpdateForgeRecord (Lambda)
  ↓
Success
```

**Error Handling**:
- Retry with exponential backoff (3 attempts)
- Catch blocks for each state
- Compensation logic for partial failures
- Dead letter queue for failed workflows

**EventBridge Rules**:

1. **Daily Reset** (cron: 0 5 * * ? *):
   - Trigger: Midnight ET
   - Target: Lambda (reset daily limits in Redis)

2. **Eligibility Expiration** (rate: 1 minute):
   - Trigger: Every minute
   - Target: Lambda (scan and expire eligibilities)

3. **Leaderboard Snapshot** (cron: 0 6 * * ? *):
   - Trigger: Daily at 1 AM ET
   - Target: Lambda (copy Redis leaderboard to Aurora)

4. **Season Transition** (cron: 0 5 1 */3 ? *):
   - Trigger: First day of quarter
   - Target: Lambda (finalize season, award prizes, start new season)


#### 5. External Integrations

**AWS Bedrock (Question Generation)**:

**Model**: Anthropic Claude 3 Sonnet or Haiku

**Prompt Template**:
```
Generate 10 trivia questions for the category: {category}

Requirements:
- Difficulty: Medium
- Format: Multiple choice with 4 options (A, B, C, D)
- Include one correct answer
- Provide a brief explanation for the correct answer
- Ensure questions are factually accurate
- Avoid ambiguous wording

Output as JSON array:
[
  {
    "question": "...",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]
```

**Generation Strategy**:
- Batch generate 100 questions per category weekly
- Store in S3: `s3://trivia-questions/{category}/{timestamp}.json`
- Index in Aurora questions table
- Calculate SHA256 hash for deduplication

**Blockfrost API (Cardano Integration)**:

**Endpoints Used**:
- `/api/v0/addresses/{address}/utxos` - Query wallet UTXOs
- `/api/v0/txs/submit` - Submit signed transactions
- `/api/v0/txs/{hash}` - Check transaction status
- `/api/v0/ipfs/add` - Pin metadata to IPFS

**Rate Limits**:
- Free tier: 50,000 requests/day
- Paid tier: 500,000 requests/day
- Implement client-side rate limiting and retry logic

**Transaction Building** (Lucid Library):
```typescript
const tx = await lucid
  .newTx()
  .mintAssets({
    [policyId + assetName]: 1n
  })
  .attachMetadata(721, nftMetadata)
  .complete();

const signedTx = await tx.sign().complete();
const txHash = await signedTx.submit();
```

**IPFS Pinning**:
- Primary: Blockfrost IPFS gateway
- Fallback: NFT.Storage API
- Store CID in nft_catalog table
- Metadata format: CIP-25 (NFT metadata standard)

**AWS AppConfig (Game Parameters)**:

**Configuration Profile**: `game-settings`

**Parameters**:
```json
{
  "session": {
    "questionsPerSession": 10,
    "timerSeconds": 10,
    "cooldownSeconds": 60
  },
  "limits": {
    "dailySessionsConnected": 10,
    "dailySessionsGuest": 5,
    "resetTimeET": "00:00"
  },
  "eligibility": {
    "connectedWindowMinutes": 60,
    "guestWindowMinutes": 25
  },
  "forging": {
    "categoryUltimateCount": 10,
    "masterUltimateCount": 10,
    "seasonalUltimateCount": 2,
    "seasonGraceDays": 7
  },
  "questions": {
    "reusedRatio": 0.5,
    "newRatio": 0.5,
    "poolThreshold": 1000
  },
  "season": {
    "pointsPerCorrect": 1,
    "perfectBonus": 10
  }
}
```

**Deployment Strategy**:
- Staged rollout (0% → 25% → 50% → 100%)
- Automatic rollback on CloudWatch alarm
- Version history maintained


## Components and Interfaces

### Frontend Components

#### Core Components

**1. SessionFlow Component**:
```typescript
interface SessionFlowProps {
  categoryId: string;
  onComplete: (result: SessionResult) => void;
}

interface SessionResult {
  score: number;
  totalQuestions: number;
  isPerfect: boolean;
  eligibilityId?: string;
}
```

**Responsibilities**:
- Display questions sequentially
- Manage 10-second countdown timer
- Submit answers to API
- Handle timeout scenarios
- Show results and mint eligibility

**2. QuestionCard Component**:
```typescript
interface QuestionCardProps {
  question: Question;
  timeRemaining: number;
  onAnswer: (optionIndex: number) => void;
  disabled: boolean;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  categoryId: string;
}
```

**Responsibilities**:
- Render question text and options
- Display countdown timer with visual feedback
- Handle option selection
- Disable interaction after answer or timeout

**3. WalletConnect Component**:
```typescript
interface WalletConnectProps {
  onConnect: (wallet: ConnectedWallet) => void;
  onDisconnect: () => void;
}

interface ConnectedWallet {
  stakeKey: string;
  address: string;
  walletName: string;
}
```

**Responsibilities**:
- Detect available CIP-30 wallets
- Handle wallet connection flow
- Manage wallet state
- Display connection status

**4. MintInterface Component**:
```typescript
interface MintInterfaceProps {
  eligibility: Eligibility;
  onMintComplete: (nft: NFT) => void;
}

interface Eligibility {
  id: string;
  categoryId: string;
  expiresAt: string;
  status: 'active' | 'used' | 'expired';
}
```

**Responsibilities**:
- Display eligibility details
- Show expiration countdown
- Initiate mint transaction
- Poll for mint status
- Display success/error states

**5. ForgeInterface Component**:
```typescript
interface ForgeInterfaceProps {
  forgeType: 'category' | 'master' | 'season';
  progress: ForgeProgress;
  onForgeComplete: (ultimateNFT: NFT) => void;
}

interface ForgeProgress {
  type: string;
  required: number;
  current: number;
  nfts: NFT[];
  canForge: boolean;
}
```

**Responsibilities**:
- Display forging requirements
- Show progress toward requirements
- Display confirmation dialog
- Initiate forge workflow
- Handle forge status updates

**6. Leaderboard Component**:
```typescript
interface LeaderboardProps {
  type: 'global' | 'category';
  categoryId?: string;
  seasonId: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  nftsMinted: number;
  perfectScores: number;
  avgAnswerTime: number;
}
```

**Responsibilities**:
- Fetch and display rankings
- Handle pagination
- Show tie-breaker details
- Highlight current player
- Support filtering by season


### Backend Services

#### Session Service

**Interface**:
```typescript
interface SessionService {
  startSession(params: StartSessionParams): Promise<Session>;
  getSession(sessionId: string): Promise<Session>;
  submitAnswer(sessionId: string, answer: Answer): Promise<AnswerResult>;
  completeSession(sessionId: string): Promise<SessionResult>;
  getPlayerHistory(playerId: string, limit: number): Promise<Session[]>;
}

interface StartSessionParams {
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  categoryId: string;
}

interface Session {
  id: string;
  playerId: string;
  categoryId: string;
  status: 'active' | 'won' | 'lost' | 'forfeit';
  currentQuestionIndex: number;
  questions: SessionQuestion[];
  score: number;
  startedAt: string;
}

interface SessionQuestion {
  questionId: string;
  text: string;
  options: string[];
  servedAt: string;
  answeredIndex?: number;
  timeMs?: number;
}

interface Answer {
  questionIndex: number;
  optionIndex: number;
  timeMs: number;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  score: number;
}
```

**Implementation Details**:

1. **startSession**:
   - Check daily limit (Redis: `limit:daily:{identifier}:{date}`)
   - Check cooldown (Redis: `cooldown:{identifier}`)
   - Acquire session lock (Redis: `lock:session:{identifier}`)
   - Select 10 questions (5 reused + 5 new if pool > 1000)
   - Filter out seen questions (Redis: `seen:{stakeKey}:{categoryId}:{date}`)
   - Store session state (Redis: `session:{sessionId}`)
   - Return session with questions (without correct answers)

2. **submitAnswer**:
   - Retrieve session from Redis
   - Validate question index and timing
   - Compare answer with correct index
   - Update score and session state
   - Add question to seen set
   - Return result with explanation

3. **completeSession**:
   - Calculate final score and timing
   - Determine win/loss status
   - If perfect (10/10), create eligibility in Aurora
   - Update season points (Redis leaderboard)
   - Persist session to Aurora
   - Release session lock
   - Delete session from Redis
   - Return final results

#### Question Service

**Interface**:
```typescript
interface QuestionService {
  generateQuestions(categoryId: string, count: number): Promise<void>;
  getQuestionsForSession(params: QuestionSelectionParams): Promise<Question[]>;
  flagQuestion(questionId: string, playerId: string, reason: string): Promise<void>;
}

interface QuestionSelectionParams {
  categoryId: string;
  count: number;
  excludeIds: string[];
  reusedCount: number;
  newCount: number;
}

interface Question {
  id: string;
  categoryId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: 'bedrock' | 'manual';
}
```

**Implementation Details**:

1. **generateQuestions**:
   - Call Bedrock with category-specific prompt
   - Parse JSON response
   - Calculate SHA256 hash for each question
   - Check for duplicates in Aurora
   - Upload to S3: `s3://questions/{categoryId}/{timestamp}.json`
   - Insert into Aurora questions table
   - Update question pool count

2. **getQuestionsForSession**:
   - Query Aurora for category questions
   - If pool < 1000: select 10 random active questions
   - If pool >= 1000: select 5 from existing + generate 5 new
   - Exclude questions in excludeIds
   - Shuffle order
   - Return questions with correct index (server-side only)

3. **flagQuestion**:
   - Insert into question_flags table
   - Set handled = false
   - Optionally notify admin via SNS


#### Mint Service

**Interface**:
```typescript
interface MintService {
  getEligibilities(playerId: string): Promise<Eligibility[]>;
  initiateMint(eligibilityId: string): Promise<MintOperation>;
  getMintStatus(mintId: string): Promise<MintStatus>;
}

interface MintOperation {
  id: string;
  eligibilityId: string;
  catalogId: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
}

interface MintStatus {
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  confirmations: number;
  nft?: NFT;
}
```

**Implementation Details**:

1. **initiateMint**:
   - Validate eligibility (not expired, not used)
   - Check NFT stock availability
   - Start Step Function execution
   - Return mint operation ID
   - Client polls getMintStatus

2. **Step Function Execution**:
   - **ValidateEligibility**: Check Aurora, mark as 'used'
   - **SelectNFT**: Query nft_catalog for available NFT
   - **UploadToIPFS**: 
     - Fetch art from S3
     - Fetch metadata from S3
     - Pin to IPFS via Blockfrost
     - Store CID in catalog
   - **BuildTransaction**: Use Lucid to construct mint tx
   - **SignTransaction**: Sign with centralized policy key
   - **SubmitTransaction**: Submit via Blockfrost
   - **WaitForConfirmation**: Poll every 30s (max 5 min)
   - **UpdateDatabase**: 
     - Insert into mints table
     - Insert into player_nfts table
     - Mark catalog item as minted

#### Forge Service

**Interface**:
```typescript
interface ForgeService {
  getForgeProgress(playerId: string): Promise<ForgeProgress[]>;
  initiateForge(params: ForgeParams): Promise<ForgeOperation>;
  getForgeStatus(forgeId: string): Promise<ForgeStatus>;
}

interface ForgeParams {
  type: 'category' | 'master' | 'season';
  stakeKey: string;
  categoryId?: string;
  seasonId?: string;
  inputFingerprints: string[];
}

interface ForgeOperation {
  id: string;
  type: string;
  status: 'pending' | 'confirmed' | 'failed';
  burnTxHash?: string;
  mintTxHash?: string;
}
```

**Implementation Details**:

1. **getForgeProgress**:
   - Query player_nfts for owned NFTs
   - Group by category
   - Calculate progress for each forge type
   - Return array of progress objects

2. **initiateForge**:
   - Validate ownership via Blockfrost (query on-chain)
   - Validate forge requirements (count, categories)
   - Start Step Function execution
   - Return forge operation ID

3. **Step Function Execution**:
   - **ValidateOwnership**: Query blockchain for current ownership
   - **BuildBurnTx**: Create transaction burning input NFTs
   - **SignBurnTx**: Sign with centralized key
   - **SubmitBurn**: Submit to blockchain
   - **WaitForBurnConfirmation**: Poll for confirmation
   - **BuildMintUltimate**: Create Ultimate NFT mint tx
   - **SignMintTx**: Sign with policy key
   - **SubmitMint**: Submit to blockchain
   - **WaitForMintConfirmation**: Poll for confirmation
   - **UpdateDatabase**:
     - Insert into forge_operations
     - Update player_nfts (mark inputs as burned)
     - Insert new Ultimate NFT

#### Leaderboard Service

**Interface**:
```typescript
interface LeaderboardService {
  getGlobalLadder(seasonId: string, limit: number, offset: number): Promise<LeaderboardPage>;
  getCategoryLadder(categoryId: string, seasonId: string, limit: number, offset: number): Promise<LeaderboardPage>;
  updatePlayerPoints(stakeKey: string, seasonId: string, points: number, metadata: PointsMetadata): Promise<void>;
}

interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
}

interface PointsMetadata {
  nftsMinted: number;
  perfectScores: number;
  avgAnswerTime: number;
  sessionsUsed: number;
  firstAchievedAt: string;
}
```

**Implementation Details**:

1. **getGlobalLadder**:
   - Query Redis ZSET: `ladder:global:{seasonId}`
   - Use ZREVRANGE with offset/limit
   - Decode tie-breaker data from score
   - Fetch usernames from Aurora
   - Return paginated results

2. **updatePlayerPoints**:
   - Calculate composite score with tie-breakers:
     ```
     score = (points * 1e15) + 
             (nftsMinted * 1e12) + 
             (perfectScores * 1e9) + 
             ((1e9 - avgAnswerTime) * 1e6) + 
             ((1e6 - sessionsUsed) * 1e3) + 
             (timestamp encoding)
     ```
   - ZADD to Redis ZSET
   - Update season_points table in Aurora

3. **Nightly Snapshot** (EventBridge):
   - Read entire Redis ZSET
   - Insert into leaderboard_snapshots table
   - Maintain historical record


## Data Models

### Redis Data Models

**Session State**:
```typescript
interface RedisSession {
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  categoryId: string;
  currentQuestion: number;
  startedAt: number; // Unix timestamp
  questions: {
    questionId: string;
    servedAt: number;
    answeredIdx?: number;
    timeMs?: number;
  }[];
  score: number;
}
```

**Leaderboard Entry**:
```typescript
// Stored as ZSET member with composite score
interface LeaderboardScore {
  member: string; // stakeKey
  score: number;  // Composite: points + tie-breakers
}

// Tie-breaker encoding in score:
// score = (points * 1e15) + (nfts * 1e12) + (perfects * 1e9) + 
//         ((1e9 - avgTime) * 1e6) + ((1e6 - sessions) * 1e3) + timestamp
```

### Aurora Data Models

**Player**:
```typescript
interface Player {
  id: string; // UUID
  stakeKey?: string;
  anonId?: string;
  username?: string;
  email?: string;
  createdAt: Date;
  lastSeenAt: Date;
}
```

**Session** (completed):
```typescript
interface Session {
  id: string;
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  categoryId: string;
  status: 'won' | 'lost' | 'forfeit';
  startedAt: Date;
  endedAt: Date;
  score: number;
  totalMs: number;
  questions: {
    qid: string;
    servedAt: number;
    answeredIdx?: number;
    correctIdxHash: string; // SHA256 for verification
    timeMs?: number;
  }[];
}
```

**Eligibility**:
```typescript
interface Eligibility {
  id: string;
  type: 'category' | 'master' | 'season';
  categoryId?: string;
  seasonId?: string;
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  status: 'active' | 'used' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  sessionId: string;
}
```

**NFTCatalog**:
```typescript
interface NFTCatalog {
  id: string;
  categoryId: string;
  name: string;
  s3ArtKey: string;
  s3MetaKey: string;
  ipfsCid?: string;
  isMinted: boolean;
  mintedAt?: Date;
}
```

**PlayerNFT**:
```typescript
interface PlayerNFT {
  id: string;
  stakeKey: string;
  policyId: string;
  assetFingerprint: string; // CIP-14
  tokenName: string;
  source: 'mint' | 'forge';
  categoryId?: string;
  seasonId?: string;
  status: 'confirmed' | 'burned';
  mintedAt: Date;
  metadata: {
    name: string;
    image: string; // IPFS URL
    attributes: { trait_type: string; value: string }[];
  };
}
```

**ForgeOperation**:
```typescript
interface ForgeOperation {
  id: string;
  type: 'category' | 'master' | 'season';
  stakeKey: string;
  categoryId?: string;
  seasonId?: string;
  inputFingerprints: string[];
  outputTxHash?: string;
  outputAssetFingerprint?: string;
  createdAt: Date;
  confirmedAt?: Date;
}
```

**Season**:
```typescript
interface Season {
  id: string; // e.g., 'winter-s1'
  name: string;
  startsAt: Date;
  endsAt: Date;
  graceDays: number;
}
```

**SeasonPoints**:
```typescript
interface SeasonPoints {
  seasonId: string;
  stakeKey: string;
  points: number;
  perfects: number;
  mintedCount: number;
  avgAnswerMs: number;
  sessionsUsed: number;
  firstAchievedAt: Date;
}
```


## Error Handling

### Frontend Error Handling

**Network Errors**:
- Display user-friendly error messages
- Implement exponential backoff for retries
- Show offline indicator when network unavailable
- Cache failed requests for retry when online

**Wallet Errors**:
- Handle wallet not installed
- Handle wallet connection rejection
- Handle transaction signing rejection
- Provide clear instructions for resolution

**Session Errors**:
- Handle session expiration gracefully
- Warn before session timeout
- Allow session recovery on refresh
- Clear error states on new session

**Error Boundaries**:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to CloudWatch via API
    logError({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Show fallback UI
    this.setState({ hasError: true });
  }
}
```

### Backend Error Handling

**Lambda Error Handling**:
```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Business logic
    const result = await processRequest(event);
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Request failed', { error, event });
    
    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Resource not found' })
      };
    }
    
    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Generic server error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

**Database Error Handling**:
- Connection pool exhaustion: Retry with backoff
- Deadlock detection: Automatic retry
- Constraint violations: Return 400 with details
- Timeout errors: Return 504 Gateway Timeout

**Redis Error Handling**:
- Connection failures: Fallback to Aurora for reads
- Cluster failover: Automatic reconnection
- Memory pressure: Evict LRU keys
- Command timeouts: Log and return error

**Blockchain Error Handling**:
- Transaction failures: Retry up to 3 times
- Insufficient funds: Return clear error message
- Network congestion: Increase fee and retry
- Invalid transaction: Log details and alert admin

**Step Functions Error Handling**:
```json
{
  "Catch": [
    {
      "ErrorEquals": ["States.Timeout"],
      "ResultPath": "$.error",
      "Next": "HandleTimeout"
    },
    {
      "ErrorEquals": ["BlockchainError"],
      "ResultPath": "$.error",
      "Next": "RetryBlockchain"
    },
    {
      "ErrorEquals": ["States.ALL"],
      "ResultPath": "$.error",
      "Next": "LogErrorAndFail"
    }
  ],
  "Retry": [
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 2,
      "MaxAttempts": 3,
      "BackoffRate": 2.0
    }
  ]
}
```

### Error Monitoring

**CloudWatch Alarms**:
1. API error rate > 5% (5-minute window)
2. Lambda function errors > 10 (1-minute window)
3. Database connection failures > 5 (5-minute window)
4. Blockchain transaction failures > 10% (15-minute window)
5. Step Function execution failures > 3 (5-minute window)

**Error Logging**:
- Structured JSON logs with correlation IDs
- Include request context (user, endpoint, params)
- Sanitize sensitive data (wallet addresses, keys)
- Aggregate errors in CloudWatch Insights
- Set up SNS notifications for critical errors


## Testing Strategy

### Unit Testing

**Frontend Unit Tests** (Vitest + React Testing Library):

**Test Coverage**:
- Component rendering and props
- User interactions (clicks, inputs)
- State management logic
- Utility functions
- API client methods

**Example Test**:
```typescript
describe('QuestionCard', () => {
  it('should disable options after answer submitted', () => {
    const onAnswer = vi.fn();
    const { getByText } = render(
      <QuestionCard
        question={mockQuestion}
        timeRemaining={5}
        onAnswer={onAnswer}
        disabled={false}
      />
    );
    
    const optionA = getByText('A: Paris');
    fireEvent.click(optionA);
    
    expect(onAnswer).toHaveBeenCalledWith(0);
    expect(optionA).toBeDisabled();
  });
  
  it('should show warning color when time < 3 seconds', () => {
    const { container } = render(
      <QuestionCard
        question={mockQuestion}
        timeRemaining={2}
        onAnswer={vi.fn()}
        disabled={false}
      />
    );
    
    const timer = container.querySelector('.timer');
    expect(timer).toHaveClass('text-error');
  });
});
```

**Backend Unit Tests** (Vitest):

**Test Coverage**:
- Service methods with mocked dependencies
- Data validation logic
- Business rule enforcement
- Error handling paths
- Utility functions

**Example Test**:
```typescript
describe('SessionService', () => {
  it('should enforce daily session limit', async () => {
    const redis = createMockRedis();
    redis.get.mockResolvedValue('10'); // Already at limit
    
    const service = new SessionService(redis, mockDb);
    
    await expect(
      service.startSession({
        playerId: 'player1',
        stakeKey: 'stake1...',
        categoryId: 'science'
      })
    ).rejects.toThrow('Daily session limit reached');
  });
  
  it('should create eligibility for perfect score', async () => {
    const service = new SessionService(mockRedis, mockDb);
    
    const result = await service.completeSession('session1');
    
    expect(result.score).toBe(10);
    expect(result.isPerfect).toBe(true);
    expect(mockDb.eligibilities.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'category',
        status: 'active'
      })
    );
  });
});
```

### Integration Testing

**API Integration Tests**:

**Test Coverage**:
- End-to-end API flows
- Database interactions
- Redis operations
- Authentication and authorization
- Error responses

**Example Test**:
```typescript
describe('Session API', () => {
  it('should complete full session flow', async () => {
    // Start session
    const startRes = await request(app)
      .post('/sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: 'science' });
    
    expect(startRes.status).toBe(200);
    const sessionId = startRes.body.id;
    
    // Submit 10 correct answers
    for (let i = 0; i < 10; i++) {
      const answerRes = await request(app)
        .post(`/sessions/${sessionId}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          questionIndex: i,
          optionIndex: 0, // Assume correct
          timeMs: 5000
        });
      
      expect(answerRes.status).toBe(200);
    }
    
    // Complete session
    const completeRes = await request(app)
      .post(`/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.score).toBe(10);
    expect(completeRes.body.eligibilityId).toBeDefined();
  });
});
```

### End-to-End Testing

**E2E Tests** (Playwright):

**Test Scenarios**:
1. Guest user completes session
2. User connects wallet and creates profile
3. User achieves perfect score and mints NFT
4. User forges Category Ultimate
5. Leaderboard updates after session
6. Session timeout handling
7. Daily limit enforcement

**Example Test**:
```typescript
test('complete session and mint NFT', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');
  
  // Connect wallet
  await page.click('button:has-text("Connect Wallet")');
  await page.click('text=Nami');
  // Handle wallet popup...
  
  // Select category
  await page.click('text=Science');
  await page.click('button:has-text("Start Session")');
  
  // Answer all questions correctly
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('.question-card');
    await page.click('.option:first-child'); // Assume correct
    await page.waitForTimeout(500);
  }
  
  // Verify perfect score
  await expect(page.locator('text=Flawless!')).toBeVisible();
  
  // Mint NFT
  await page.click('button:has-text("Mint Now")');
  await page.waitForSelector('text=Minting in progress');
  await page.waitForSelector('text=NFT minted successfully', { timeout: 60000 });
  
  // Verify NFT in profile
  await page.click('text=Profile');
  await expect(page.locator('.nft-card')).toHaveCount(1);
});
```

### Load Testing

**Tools**: Artillery or k6

**Test Scenarios**:
1. **Concurrent Sessions**: 1000 users starting sessions simultaneously
2. **Answer Submission**: 10,000 requests/second
3. **Leaderboard Queries**: 500 requests/second
4. **Mint Operations**: 100 concurrent mints

**Example Artillery Config**:
```yaml
config:
  target: 'https://api.trivianft.com'
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 100
  processor: './auth-processor.js'

scenarios:
  - name: 'Complete Session'
    flow:
      - post:
          url: '/sessions/start'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            categoryId: 'science'
          capture:
            - json: '$.id'
              as: 'sessionId'
      - loop:
          - post:
              url: '/sessions/{{ sessionId }}/answer'
              json:
                questionIndex: '{{ $loopCount }}'
                optionIndex: 0
                timeMs: 5000
          count: 10
      - post:
          url: '/sessions/{{ sessionId }}/complete'
```

### Performance Testing

**Metrics to Monitor**:
- API response time (p50, p95, p99)
- Database query latency
- Redis operation latency
- Lambda cold start time
- Blockchain transaction confirmation time

**Performance Targets**:
- API p95 < 500ms
- Database queries < 100ms
- Redis operations < 10ms
- Lambda cold start < 2s
- Session start to first question < 1s


## Security Considerations

### Authentication and Authorization

**JWT Token Structure**:
```json
{
  "sub": "player-uuid",
  "stakeKey": "stake1...",
  "username": "player123",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Token Generation**:
- Sign with RS256 algorithm
- Private key stored in Secrets Manager
- 24-hour expiration
- Include stake key for verification

**API Authorization**:
- All authenticated endpoints require valid JWT
- Verify stake key matches resource owner
- Rate limit by stake key
- Implement role-based access for admin endpoints

### Data Protection

**Encryption at Rest**:
- Aurora: AWS KMS encryption enabled
- Redis: Encryption at rest enabled
- S3: Server-side encryption (SSE-S3)
- Secrets Manager: Automatic encryption

**Encryption in Transit**:
- HTTPS only (TLS 1.2+)
- Redis: TLS enabled
- Aurora: SSL connections required
- API Gateway: TLS termination

**Sensitive Data Handling**:
- Never log wallet private keys
- Hash correct answer indices in session logs
- Sanitize user input before storage
- Mask email addresses in logs

### Input Validation

**API Request Validation**:
```typescript
const startSessionSchema = z.object({
  categoryId: z.string().uuid(),
  playerId: z.string().uuid()
});

const answerSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(10000)
});
```

**SQL Injection Prevention**:
- Use parameterized queries only
- Never concatenate user input into SQL
- Use ORM/query builder (e.g., Kysely)

**XSS Prevention**:
- Sanitize all user-generated content
- Use React's built-in XSS protection
- Set Content-Security-Policy headers
- Escape HTML in server responses

### Rate Limiting

**WAF Rules**:
```json
{
  "Name": "RateLimitRule",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 100,
      "AggregateKeyType": "IP"
    }
  },
  "Action": {
    "Block": {}
  }
}
```

**API Gateway Throttling**:
- Burst limit: 500 requests
- Rate limit: 1000 requests/second
- Per-method limits for expensive operations

**Application-Level Rate Limiting**:
- Session creation: 10/minute per stake key
- Mint requests: 5/minute per stake key
- Forge requests: 3/minute per stake key
- Question flagging: 10/hour per player

### Blockchain Security

**Centralized Signer** (MVP):
- Policy keys stored in Secrets Manager
- Rotation policy: 90 days
- Access restricted to Lambda execution role
- All transactions logged with CloudTrail

**Transaction Validation**:
- Verify UTXO ownership before spending
- Validate metadata format (CIP-25)
- Check policy ID matches expected value
- Verify asset name encoding

**Future Decentralization**:
- Migrate to Plutus smart contracts
- Implement multi-sig for policy keys
- Use time-locked minting policies
- Enable player-signed transactions

### Monitoring and Incident Response

**Security Monitoring**:
- GuardDuty for threat detection
- CloudTrail for API audit logs
- VPC Flow Logs for network monitoring
- WAF logs for attack patterns

**Incident Response Plan**:
1. **Detection**: CloudWatch alarms trigger SNS
2. **Assessment**: Review logs in CloudWatch Insights
3. **Containment**: Block malicious IPs in WAF
4. **Eradication**: Patch vulnerabilities, rotate keys
5. **Recovery**: Restore from backups if needed
6. **Post-Incident**: Document and improve defenses

**Security Alerts**:
- Unusual API error rates
- Failed authentication attempts > 10/minute
- Blockchain transaction failures > 20%
- Database connection from unknown IP
- Secrets Manager access from unexpected role


## Deployment Strategy

### Infrastructure as Code

**CDK Stack Organization**:

```
/infra
  /lib
    /stacks
      - web-stack.ts          # S3 + CloudFront
      - api-stack.ts          # API Gateway + Lambda
      - data-stack.ts         # Aurora + Redis
      - workflow-stack.ts     # Step Functions + EventBridge
      - observability-stack.ts # CloudWatch + Alarms
      - security-stack.ts     # WAF + Secrets Manager
    /constructs
      - lambda-function.ts    # Reusable Lambda construct
      - api-endpoint.ts       # API Gateway endpoint construct
  - app.ts                    # CDK app entry point
  - cdk.json                  # CDK configuration
```

**Stack Dependencies**:
```
SecurityStack (Secrets, WAF)
  ↓
DataStack (Aurora, Redis)
  ↓
ApiStack (API Gateway, Lambda)
  ↓
WorkflowStack (Step Functions)
  ↓
WebStack (S3, CloudFront)
  ↓
ObservabilityStack (Alarms, Dashboards)
```

### Environment Configuration

**Environments**:
1. **Development** (local)
   - LocalStack for AWS services
   - Cardano preprod testnet
   - Mock Blockfrost responses

2. **Staging**
   - AWS account: staging
   - Cardano preprod testnet
   - Real Blockfrost API
   - Reduced capacity (min ACUs: 0.5)

3. **Production**
   - AWS account: production
   - Cardano mainnet
   - Full capacity (min ACUs: 2)
   - Multi-AZ deployment

**Environment Variables**:
```typescript
// Frontend (EXPO_PUBLIC_*)
EXPO_PUBLIC_API_URL=https://api.trivianft.com
EXPO_PUBLIC_CARDANO_NETWORK=mainnet
EXPO_PUBLIC_BLOCKFROST_URL=https://cardano-mainnet.blockfrost.io

// Backend (from Secrets Manager)
JWT_SECRET=<secret>
BLOCKFROST_API_KEY=<secret>
IPFS_API_KEY=<secret>
DATABASE_URL=<secret>
REDIS_URL=<secret>
POLICY_SIGNING_KEY=<secret>
```

### CI/CD Pipeline

**GitHub Actions Workflow**:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  deploy-staging:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
          aws-region: us-east-1
      - run: pnpm install
      - run: pnpm cdk synth
      - run: pnpm cdk diff
      - run: pnpm cdk deploy --all --require-approval never
        env:
          ENVIRONMENT: staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
          aws-region: us-east-1
      - run: pnpm install
      - run: pnpm cdk deploy --all --require-approval never
        env:
          ENVIRONMENT: production
      - name: Build and deploy web
        run: |
          cd apps/web
          pnpm build
          aws s3 sync dist/ s3://${{ secrets.WEB_BUCKET }}
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
```

### Database Migrations

**Migration Strategy**:
- Use Flyway or node-pg-migrate
- Run migrations before Lambda deployment
- Store migration history in Aurora
- Support rollback for failed migrations

**Migration Workflow**:
```typescript
// migrations/001_initial_schema.sql
CREATE TABLE players (...);
CREATE TABLE sessions (...);
-- etc.

// migrations/002_add_season_grace.sql
ALTER TABLE seasons ADD COLUMN grace_days SMALLINT DEFAULT 7;
```

**Deployment Steps**:
1. Deploy infrastructure changes (CDK)
2. Run database migrations
3. Deploy Lambda functions
4. Deploy frontend to S3
5. Invalidate CloudFront cache
6. Run smoke tests
7. Monitor for errors

### Rollback Strategy

**Lambda Rollback**:
- Use Lambda versions and aliases
- Alias points to stable version
- Deploy new version, test, then update alias
- Instant rollback by reverting alias

**Database Rollback**:
- Maintain rollback scripts for each migration
- Test rollback in staging before production
- Use Aurora snapshots for major changes

**Frontend Rollback**:
- Keep previous S3 deployment in versioned bucket
- Sync previous version back to bucket
- Invalidate CloudFront cache

### Blue-Green Deployment

**For Major Releases**:
1. Deploy new stack (green) alongside existing (blue)
2. Route 10% of traffic to green via CloudFront
3. Monitor metrics and errors
4. Gradually increase to 50%, then 100%
5. Decommission blue stack after 24 hours

**Traffic Shifting**:
```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.OriginGroup({
      primaryOrigin: greenOrigin,
      fallbackOrigin: blueOrigin,
      fallbackStatusCodes: [500, 502, 503, 504]
    })
  }
});
```


## Scalability and Performance

### Auto-Scaling Configuration

**Lambda**:
- Concurrent executions: 1000 (reserved)
- Provisioned concurrency: 10 (for critical functions)
- Auto-scaling based on invocation rate

**Aurora Serverless v2**:
- Min ACUs: 0.5 (staging), 2 (production)
- Max ACUs: 16
- Scaling increments: 0.5 ACU
- Scaling speed: Seconds to minutes

**ElastiCache Redis**:
- Node type: cache.r7g.large
- Cluster mode: Enabled (2 shards, 2 replicas)
- Auto-scaling: Add shards when memory > 80%

**CloudFront**:
- Global edge locations
- Automatic scaling
- Origin shield enabled

### Caching Strategy

**CloudFront Caching**:
```typescript
const distribution = new cloudfront.Distribution(this, 'Dist', {
  defaultBehavior: {
    cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
      defaultTtl: Duration.hours(24),
      maxTtl: Duration.days(7),
      minTtl: Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all()
    })
  }
});
```

**API Response Caching**:
- Leaderboards: 1 minute TTL
- Player profiles: 5 minutes TTL
- Category list: 1 hour TTL
- NFT catalog: 10 minutes TTL

**Redis Caching**:
- Session state: 15 minutes TTL
- Daily limits: 24 hours TTL
- Question seen: 24 hours TTL
- Leaderboards: No TTL (updated in real-time)

### Database Optimization

**Query Optimization**:
```sql
-- Use covering indexes
CREATE INDEX idx_sessions_player_date 
ON sessions(player_id, started_at DESC) 
INCLUDE (score, status);

-- Partition large tables
CREATE TABLE sessions (
  id UUID,
  started_at TIMESTAMPTZ,
  ...
) PARTITION BY RANGE (started_at);

-- Use materialized views for leaderboards
CREATE MATERIALIZED VIEW season_leaderboard AS
SELECT 
  stake_key,
  SUM(points) as total_points,
  COUNT(*) as sessions,
  AVG(avg_answer_ms) as avg_time
FROM season_points
WHERE season_id = 'current'
GROUP BY stake_key
ORDER BY total_points DESC;
```

**Connection Pooling**:
```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'trivianft',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections per Lambda
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Performance Monitoring

**Key Metrics**:
1. **API Latency**:
   - p50, p95, p99 response times
   - Breakdown by endpoint
   - Track cold starts separately

2. **Database Performance**:
   - Query execution time
   - Connection pool utilization
   - Slow query log (> 1s)

3. **Redis Performance**:
   - Command latency
   - Memory utilization
   - Eviction rate

4. **Blockchain Performance**:
   - Transaction submission time
   - Confirmation time
   - Failure rate

**CloudWatch Dashboards**:
```typescript
const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
  dashboardName: 'TriviaNFT-Production'
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'API Latency',
    left: [
      apiLatencyP50,
      apiLatencyP95,
      apiLatencyP99
    ]
  }),
  new cloudwatch.GraphWidget({
    title: 'Active Sessions',
    left: [activeSessionsMetric]
  }),
  new cloudwatch.GraphWidget({
    title: 'Mint Success Rate',
    left: [mintSuccessRate]
  })
);
```

### Cost Optimization

**Strategies**:
1. **Aurora Auto-Pause**: Scale to 0 ACUs during low traffic
2. **Lambda Right-Sizing**: Optimize memory allocation
3. **S3 Lifecycle Policies**: Move old logs to Glacier
4. **CloudFront Compression**: Enable Gzip/Brotli
5. **Reserved Capacity**: Purchase for predictable workloads

**Cost Monitoring**:
- AWS Budgets with alerts at 80%, 100%
- Cost allocation tags by environment
- Monthly cost reports by service
- Anomaly detection enabled

**Estimated Monthly Costs** (1000 daily active users):
- Lambda: $50
- Aurora Serverless v2: $100
- ElastiCache: $150
- CloudFront: $30
- S3: $10
- API Gateway: $20
- Other services: $40
- **Total: ~$400/month**


## Mobile Strategy

### Progressive Web App (Phase 1)

**PWA Features**:
- Installable on home screen
- Offline shell with service worker
- Push notifications (future)
- Responsive design for all screen sizes

**Service Worker**:
```typescript
// service-worker.ts
const CACHE_NAME = 'trivianft-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Web App Manifest**:
```json
{
  "name": "TriviaNFT",
  "short_name": "TriviaNFT",
  "description": "Blockchain trivia game with NFT rewards",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B1220",
  "theme_color": "#4C7DFF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Native Apps (Phase 2)

**Expo Native App**:
- Shared codebase with web (Expo Router)
- Platform-specific optimizations
- Native wallet integration strategies

**Wallet Integration Options**:

1. **dApp Browser Deep Links** (Current):
   ```typescript
   const openWalletDApp = async () => {
     const dappUrl = 'https://app.trivianft.com';
     const walletScheme = 'eternl://dapp';
     await Linking.openURL(`${walletScheme}?url=${encodeURIComponent(dappUrl)}`);
   };
   ```

2. **Centralized Signer** (Alternative):
   - Backend signs transactions
   - User confirms in-app
   - No wallet app required
   - Policy keys secured in Secrets Manager

3. **WalletConnect Bridge** (Future):
   - When Cardano WalletConnect is mature
   - Sign transactions fully in-app
   - Better UX than deep links

**Build Configuration**:
```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.trivianft.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@trivianft.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json"
      }
    }
  }
}
```

**App Store Optimization**:
- Screenshots showcasing gameplay
- Video preview of session flow
- Keywords: trivia, blockchain, NFT, Cardano
- Localization for major markets

### Cross-Platform Considerations

**Shared Code**:
- UI components (90% shared)
- Business logic (100% shared)
- API client (100% shared)
- State management (100% shared)

**Platform-Specific Code**:
- Wallet integration
- Push notifications
- Deep linking
- Biometric authentication

**Testing Strategy**:
- Test on iOS simulator and physical devices
- Test on Android emulator and physical devices
- Test PWA on Safari, Chrome, Firefox
- Test wallet integrations on each platform


## Future Enhancements

### Phase 1 (MVP) - Months 1-3
- Core gameplay with 9 categories
- Guest and wallet-connected play
- NFT minting for perfect scores
- Basic forging (Category Ultimate)
- Global leaderboard
- Season 1 launch

### Phase 2 - Months 4-6
- Native mobile apps (iOS/Android)
- Master and Seasonal forging
- Category-specific leaderboards
- Enhanced profile with statistics
- Question reporting and moderation tools
- Social features (share scores)

### Phase 3 - Months 7-9
- Multiplayer modes (head-to-head)
- Tournament system
- Staking mechanics (stake ADA to play)
- Governance token for platform decisions
- NFT marketplace integration
- Referral program

### Phase 4 - Months 10-12
- Decentralized question generation (community-submitted)
- Smart contract migration (Plutus)
- Cross-chain NFT bridging
- Advanced analytics dashboard
- API for third-party integrations
- White-label solution for other projects

### Technical Debt and Improvements

**Short-Term**:
- Implement comprehensive error tracking (Sentry)
- Add feature flags (LaunchDarkly)
- Improve test coverage to 80%+
- Optimize bundle size (code splitting)
- Add performance monitoring (New Relic)

**Long-Term**:
- Migrate to GraphQL API
- Implement event sourcing for audit trail
- Add real-time features with WebSockets
- Implement CQRS pattern for reads/writes
- Consider multi-region deployment

### Monitoring and Observability Enhancements

**Distributed Tracing**:
- Implement AWS X-Ray across all services
- Trace requests from frontend to blockchain
- Identify bottlenecks and optimize

**Custom Metrics**:
- Player engagement metrics (session completion rate)
- NFT economics (mint rate, forge rate)
- Category popularity
- Peak usage times
- Conversion funnel (guest → connected → minter)

**Alerting Improvements**:
- Anomaly detection for unusual patterns
- Predictive alerts for capacity issues
- Integration with PagerDuty for on-call
- Automated remediation for common issues

### Blockchain Enhancements

**Smart Contract Migration**:
```haskell
-- Plutus minting policy (future)
{-# INLINABLE mkPolicy #-}
mkPolicy :: PubKeyHash -> ScriptContext -> Bool
mkPolicy pkh ctx = 
  traceIfFalse "Perfect score required" checkPerfectScore &&
  traceIfFalse "Invalid signature" (txSignedBy info pkh)
  where
    info = scriptContextTxInfo ctx
    checkPerfectScore = -- Verify off-chain proof
```

**Decentralization Roadmap**:
1. Open-source smart contracts
2. Multi-sig for policy keys (3-of-5)
3. DAO governance for game parameters
4. Community-run validators
5. Fully decentralized question generation

### Community Features

**Social Integration**:
- Discord bot for leaderboard updates
- Twitter integration for score sharing
- Telegram notifications for eligibilities
- Reddit community for strategy discussion

**Content Creation**:
- Question submission portal
- Community voting on questions
- Rewards for accepted questions
- Seasonal question themes

**Competitive Features**:
- Weekly tournaments with prizes
- Guild/team system
- Achievement badges
- Streak tracking and bonuses

