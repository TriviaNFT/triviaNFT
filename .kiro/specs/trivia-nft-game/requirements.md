# Requirements Document

## Introduction

TriviaNFT is a blockchain-based trivia gaming platform built on Cardano that rewards players with NFTs for perfect gameplay. The system combines real-time trivia gameplay with NFT minting, forging mechanics, seasonal competitions, and leaderboards. The platform supports both guest and connected wallet users, implements sophisticated session management, and provides a comprehensive progression system with multiple NFT tiers (Category, Ultimate, Master, and Seasonal).

## Glossary

- **System**: The TriviaNFT platform (web application, API, and blockchain integration)
- **Player**: A user interacting with the trivia game (guest or wallet-connected)
- **Session**: A single trivia game instance consisting of 10 questions
- **Stake Key**: A Cardano wallet identifier used for player authentication
- **Mint Eligibility**: A time-limited right to mint an NFT earned by achieving a perfect score
- **Forging**: The process of combining multiple NFTs to create higher-tier NFTs
- **Category NFT**: A basic NFT earned from a perfect score in a specific category
- **Ultimate NFT**: A higher-tier NFT created by forging 10 NFTs from the same category
- **Master NFT**: The highest-tier NFT created by forging NFTs from 10 different categories
- **Seasonal NFT**: A special NFT available only during active seasons
- **Guest User**: A player who has not connected a Cardano wallet
- **Connected User**: A player who has connected a Cardano wallet
- **Ladder**: A ranked leaderboard showing player standings
- **Season**: A 3-month competitive period with its own leaderboard and rewards
- **Bedrock**: AWS service used for AI-powered question generation
- **IPFS**: InterPlanetary File System for decentralized NFT metadata storage
- **Blockfrost**: Third-party API service for Cardano blockchain interactions

## Requirements

### Requirement 1: Session Management

**User Story:** As a player, I want to start a trivia session with clear rules and time limits, so that I have a fair and consistent gameplay experience.

#### Acceptance Criteria

1. WHEN a Player initiates a session, THE System SHALL present exactly 10 questions from the selected category
2. WHEN a question is displayed, THE System SHALL enforce a 10-second countdown timer
3. IF the timer reaches zero, THEN THE System SHALL record the answer as incorrect and advance to the next question
4. WHILE a session is active, THE System SHALL prevent the Player from pausing or skipping questions
5. WHEN a Player refreshes the browser during an active session, THE System SHALL resume the session at the current question with the timer continuing from where it left off

### Requirement 2: Session Concurrency Control

**User Story:** As a player, I want to ensure only one active session exists at a time, so that my progress is not corrupted by multiple simultaneous games.

#### Acceptance Criteria

1. WHEN a Player with an active session attempts to start a new session, THE System SHALL display a message advising the Player to complete the current session
2. THE System SHALL enforce a maximum of one active session per stake key for connected Players
3. THE System SHALL enforce a maximum of one active session per anonymous identifier for guest Players
4. WHEN a Player abandons a session by closing the browser beyond the timer expiration, THE System SHALL record the session as a loss
5. WHEN a Player opens the application on a different device with an active session, THE System SHALL display the active session notification

### Requirement 3: Daily Session Limits

**User Story:** As a player, I want to know my daily session limits, so that I can plan my gameplay accordingly.

#### Acceptance Criteria

1. THE System SHALL allow connected Players to complete up to 10 sessions per day
2. THE System SHALL allow guest Players to complete up to 5 sessions per day
3. WHEN a guest Player connects a wallet, THE System SHALL increase the daily limit to 10 sessions
4. WHEN the daily reset time (midnight ET) occurs, THE System SHALL reset all Players' session counts to zero
5. WHEN a Player attempts to start a session beyond their daily limit, THE System SHALL display a message indicating the limit has been reached with the reset countdown

### Requirement 4: Session Cooldown

**User Story:** As a player, I want a brief cooldown between sessions, so that the system can process my results and prevent rapid-fire gaming.

#### Acceptance Criteria

1. WHEN a Player completes a session, THE System SHALL enforce a 60-second cooldown before allowing the next session
2. THE System SHALL display a countdown timer showing the remaining cooldown time
3. WHEN the daily reset occurs, THE System SHALL not apply the cooldown to the first session
4. THE System SHALL allow configuration of the cooldown duration through administrative settings
5. WHEN the cooldown expires, THE System SHALL enable the start session button

### Requirement 5: First-Time Wallet Connection

**User Story:** As a new player connecting my wallet, I want to create a username and optionally provide my email, so that I can establish my identity on the platform.

#### Acceptance Criteria

1. WHEN a Player connects a wallet for the first time, THE System SHALL display a profile creation prompt
2. THE System SHALL require the Player to enter a unique username
3. THE System SHALL validate that the username is not already taken
4. THE System SHALL allow the Player to optionally provide an email address
5. WHEN the Player submits the profile information, THE System SHALL store the username and stake key association

### Requirement 6: Category Selection

**User Story:** As a player, I want to choose a trivia category for each session, so that I can play topics that interest me.

#### Acceptance Criteria

1. THE System SHALL display all available categories before session start
2. WHEN a Player selects a category, THE System SHALL lock that category for the duration of the session
3. THE System SHALL allow the Player to select a different category for each new session
4. WHEN a Player exits a session before completion, THE System SHALL record the session as a loss
5. THE System SHALL display the number of NFTs the Player has earned in each category

### Requirement 7: Question Generation and Storage

**User Story:** As a system administrator, I want questions to be generated using AI and stored efficiently, so that players have fresh content while maintaining performance.

#### Acceptance Criteria

1. THE System SHALL generate trivia questions using AWS Bedrock
2. THE System SHALL store generated questions in Amazon S3 as JSON files
3. WHEN the question pool reaches 1,000 questions for a category, THE System SHALL present 5 reused questions and 5 newly generated questions per session
4. THE System SHALL maintain a configurable ratio of reused to new questions
5. THE System SHALL index questions in a database table for efficient retrieval

### Requirement 8: Question Rotation and Repeat Protection

**User Story:** As a player, I want to avoid seeing the same question multiple times in one day, so that my gameplay remains challenging and fair.

#### Acceptance Criteria

1. THE System SHALL prevent a Player from seeing the same question twice in the same category on the same day
2. WHEN midnight ET occurs, THE System SHALL reset the repeat protection for all Players
3. THE System SHALL maintain flat difficulty across all questions in a session
4. THE System SHALL randomly select questions from the available pool
5. THE System SHALL track which questions each Player has seen per category per day

### Requirement 9: Question Reporting

**User Story:** As a player, I want to report ambiguous or incorrect questions, so that the quality of the trivia content improves over time.

#### Acceptance Criteria

1. THE System SHALL display a report button for each question during gameplay
2. WHEN a Player reports a question, THE System SHALL not affect the current session score
3. THE System SHALL queue the flagged question for developer review
4. THE System SHALL store the Player identifier and reason with each flag
5. THE System SHALL allow Players to provide optional text explaining the issue

### Requirement 10: Perfect Score Mint Eligibility

**User Story:** As a player, I want to earn the right to mint an NFT when I achieve a perfect score, so that my skill is rewarded with a blockchain asset.

#### Acceptance Criteria

1. WHEN a Player answers all 10 questions correctly, THE System SHALL grant one mint eligibility for that session's category
2. THE System SHALL display a notification informing the Player of the mint eligibility
3. THE System SHALL set an expiration time of 1 hour for connected Players
4. THE System SHALL set an expiration time of 25 minutes for guest Players
5. WHEN the expiration time elapses without minting, THE System SHALL remove the eligibility and return the NFT to available stock

### Requirement 11: Guest Mint Eligibility Window

**User Story:** As a guest player who achieves a perfect score, I want time to connect my wallet and claim my NFT, so that I don't lose my reward.

#### Acceptance Criteria

1. WHEN a guest Player achieves a perfect score, THE System SHALL remember the eligibility for 25 minutes
2. THE System SHALL display a prominent message encouraging wallet connection
3. WHEN the guest Player connects a wallet within 25 minutes, THE System SHALL transfer the eligibility to the connected wallet
4. IF the guest Player does not connect within 25 minutes, THEN THE System SHALL expire the eligibility
5. WHEN an eligibility expires, THE System SHALL return the NFT to the available stock pool

### Requirement 12: Mint Eligibility Caps

**User Story:** As a player, I want to understand the limits on mint eligibilities, so that I know when to claim my NFTs.

#### Acceptance Criteria

1. THE System SHALL allow a Player to hold multiple mint eligibilities across different categories
2. THE System SHALL enforce a maximum of one active eligibility per category per Player
3. WHEN a Player has an active eligibility for a category, THE System SHALL prevent earning another eligibility in that category until the first is used or expired
4. THE System SHALL display all active eligibilities in the Player's profile
5. THE System SHALL show the expiration countdown for each eligibility

### Requirement 13: NFT Stock Management

**User Story:** As a player, I want to know if NFTs are available before playing, so that I can make informed decisions about which categories to play.

#### Acceptance Criteria

1. THE System SHALL not reserve NFT supply when mint eligibility is granted
2. THE System SHALL consume NFT supply only when a mint transaction is confirmed
3. WHEN a category has zero available NFTs, THE System SHALL display a message: "No NFTs are available for this category right now. Please try again later or play a different category."
4. THE System SHALL update the available stock count in real-time after each mint
5. THE System SHALL display the current stock count for each category

### Requirement 14: NFT Minting Process

**User Story:** As a player with mint eligibility, I want to mint my NFT to the blockchain, so that I own a permanent record of my achievement.

#### Acceptance Criteria

1. WHEN a Player initiates a mint, THE System SHALL select an available NFT from the category catalog
2. THE System SHALL upload the NFT metadata to IPFS via Blockfrost or NFT.Storage
3. THE System SHALL create a Cardano transaction minting the NFT to the Player's wallet
4. THE System SHALL mark the catalog item as minted
5. WHEN the transaction is confirmed on-chain, THE System SHALL record the NFT in the player_nfts table

### Requirement 15: Category Ultimate Forging

**User Story:** As a player, I want to forge 10 NFTs from the same category into an Ultimate NFT, so that I can showcase my mastery of that category.

#### Acceptance Criteria

1. WHEN a Player owns 10 distinct NFTs from the same category, THE System SHALL display a forge button for that category
2. WHEN the Player initiates forging, THE System SHALL display a confirmation message: "Forging will consume your NFTs permanently. Proceed?"
3. WHEN the Player confirms, THE System SHALL validate ownership of all 10 input NFTs
4. THE System SHALL burn the 10 input NFTs on the Cardano blockchain
5. WHEN the burn is confirmed, THE System SHALL mint an Ultimate Trivia NFT for that category to the Player's wallet

### Requirement 16: Master Ultimate Forging

**User Story:** As a player, I want to forge NFTs from 10 different categories into a Master NFT, so that I can demonstrate my broad trivia knowledge.

#### Acceptance Criteria

1. WHEN a Player owns at least one NFT from 10 different categories, THE System SHALL display a Master forge button
2. WHEN the Player initiates Master forging, THE System SHALL display a confirmation message: "Forging will consume your NFTs permanently. Proceed?"
3. WHEN the Player confirms, THE System SHALL validate ownership of NFTs from 10 distinct categories
4. THE System SHALL burn one NFT from each of the 10 categories
5. WHEN the burn is confirmed, THE System SHALL mint a General Trivia Master Ultimate NFT to the Player's wallet

### Requirement 17: Seasonal Ultimate Forging

**User Story:** As a player during an active season, I want to forge seasonal NFTs into a Seasonal Ultimate, so that I can earn exclusive seasonal rewards.

#### Acceptance Criteria

1. WHEN a Player owns 2 NFTs from each active category in the current season, THE System SHALL display a Seasonal forge button
2. THE System SHALL only allow Seasonal forging during the active season or within a 7-day grace period after season end
3. WHEN the Player initiates Seasonal forging, THE System SHALL display a confirmation message: "Forging will consume your NFTs permanently. Proceed?"
4. WHEN the Player confirms, THE System SHALL validate ownership of 2 NFTs from each seasonal category
5. WHEN the burn is confirmed, THE System SHALL mint an Ultimate Trivia Seasonal NFT to the Player's wallet

### Requirement 18: Forging Ownership Rules

**User Story:** As a player, I want forging eligibility to follow NFT ownership, so that I can trade NFTs and still forge with my current collection.

#### Acceptance Criteria

1. THE System SHALL calculate forging eligibility based on current wallet ownership
2. WHEN a Player transfers an NFT to another wallet, THE System SHALL remove that NFT from the original Player's forging progress
3. WHEN a Player receives an NFT from another wallet, THE System SHALL add that NFT to the receiving Player's forging progress
4. THE System SHALL update forging eligibility indicators in real-time when NFT ownership changes
5. THE System SHALL verify on-chain ownership before allowing any forge operation

### Requirement 19: Season Configuration

**User Story:** As a system administrator, I want to configure seasons with specific durations and names, so that I can run competitive events throughout the year.

#### Acceptance Criteria

1. THE System SHALL support seasons with a default duration of 3 months
2. THE System SHALL allow configuration of season name, start date, and end date
3. THE System SHALL allow configuration of the grace period duration after season end
4. THE System SHALL automatically transition to the next season when the current season ends
5. THE System SHALL maintain a historical record of all past seasons

### Requirement 20: Win and Loss Determination

**User Story:** As a player, I want my session results to be accurately classified as wins or losses, so that my seasonal standing is fair.

#### Acceptance Criteria

1. WHEN a Player completes a session with 6 or more correct answers, THE System SHALL record the session as a win
2. WHEN a Player completes a session with 5 or fewer correct answers, THE System SHALL record the session as a loss
3. WHEN a Player abandons or forfeits a session, THE System SHALL record the session as a loss
4. THE System SHALL require 10 correct answers for mint eligibility regardless of win status
5. THE System SHALL not subtract points for losses

### Requirement 21: Season Points Calculation

**User Story:** As a player, I want to earn points for correct answers and bonuses for perfect scores, so that I can compete on the seasonal leaderboard.

#### Acceptance Criteria

1. WHEN a Player answers a question correctly, THE System SHALL award 1 point
2. WHEN a Player achieves a perfect score (10/10), THE System SHALL award a 10-point bonus
3. THE System SHALL allow configuration of the points per correct answer
4. THE System SHALL allow configuration of the perfect score bonus
5. THE System SHALL accumulate points throughout the season for each Player

### Requirement 22: Season Leaderboard Tie-Breakers

**User Story:** As a player, I want clear tie-breaking rules for the leaderboard, so that rankings are fair and deterministic.

#### Acceptance Criteria

1. WHEN two Players have equal points, THE System SHALL rank higher the Player with more NFTs minted this season
2. WHEN NFT counts are equal, THE System SHALL rank higher the Player with more perfect scores this season
3. WHEN perfect scores are equal, THE System SHALL rank higher the Player with faster average answer time
4. WHEN average times are equal, THE System SHALL rank higher the Player with fewer sessions used
5. WHEN session counts are equal, THE System SHALL rank higher the Player who achieved their score earliest

### Requirement 23: Season Carryover Rules

**User Story:** As a player, I want to understand what carries over between seasons, so that I can plan my long-term strategy.

#### Acceptance Criteria

1. THE System SHALL carry over unspent mint eligibilities to the next season until their expiration timers elapse
2. THE System SHALL carry over all owned NFTs to the next season
3. THE System SHALL not carry over seasonal forging eligibility beyond the grace period
4. THE System SHALL reset seasonal points to zero at the start of each new season
5. THE System SHALL maintain an all-time points record separate from seasonal points

### Requirement 24: Season Prize Distribution

**User Story:** As a competitive player, I want to win a prize for topping the seasonal leaderboard, so that my effort is rewarded.

#### Acceptance Criteria

1. WHEN a season ends, THE System SHALL identify the Player with the highest rank on the Global ladder
2. THE System SHALL award a developer-created NFT to the season winner
3. THE System SHALL only award prizes to connected Players with usernames
4. THE System SHALL only award prizes to Players in good standing per the Fair Play policy
5. THE System SHALL announce the season winner on the platform

### Requirement 25: Global and Category Leaderboards

**User Story:** As a player, I want to see my ranking on both global and category-specific leaderboards, so that I can track my performance.

#### Acceptance Criteria

1. THE System SHALL maintain a Global ladder ranking all Players by total seasonal points
2. THE System SHALL maintain separate category ladders for each trivia category
3. THE System SHALL update ladder rankings in real-time after each session
4. THE System SHALL only display connected Players with usernames on ladders
5. THE System SHALL exclude guest Players from all leaderboards

### Requirement 26: Seasonal Leaderboard Reset

**User Story:** As a player, I want the seasonal leaderboard to reset each season, so that everyone has a fair chance to compete.

#### Acceptance Criteria

1. WHEN a new season begins, THE System SHALL reset the seasonal ladder to empty
2. THE System SHALL maintain an all-time leaderboard that persists across seasons
3. THE System SHALL allow configuration of whether to reset seasonal ladders
4. THE System SHALL archive the previous season's final standings
5. THE System SHALL display historical season results in Player profiles

### Requirement 27: Player Profile Display

**User Story:** As a player, I want to view my profile with comprehensive statistics, so that I can track my progress and achievements.

#### Acceptance Criteria

1. THE System SHALL display the Player's username in the profile
2. THE System SHALL display remaining plays for the day with a countdown to reset
3. THE System SHALL display perfect score counts for each category
4. THE System SHALL display all owned NFTs with category, name, and traits
5. THE System SHALL display the current season name and countdown to season end

### Requirement 28: Season History Display

**User Story:** As a player, I want to view my performance across all seasons, so that I can see my long-term progress.

#### Acceptance Criteria

1. THE System SHALL display the current season name (e.g., "Winter" for Season 1)
2. THE System SHALL display a list of all past seasons
3. THE System SHALL display NFTs earned in each season
4. THE System SHALL display the Player's final ladder rank for each completed season
5. THE System SHALL display the Player's total points for each season

### Requirement 29: Forging Progress Indicators

**User Story:** As a player, I want to see my progress toward forging requirements, so that I know how many more NFTs I need.

#### Acceptance Criteria

1. THE System SHALL display a progress bar for each category showing NFTs collected toward Ultimate (e.g., "7/10")
2. THE System SHALL display a progress indicator for Master forging showing categories completed (e.g., "8/10 categories")
3. THE System SHALL display a progress indicator for Seasonal forging showing NFTs per category
4. WHEN forging requirements are met, THE System SHALL display a prominent forge button
5. THE System SHALL update progress indicators in real-time when NFTs are minted or transferred

### Requirement 30: Activity Log

**User Story:** As a player, I want to see a history of my mints and forges, so that I can review my achievements.

#### Acceptance Criteria

1. THE System SHALL display a chronological list of all mint events
2. THE System SHALL display a chronological list of all forge events
3. THE System SHALL label NFTs consumed in forging as "Consumed"
4. THE System SHALL display the date and time of each activity
5. THE System SHALL display the transaction hash for each blockchain event

### Requirement 31: Fair Play Enforcement

**User Story:** As a legitimate player, I want the system to prevent cheating, so that competition remains fair.

#### Acceptance Criteria

1. THE System SHALL monitor for multiple accounts from the same user attempting to bypass daily limits
2. WHEN suspicious behavior is detected, THE System SHALL flag the account for review
3. THE System SHALL have the authority to void scores, eligibilities, or mints for accounts violating Fair Play
4. THE System SHALL prohibit collaboration during active sessions
5. THE System SHALL only award season prizes to Players in good standing

### Requirement 32: Player Messaging - Session Start

**User Story:** As a player, I want clear information when starting a session, so that I understand the rules and stakes.

#### Acceptance Criteria

1. WHEN a Player starts a session, THE System SHALL display the message: "10 questions • 10s each • no pauses • perfect = mint chance"
2. THE System SHALL display this message for at least 3 seconds before the first question
3. THE System SHALL allow the Player to dismiss the message early
4. THE System SHALL display the selected category name
5. THE System SHALL display the current stock count for the category

### Requirement 33: Player Messaging - Timeout

**User Story:** As a player, I want immediate feedback when time expires, so that I understand why my answer wasn't recorded.

#### Acceptance Criteria

1. WHEN the question timer reaches zero, THE System SHALL display the message: "Time's up! That counts as incorrect."
2. THE System SHALL display this message for 2 seconds before advancing to the next question
3. THE System SHALL mark the question as incorrect in the session results
4. THE System SHALL display the correct answer
5. THE System SHALL continue the session with the next question

### Requirement 34: Player Messaging - Perfect Score

**User Story:** As a player who achieves a perfect score, I want immediate notification of my mint eligibility, so that I can claim my reward.

#### Acceptance Criteria

1. WHEN a Player achieves a perfect score, THE System SHALL display the message: "Flawless! You've unlocked a [Category] mint. Claim within 1 hour."
2. THE System SHALL replace "1 hour" with "25 minutes" for guest Players
3. THE System SHALL display a prominent "Mint Now" button
4. THE System SHALL show the expiration countdown
5. THE System SHALL navigate to the minting interface when the button is clicked

### Requirement 35: Player Messaging - Forge Confirmation

**User Story:** As a player initiating a forge, I want a clear warning about NFT consumption, so that I don't accidentally destroy my NFTs.

#### Acceptance Criteria

1. WHEN a Player clicks a forge button, THE System SHALL display the message: "Forging will consume your NFTs permanently. Proceed?"
2. THE System SHALL display a "Cancel" button and a "Confirm" button
3. THE System SHALL list all NFTs that will be consumed
4. WHEN the Player clicks "Cancel", THE System SHALL close the dialog without forging
5. WHEN the Player clicks "Confirm", THE System SHALL initiate the forge operation

### Requirement 36: Configurable Game Parameters

**User Story:** As a system administrator, I want to configure game parameters without code changes, so that I can tune the gameplay experience.

#### Acceptance Criteria

1. THE System SHALL allow configuration of questions per session via AWS AppConfig
2. THE System SHALL allow configuration of per-question timer duration via AWS AppConfig
3. THE System SHALL allow configuration of session cooldown duration via AWS AppConfig
4. THE System SHALL allow configuration of daily reset time via AWS AppConfig
5. THE System SHALL allow configuration of repeat-protection window via AWS AppConfig

### Requirement 37: Configurable Eligibility Windows

**User Story:** As a system administrator, I want to configure mint eligibility windows, so that I can balance urgency with player convenience.

#### Acceptance Criteria

1. THE System SHALL allow configuration of connected player claim window via AWS AppConfig
2. THE System SHALL allow configuration of guest player claim window via AWS AppConfig
3. THE System SHALL apply the configured windows to all new eligibilities
4. THE System SHALL not retroactively change windows for existing eligibilities
5. THE System SHALL validate that configured windows are between 1 minute and 24 hours

### Requirement 38: Configurable Forging Requirements

**User Story:** As a system administrator, I want to configure forging requirements, so that I can adjust the difficulty of obtaining higher-tier NFTs.

#### Acceptance Criteria

1. THE System SHALL allow configuration of Category Ultimate forging count via AWS AppConfig
2. THE System SHALL allow configuration of Master Ultimate forging count via AWS AppConfig
3. THE System SHALL allow configuration of Seasonal Ultimate forging count via AWS AppConfig
4. THE System SHALL allow configuration of seasonal grace period duration via AWS AppConfig
5. THE System SHALL apply configured requirements to all forge operations

### Requirement 39: Configurable Season Parameters

**User Story:** As a system administrator, I want to configure season parameters, so that I can run varied competitive events.

#### Acceptance Criteria

1. THE System SHALL allow configuration of season length via AWS AppConfig
2. THE System SHALL allow configuration of season naming convention via AWS AppConfig
3. THE System SHALL allow configuration of points formula via AWS AppConfig
4. THE System SHALL allow configuration of tie-breaker rules via AWS AppConfig
5. THE System SHALL apply configured parameters to the current and future seasons

### Requirement 40: Web Application Responsiveness

**User Story:** As a player on any device, I want the application to work smoothly on desktop and mobile, so that I can play anywhere.

#### Acceptance Criteria

1. THE System SHALL render the application responsively on desktop browsers (1280x720 minimum)
2. THE System SHALL render the application responsively on mobile browsers (375x667 minimum)
3. THE System SHALL provide touch targets of at least 44x44 pixels on mobile
4. THE System SHALL display the timer prominently on all screen sizes
5. THE System SHALL support both portrait and landscape orientations on mobile

### Requirement 41: Progressive Web App Support

**User Story:** As a mobile player, I want to install the app on my home screen, so that I can access it like a native app.

#### Acceptance Criteria

1. THE System SHALL provide a web app manifest with app name, icons, and display mode
2. THE System SHALL register a service worker for offline shell support
3. THE System SHALL display an install prompt on supported browsers
4. THE System SHALL function in standalone display mode when installed
5. THE System SHALL cache static assets for improved performance

### Requirement 42: Wallet Connection (Web)

**User Story:** As a player on desktop, I want to connect my Cardano wallet, so that I can mint NFTs and participate fully.

#### Acceptance Criteria

1. THE System SHALL support CIP-30 wallet connections (Lace, Eternl, Nami, Typhon)
2. THE System SHALL detect available wallet extensions in the browser
3. WHEN a Player clicks "Connect Wallet", THE System SHALL display available wallet options
4. WHEN a wallet is connected, THE System SHALL retrieve and store the stake key
5. THE System SHALL maintain the wallet connection across page refreshes

### Requirement 43: Wallet Connection (Mobile Web)

**User Story:** As a player on mobile, I want to connect my wallet through dApp browsers, so that I can play on my phone.

#### Acceptance Criteria

1. THE System SHALL support wallet connections through mobile dApp browsers
2. THE System SHALL detect when the application is accessed from a dApp browser
3. THE System SHALL provide deep links to open wallet dApp browsers when needed
4. WHEN a transaction requires signing, THE System SHALL request signature through the dApp browser
5. THE System SHALL handle return navigation after wallet interactions

### Requirement 44: Security - Rate Limiting

**User Story:** As a system administrator, I want to prevent abuse through rate limiting, so that the platform remains available to legitimate users.

#### Acceptance Criteria

1. THE System SHALL implement AWS WAF rate limiting on API endpoints
2. THE System SHALL limit session creation requests to 10 per minute per IP address
3. THE System SHALL limit mint requests to 5 per minute per stake key
4. WHEN rate limits are exceeded, THE System SHALL return HTTP 429 status
5. THE System SHALL present a CAPTCHA challenge for suspicious traffic patterns

### Requirement 45: Security - Authentication

**User Story:** As a player, I want my session to be secure, so that others cannot impersonate me or access my data.

#### Acceptance Criteria

1. THE System SHALL generate a JWT token upon wallet connection
2. THE System SHALL include the stake key in the JWT claims
3. THE System SHALL validate the JWT on all authenticated API requests
4. THE System SHALL expire JWTs after 24 hours
5. THE System SHALL store JWT secrets in AWS Secrets Manager

### Requirement 46: Observability - Logging

**User Story:** As a system administrator, I want comprehensive logs, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. THE System SHALL log all API requests with timestamp, endpoint, and response status
2. THE System SHALL log all session events (start, complete, forfeit)
3. THE System SHALL log all mint and forge operations with transaction hashes
4. THE System SHALL use structured JSON logging format
5. THE System SHALL retain logs for 30 days in CloudWatch

### Requirement 47: Observability - Metrics

**User Story:** As a system administrator, I want real-time metrics, so that I can monitor performance and detect anomalies.

#### Acceptance Criteria

1. THE System SHALL emit metrics for API latency (p50, p95, p99)
2. THE System SHALL emit metrics for session completion rate
3. THE System SHALL emit metrics for mint success rate
4. THE System SHALL emit metrics for active concurrent sessions
5. THE System SHALL display metrics in CloudWatch dashboards

### Requirement 48: Observability - Alarms

**User Story:** As a system administrator, I want to be alerted to critical issues, so that I can respond quickly to outages.

#### Acceptance Criteria

1. THE System SHALL create alarms for API error rate exceeding 5%
2. THE System SHALL create alarms for Lambda function errors
3. THE System SHALL create alarms for database connection failures
4. THE System SHALL create alarms for blockchain transaction failures exceeding 10%
5. THE System SHALL send alarm notifications to SNS topics

### Requirement 49: Data Persistence - Sessions

**User Story:** As a system administrator, I want session data persisted reliably, so that player progress is never lost.

#### Acceptance Criteria

1. THE System SHALL store active session state in Redis with TTL
2. THE System SHALL persist completed sessions to Aurora PostgreSQL
3. THE System SHALL include question IDs, answers, and timing in session records
4. THE System SHALL maintain referential integrity between sessions and players
5. THE System SHALL back up session data daily to S3

### Requirement 50: Data Persistence - NFT Catalog

**User Story:** As a system administrator, I want NFT metadata stored durably, so that minting operations never fail due to missing data.

#### Acceptance Criteria

1. THE System SHALL store NFT artwork in S3 with versioning enabled
2. THE System SHALL store NFT metadata JSON in S3 with versioning enabled
3. THE System SHALL maintain a catalog table in Aurora with S3 keys
4. THE System SHALL pin NFT metadata to IPFS upon minting
5. THE System SHALL store IPFS CIDs in the catalog table after pinning
