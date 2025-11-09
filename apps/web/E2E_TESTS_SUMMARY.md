# End-to-End Tests Summary

## Overview

This document summarizes the Playwright E2E tests implemented for the TriviaNFT web application.

## Test Setup

### Installation

```bash
# Install Playwright and dependencies
pnpm add -D @playwright/test playwright

# Install browsers
pnpm exec playwright install chromium
```

### Configuration

- **Config File**: `playwright.config.ts`
- **Test Directory**: `e2e/`
- **Base URL**: `http://localhost:8081` (configurable via `PLAYWRIGHT_BASE_URL`)
- **Browser**: Chromium (Desktop Chrome)
- **Dev Server**: Auto-starts with `pnpm dev`

### Running Tests

```bash
# Run all tests
pnpm test:e2e

# Run in UI mode
pnpm test:e2e:ui

# Run in headed mode
pnpm test:e2e:headed

# Debug tests
pnpm test:e2e:debug
```

## Test Files

### 1. Guest Session Tests (`guest-session.spec.ts`)

Tests guest user session flow and basic gameplay.

**Test Cases:**
- ✅ Generate anonymous ID for guest user
- ✅ Display category selection
- ✅ Start session and display questions
- ✅ Submit answer and advance to next question
- ✅ Complete session and show results
- ✅ Prevent multiple concurrent sessions
- ✅ Show guest session limit (5 sessions)

**Requirements Covered:**
- Requirement 1: Session Management
- Requirement 2: Session Concurrency Control
- Requirement 3: Daily Session Limits

### 2. Wallet Connection Tests (`wallet-connection.spec.ts`)

Tests wallet connection and profile creation flow.

**Test Cases:**
- ✅ Detect available wallets
- ✅ Connect wallet and retrieve stake key
- ✅ Prompt for profile creation on first connection
- ✅ Create profile with username
- ✅ Validate username uniqueness
- ✅ Allow optional email input
- ✅ Increase daily limit after wallet connection
- ✅ Maintain wallet connection across page refreshes

**Requirements Covered:**
- Requirement 5: First-Time Wallet Connection
- Requirement 42: Wallet Connection (Web)
- Requirement 45: Security - Authentication

### 3. Perfect Score and Minting Tests (`perfect-score.spec.ts`)

Tests perfect score achievement and NFT minting process.

**Test Cases:**
- ✅ Grant mint eligibility for perfect score
- ✅ Show 25-minute expiration for guest users
- ✅ Show 1-hour expiration for connected users
- ✅ Initiate NFT minting process
- ✅ Poll mint status and show completion
- ✅ Prevent minting when no NFTs available
- ✅ Show expiration countdown

**Requirements Covered:**
- Requirement 10: Perfect Score Mint Eligibility
- Requirement 11: Guest Mint Eligibility Window
- Requirement 12: Mint Eligibility Caps
- Requirement 14: NFT Minting Process

### 4. Forging Tests (`forging.spec.ts`)

Tests NFT forging workflows for all forge types.

**Test Cases:**
- ✅ Display forge progress for Category Ultimate
- ✅ Enable forge button when requirements met
- ✅ Show confirmation dialog before forging
- ✅ Cancel forging when Cancel clicked
- ✅ Initiate Category Ultimate forging
- ✅ Poll forge status and show completion
- ✅ Display Master Ultimate forge progress
- ✅ Display Seasonal Ultimate forge progress
- ✅ Show grace period warning for seasonal forging
- ✅ Handle forge errors gracefully

**Requirements Covered:**
- Requirement 15: Category Ultimate Forging
- Requirement 16: Master Ultimate Forging
- Requirement 17: Seasonal Ultimate Forging
- Requirement 18: Forging Ownership Rules
- Requirement 35: Player Messaging - Forge Confirmation

### 5. Leaderboard Tests (`leaderboard.spec.ts`)

Tests leaderboard display and updates.

**Test Cases:**
- ✅ Display global leaderboard
- ✅ Highlight current player rank
- ✅ Display category leaderboard
- ✅ Update leaderboard after session completion
- ✅ Display tie-breaker information
- ✅ Support pagination
- ✅ Display season information
- ✅ Show empty state when no entries

**Requirements Covered:**
- Requirement 21: Season Points Calculation
- Requirement 22: Season Leaderboard Tie-Breakers
- Requirement 25: Global and Category Leaderboards
- Requirement 26: Seasonal Leaderboard Reset

### 6. Session Timeout Tests (`session-timeout.spec.ts`)

Tests timer enforcement and timeout handling.

**Test Cases:**
- ✅ Display countdown timer for each question
- ✅ Countdown from 10 to 0
- ✅ Mark answer as incorrect when timer expires
- ✅ Auto-advance to next question after timeout
- ✅ Disable answer options after timeout
- ✅ Show correct answer after timeout
- ✅ Prevent pausing during active session
- ✅ Continue timer after page refresh
- ✅ Handle multiple timeouts in a session

**Requirements Covered:**
- Requirement 1: Session Management (timer enforcement)
- Requirement 33: Player Messaging - Timeout

### 7. Daily Limits Tests (`daily-limits.spec.ts`)

Tests daily session limits and cooldown enforcement.

**Test Cases:**
- ✅ Display guest daily limit (5 sessions)
- ✅ Display connected user daily limit (10 sessions)
- ✅ Decrement remaining plays after session
- ✅ Prevent session start when limit reached
- ✅ Show reset countdown
- ✅ Enforce 60-second cooldown between sessions
- ✅ Display cooldown countdown
- ✅ Enable session start after cooldown expires
- ✅ Not apply cooldown to first session of the day
- ✅ Reset limits at midnight ET
- ✅ Track guest sessions by anonymous ID

**Requirements Covered:**
- Requirement 3: Daily Session Limits
- Requirement 4: Session Cooldown

## Test Fixtures

### Auth Fixtures (`fixtures/auth.ts`)

Provides utilities for authentication testing:

- **mockWallet**: Injects a mock CIP-30 wallet (Lace) for testing
- **createTestProfile**: Creates a test user profile with username
- **getGuestId**: Retrieves guest anonymous ID from localStorage

## Test Helpers (`utils/test-helpers.ts`)

Utility functions for common test operations:

- `waitForElement`: Wait for element to be visible
- `waitForText`: Wait for text to appear
- `clickButton`: Click button by text content
- `fillField`: Fill form field by label/placeholder
- `waitForApiResponse`: Wait for API response
- `mockApiResponse`: Mock API responses
- `getLocalStorage` / `setLocalStorage`: Manage localStorage
- `waitForTimer`: Wait for countdown timer
- `isVisible`: Check element visibility
- `takeScreenshot`: Capture screenshot
- `verifyToast`: Verify notification messages
- `waitForLoadingComplete`: Wait for loading indicators

## Test Environment

### Environment Variables (`.env.test`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_MOCK_BLOCKCHAIN=true
```

### Mock Data Strategy

Tests use API mocking to:
- Avoid dependency on backend services
- Control test scenarios precisely
- Speed up test execution
- Test error conditions

## Coverage Summary

### Requirements Coverage

| Requirement | Description | Test File(s) |
|------------|-------------|--------------|
| 1 | Session Management | guest-session, session-timeout |
| 2 | Session Concurrency Control | guest-session |
| 3 | Daily Session Limits | guest-session, daily-limits |
| 4 | Session Cooldown | daily-limits |
| 5 | First-Time Wallet Connection | wallet-connection |
| 10 | Perfect Score Mint Eligibility | perfect-score |
| 11 | Guest Mint Eligibility Window | perfect-score |
| 12 | Mint Eligibility Caps | perfect-score |
| 14 | NFT Minting Process | perfect-score |
| 15 | Category Ultimate Forging | forging |
| 16 | Master Ultimate Forging | forging |
| 17 | Seasonal Ultimate Forging | forging |
| 18 | Forging Ownership Rules | forging |
| 21 | Season Points Calculation | leaderboard |
| 22 | Season Leaderboard Tie-Breakers | leaderboard |
| 25 | Global and Category Leaderboards | leaderboard |
| 26 | Seasonal Leaderboard Reset | leaderboard |
| 33 | Player Messaging - Timeout | session-timeout |
| 35 | Player Messaging - Forge Confirmation | forging |
| 42 | Wallet Connection (Web) | wallet-connection |
| 45 | Security - Authentication | wallet-connection |
| 46 | Observability - Logging | All tests |

### Test Statistics

- **Total Test Files**: 7
- **Total Test Cases**: 60+
- **Requirements Covered**: 20+
- **Test Execution Time**: ~5-10 minutes (full suite)

## Best Practices

### 1. Use Data Test IDs

Add `data-testid` attributes to components for reliable selectors:

```tsx
<div data-testid="question-card">
  <Timer data-testid="timer" />
  <button data-testid="answer-option">Option A</button>
</div>
```

### 2. Mock External Services

Always mock API calls and blockchain interactions:

```typescript
await mockApiResponse(page, /\/api\/sessions\/start/, {
  id: 'session-1',
  // ... response data
});
```

### 3. Wait for Elements

Always wait for elements before interacting:

```typescript
await waitForElement(page, '[data-testid="question-card"]');
await clickButton(page, 'Submit');
```

### 4. Clean Up After Tests

Use `beforeEach` to reset state:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/gameplay-demo');
  await waitForLoadingComplete(page);
});
```

### 5. Handle Async Operations

Use appropriate timeouts for async operations:

```typescript
await page.waitForTimeout(2500); // Wait for feedback
await waitForText(page, 'Success', 10000); // 10s timeout
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run E2E Tests
  run: |
    cd apps/web
    pnpm test:e2e
```

### Test Reports

- HTML report generated in `playwright-report/`
- Screenshots captured on failure
- Videos recorded for failed tests
- Traces available for debugging

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in `playwright.config.ts`
   - Check dev server is running
   - Verify API mocks are configured

2. **Flaky tests**
   - Add explicit waits for dynamic content
   - Use `waitForLoadingComplete` helper
   - Check for race conditions

3. **Browser not launching**
   - Run `pnpm exec playwright install chromium`
   - Check system dependencies

### Debug Mode

Run tests in debug mode to step through:

```bash
pnpm test:e2e:debug
```

## Future Enhancements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Performance Testing**: Measure page load and interaction times
3. **Accessibility Testing**: Add a11y checks with axe-core
4. **Mobile Testing**: Add tests for mobile viewport
5. **Cross-Browser Testing**: Add Firefox and WebKit
6. **API Contract Testing**: Validate API responses match schema

## Conclusion

The E2E test suite provides comprehensive coverage of critical user flows and requirements. Tests are maintainable, reliable, and provide confidence in the application's functionality before deployment.
