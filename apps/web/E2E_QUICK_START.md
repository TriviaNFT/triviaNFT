# E2E Tests Quick Start Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Web app dependencies installed

## Installation

```bash
# From apps/web directory
cd apps/web

# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

## Running Tests

### Run All Tests

```bash
pnpm test:e2e
```

### Run Specific Test File

```bash
# Guest session tests
pnpm exec playwright test guest-session

# Wallet connection tests
pnpm exec playwright test wallet-connection

# Perfect score and minting tests
pnpm exec playwright test perfect-score

# Forging tests
pnpm exec playwright test forging

# Leaderboard tests
pnpm exec playwright test leaderboard

# Session timeout tests
pnpm exec playwright test session-timeout

# Daily limits tests
pnpm exec playwright test daily-limits
```

### Interactive Mode

```bash
# Run tests in UI mode (recommended for development)
pnpm test:e2e:ui
```

### Debug Mode

```bash
# Run tests with Playwright Inspector
pnpm test:e2e:debug
```

### Headed Mode

```bash
# See the browser while tests run
pnpm test:e2e:headed
```

## Test Reports

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

## Common Commands

```bash
# List all tests
pnpm exec playwright test --list

# Run tests matching a pattern
pnpm exec playwright test --grep "wallet"

# Run tests in a specific file
pnpm exec playwright test e2e/guest-session.spec.ts

# Run a specific test
pnpm exec playwright test -g "should generate anonymous ID"

# Update snapshots (if using visual regression)
pnpm exec playwright test --update-snapshots
```

## Environment Configuration

Tests use `.env.test` for configuration. Default values:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_MOCK_BLOCKCHAIN=true
```

Override with environment variables:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8081 pnpm test:e2e
```

## Test Structure

```
e2e/
├── fixtures/
│   └── auth.ts              # Authentication fixtures
├── utils/
│   └── test-helpers.ts      # Helper functions
├── guest-session.spec.ts    # Guest user tests
├── wallet-connection.spec.ts # Wallet tests
├── perfect-score.spec.ts    # Minting tests
├── forging.spec.ts          # Forging tests
├── leaderboard.spec.ts      # Leaderboard tests
├── session-timeout.spec.ts  # Timeout tests
└── daily-limits.spec.ts     # Limits tests
```

## Test Coverage

- **60+ test cases** across 7 test files
- **20+ requirements** covered
- **All critical user flows** tested

## Troubleshooting

### Dev Server Not Starting

If tests fail because dev server won't start:

```bash
# Start dev server manually in another terminal
pnpm dev

# Run tests without starting server
PLAYWRIGHT_BASE_URL=http://localhost:8081 pnpm exec playwright test
```

### Browser Installation Issues

```bash
# Reinstall browsers
pnpm exec playwright install --force chromium

# Check browser installation
pnpm exec playwright install --dry-run
```

### Tests Timing Out

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  timeout: 60000, // 60 seconds per test
}
```

### Flaky Tests

Run tests multiple times to identify flaky tests:

```bash
# Run tests 3 times
pnpm exec playwright test --repeat-each=3
```

## CI/CD Integration

Tests run automatically in CI/CD pipelines. To run locally as CI would:

```bash
CI=true pnpm test:e2e
```

## Next Steps

1. Review test files in `e2e/` directory
2. Read `E2E_TESTS_SUMMARY.md` for detailed documentation
3. Check `README.md` in `e2e/` for best practices
4. Run tests in UI mode to see them in action

## Support

For issues or questions:
1. Check `E2E_TESTS_SUMMARY.md` for detailed documentation
2. Review Playwright documentation: https://playwright.dev
3. Check test helper functions in `e2e/utils/test-helpers.ts`
