# End-to-End Tests with Playwright

This directory contains E2E tests for the TriviaNFT web application using Playwright.

## Setup

### Prerequisites

- Node.js 20+
- pnpm 8+
- Playwright browsers installed

### Installation

```bash
# Install dependencies (from apps/web)
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

## Running Tests

### Run all tests

```bash
pnpm test:e2e
```

### Run tests in UI mode (interactive)

```bash
pnpm test:e2e:ui
```

### Run specific test file

```bash
pnpm exec playwright test e2e/guest-session.spec.ts
```

### Run tests in headed mode (see browser)

```bash
pnpm exec playwright test --headed
```

### Debug tests

```bash
pnpm exec playwright test --debug
```

## Test Structure

```
e2e/
├── fixtures/           # Test fixtures and utilities
│   └── auth.ts        # Authentication fixtures
├── utils/             # Helper functions
│   └── test-helpers.ts
├── guest-session.spec.ts      # Guest user session tests
├── wallet-connection.spec.ts  # Wallet connection tests
├── perfect-score.spec.ts      # Perfect score and minting tests
├── forging.spec.ts           # NFT forging tests
├── leaderboard.spec.ts       # Leaderboard tests
├── session-timeout.spec.ts   # Timeout handling tests
└── daily-limits.spec.ts      # Daily limit tests
```

## Test Environment

Tests use the `.env.test` configuration file which should point to:
- Test/staging API endpoint
- Preprod Cardano network
- Mock blockchain transactions

## Fixtures

### Auth Fixtures

- `mockWallet`: Injects a mock CIP-30 wallet for testing
- `createTestProfile`: Creates a test user profile
- `getGuestId`: Retrieves guest anonymous ID from storage

## Test Helpers

See `utils/test-helpers.ts` for available utility functions:
- `waitForElement`: Wait for element to be visible
- `clickButton`: Click button by text
- `fillField`: Fill form field
- `mockApiResponse`: Mock API responses
- `waitForTimer`: Wait for countdown timer
- `verifyToast`: Verify notification messages

## Best Practices

1. **Use data-testid attributes**: Add `data-testid` to components for reliable selectors
2. **Mock external services**: Mock blockchain and API calls when appropriate
3. **Clean up after tests**: Clear localStorage and reset state
4. **Use fixtures**: Leverage fixtures for common setup tasks
5. **Wait for elements**: Always wait for elements before interacting
6. **Verify state changes**: Check that actions produce expected results

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Before deployments

## Troubleshooting

### Tests timing out

- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify API endpoint is accessible

### Flaky tests

- Add explicit waits for dynamic content
- Use `waitForLoadingComplete` helper
- Check for race conditions

### Browser not launching

- Run `pnpm exec playwright install chromium`
- Check system dependencies

## Requirements Coverage

These E2E tests cover the following requirements:
- Requirement 1: Session Management
- Requirement 2: Session Concurrency Control
- Requirement 3: Daily Session Limits
- Requirement 5: First-Time Wallet Connection
- Requirement 10: Perfect Score Mint Eligibility
- Requirement 14: NFT Minting Process
- Requirement 15: Category Ultimate Forging
- Requirement 25: Global and Category Leaderboards
- Requirement 46: Observability - Logging
