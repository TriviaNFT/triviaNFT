# Running Tests

## Unit Tests

Unit tests can be run without any external dependencies:

```bash
pnpm test packages/shared
```

## Integration Tests

Integration tests require PostgreSQL and Redis to be running locally.

### Prerequisites

1. **PostgreSQL** (port 5432)
   - Database: `trivianft_test`
   - User: `trivia_admin`
   - Password: `local_dev_password`

2. **Redis** (port 6379)
   - Database: 1 (for test isolation)

### Setup

#### Option 1: Using Docker

```bash
# Start PostgreSQL
docker run -d \
  --name trivianft-test-db \
  -e POSTGRES_DB=trivianft_test \
  -e POSTGRES_USER=trivia_admin \
  -e POSTGRES_PASSWORD=local_dev_password \
  -p 5432:5432 \
  postgres:15

# Start Redis
docker run -d \
  --name trivianft-test-redis \
  -p 6379:6379 \
  redis:7-alpine

# Run migrations
cd services/api
pnpm db:migrate
```

#### Option 2: Local Installation

Install PostgreSQL and Redis locally, then configure them with the credentials above.

### Running Integration Tests

Once the services are running:

```bash
# Run all tests (including integration tests)
pnpm test

# Run only integration tests
pnpm test services/api/src/__tests__/integration
```

### Cleanup

```bash
# Stop and remove Docker containers
docker stop trivianft-test-db trivianft-test-redis
docker rm trivianft-test-db trivianft-test-redis
```

## Playwright E2E Tests

E2E tests are run separately using Playwright:

```bash
cd apps/web
pnpm test:e2e
```

These tests will start a development server automatically and run browser-based tests.
