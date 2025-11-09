# Integration Tests

This directory contains integration tests for the TriviaNFT API services. These tests verify the complete functionality of the system including database operations, Redis caching, and service interactions.

## Test Coverage

### 1. Session Flow Tests (`session-flow.test.ts`)
Tests the complete session flow including:
- Guest session creation
- Wallet connection and profile creation
- Session with all correct answers
- Session with mixed answers
- Session timeout handling
- Eligibility creation for perfect score
- Daily limit enforcement
- Cooldown enforcement

**Requirements Tested**: 1, 2, 5, 10

### 2. Minting Flow Tests (`minting-flow.test.ts`)
Tests the NFT minting flow including:
- Eligibility validation
- NFT stock management
- Mint operation creation
- Mint status updates
- Complete minting flow with database updates
- NFT appears in player inventory
- Error handling for insufficient stock

**Requirements Tested**: 14

### 3. Forging Flow Tests (`forging-flow.test.ts`)
Tests the NFT forging flow including:
- Forge progress tracking
- NFT ownership validation
- Category Ultimate forging with 10 NFTs
- Master Ultimate forging with 10 categories
- Seasonal Ultimate forging
- Forge operation management
- Burn and mint transaction handling
- Error handling

**Requirements Tested**: 15, 16, 17

### 4. Leaderboard Updates Tests (`leaderboard-updates.test.ts`)
Tests leaderboard functionality including:
- Points calculation after session
- Tie-breaker logic (NFTs minted, perfect scores, avg time, sessions used)
- Redis ZSET updates with composite scores
- Leaderboard pagination
- Category-specific leaderboards
- Season points persistence in Aurora

**Requirements Tested**: 21, 22, 25

## Prerequisites

Before running integration tests, you need:

1. **PostgreSQL Database**
   - Running instance (local or remote)
   - Database created with schema from `migrations/1_initial-schema.sql`

2. **Redis Instance**
   - Running instance (local or remote)
   - No special configuration required

3. **Environment Variables**
   Set the following environment variables:

   ```bash
   # Database Configuration
   export DATABASE_URL="postgresql://user:password@localhost:5432/trivianft_test"
   # OR
   export DB_HOST="localhost"
   export DB_PORT="5432"
   export DB_NAME="trivianft_test"
   export DB_USER="postgres"
   export DB_PASSWORD="postgres"

   # Redis Configuration
   export REDIS_URL="redis://localhost:6379"
   # OR
   export REDIS_HOST="localhost"
   export REDIS_PORT="6379"
   ```

## Running Tests

### Run All Integration Tests
```bash
cd services/api
pnpm test
```

### Run Specific Test File
```bash
cd services/api
pnpm test session-flow.test.ts
```

### Run Tests with Coverage
```bash
cd services/api
pnpm test --coverage
```

## Local Development Setup

### Using Docker Compose

Create a `docker-compose.test.yml` file:

```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: trivianft_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
    volumes:
      - redis-test-data:/data

volumes:
  postgres-test-data:
  redis-test-data:
```

Start test infrastructure:
```bash
docker-compose -f docker-compose.test.yml up -d
```

Run migrations:
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trivianft_test"
pnpm migrate:up
```

Set environment variables:
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trivianft_test"
export REDIS_URL="redis://localhost:6380"
```

Run tests:
```bash
pnpm test
```

## Test Structure

Each test file follows this structure:

1. **beforeAll**: Set up test data (categories, players, NFTs, etc.)
2. **beforeEach**: Reset state for each test (optional)
3. **Test Suites**: Organized by functionality
4. **afterAll**: Clean up test data

## Important Notes

1. **Test Isolation**: Each test file creates its own test data with unique identifiers to avoid conflicts.

2. **Cleanup**: All tests clean up their data in the `afterAll` hook. If tests fail, you may need to manually clean up the database.

3. **Timing**: Some tests include small delays (e.g., cooldown tests) to verify time-based functionality.

4. **Mocked External Services**: These tests do NOT make actual blockchain transactions or IPFS uploads. Those operations are mocked/simulated.

5. **Database State**: Tests assume a clean database with the schema applied but no existing data.

## Troubleshooting

### Database Connection Errors
```
Error: DATABASE_URL or DATABASE_SECRET_ARN must be set
```
**Solution**: Set the `DATABASE_URL` environment variable or individual DB_* variables.

### Redis Connection Errors
```
Error: REDIS_URL or REDIS_SECRET_ARN must be set
```
**Solution**: Set the `REDIS_URL` environment variable or individual REDIS_* variables.

### Test Timeouts
If tests timeout, check that:
- Database and Redis are running and accessible
- Network connectivity is working
- No other processes are holding locks on test data

### Cleanup Issues
If tests fail and leave data behind:
```sql
-- Clean up test data manually
DELETE FROM player_nfts WHERE stake_key LIKE 'stake1test%';
DELETE FROM forge_operations WHERE stake_key LIKE 'stake1test%';
DELETE FROM mints WHERE player_id IN (SELECT id FROM players WHERE stake_key LIKE 'stake1test%');
DELETE FROM eligibilities WHERE stake_key LIKE 'stake1test%';
DELETE FROM sessions WHERE stake_key LIKE 'stake1test%';
DELETE FROM season_points WHERE stake_key LIKE 'stake1test%';
DELETE FROM players WHERE stake_key LIKE 'stake1test%';
DELETE FROM categories WHERE name LIKE '%Test%';
DELETE FROM seasons WHERE name LIKE '%Test%';
```

## CI/CD Integration

For CI/CD pipelines, use the Docker Compose setup:

```yaml
# .github/workflows/test.yml
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: trivianft_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm migrate:up
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trivianft_test
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trivianft_test
          REDIS_URL: redis://localhost:6379
```

## Future Enhancements

- Add E2E tests with Playwright for full user flows
- Add load testing with Artillery or k6
- Add contract testing for API endpoints
- Add snapshot testing for database schema
- Add performance benchmarks
