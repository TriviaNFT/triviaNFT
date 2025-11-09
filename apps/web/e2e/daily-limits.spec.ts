import { test, expect } from './fixtures/auth';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  waitForLoadingComplete,
  getLocalStorage,
  setLocalStorage,
} from './utils/test-helpers';

/**
 * E2E Test: Daily Session Limits
 * 
 * Tests Requirements:
 * - Requirement 3: Daily Session Limits
 * - Requirement 4: Session Cooldown
 */

test.describe('Daily Session Limits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
  });

  test('should display guest daily limit (5 sessions)', async ({ page }) => {
    // Mock guest limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 0,
      remaining: 5,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify limit display
    await waitForText(page, '5 plays remaining');
    await waitForText(page, 'Resets in');
    await waitForText(page, '12 hours');
  });

  test('should display connected user daily limit (10 sessions)', async ({ page, mockWallet }) => {
    // Connect wallet
    await mockWallet(page);
    await page.goto('/auth-demo');
    
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-limits',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'LimitPlayer',
        isNewUser: false,
      },
    });
    
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Go to gameplay
    await page.goto('/gameplay-demo');
    
    // Mock connected user limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 10,
      sessionsUsed: 0,
      remaining: 10,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify increased limit
    await waitForText(page, '10 plays remaining');
  });

  test('should decrement remaining plays after session', async ({ page }) => {
    // Mock initial limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 2,
      remaining: 3,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify initial remaining
    await waitForText(page, '3 plays remaining');
    
    // Mock session
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'limit-session-1',
      categoryId: 'science',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        servedAt: new Date().toISOString(),
      })),
      score: 0,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    await page.route(/\/api\/sessions\/.*\/answer/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          correct: true,
          correctIndex: 0,
          explanation: 'Correct!',
          score: 10,
        }),
      });
    });

    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'limit-session-1',
      score: 7,
      totalQuestions: 10,
      status: 'won',
      isPerfect: false,
      endedAt: new Date().toISOString(),
    });

    // Complete a session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500);
    }
    
    // Go back to categories
    await clickButton(page, 'Back to Categories');
    
    // Mock updated limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 3,
      remaining: 2,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify decremented remaining
    await waitForText(page, '2 plays remaining');
  });

  test('should prevent session start when limit reached', async ({ page }) => {
    // Mock limit reached
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 5,
      remaining: 0,
      resetAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify limit reached message
    await waitForText(page, '0 plays remaining');
    await waitForText(page, 'limit has been reached');
    
    // Verify category buttons are disabled
    const categoryButton = page.locator('button:has-text("Science")');
    await expect(categoryButton).toBeDisabled();
  });

  test('should show reset countdown', async ({ page }) => {
    // Mock limit with reset time
    const resetAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 4,
      remaining: 1,
      resetAt: resetAt.toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify countdown display
    await waitForText(page, 'Resets in');
    await waitForText(page, '2 hours');
  });

  test('should enforce 60-second cooldown between sessions', async ({ page }) => {
    // Mock session completion
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'cooldown-session-1',
      categoryId: 'history',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        servedAt: new Date().toISOString(),
      })),
      score: 0,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    await page.route(/\/api\/sessions\/.*\/answer/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          correct: true,
          correctIndex: 0,
          explanation: 'Correct!',
          score: 10,
        }),
      });
    });

    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'cooldown-session-1',
      score: 10,
      totalQuestions: 10,
      status: 'won',
      isPerfect: true,
      endedAt: new Date().toISOString(),
    });

    // Complete a session
    await clickButton(page, 'History');
    await waitForElement(page, '[data-testid="question-card"]');
    
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500);
    }
    
    // Go back to categories
    await clickButton(page, 'Back to Categories');
    
    // Mock cooldown response
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      error: 'Cooldown active',
      code: 'COOLDOWN_ACTIVE',
      remainingSeconds: 60,
    }, 429);
    
    // Try to start another session immediately
    await clickButton(page, 'History');
    
    // Verify cooldown message
    await waitForText(page, 'cooldown');
    await waitForText(page, '60 seconds');
  });

  test('should display cooldown countdown', async ({ page }) => {
    // Mock cooldown state
    await mockApiResponse(page, /\/api\/sessions\/cooldown/, {
      active: true,
      remainingSeconds: 45,
      endsAt: new Date(Date.now() + 45000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify cooldown display
    await waitForText(page, 'cooldown');
    await waitForText(page, '45');
    
    // Wait and verify countdown decreases
    await page.waitForTimeout(2000);
    await waitForText(page, '43');
  });

  test('should enable session start after cooldown expires', async ({ page }) => {
    // Mock cooldown state with short duration
    await mockApiResponse(page, /\/api\/sessions\/cooldown/, {
      active: true,
      remainingSeconds: 3,
      endsAt: new Date(Date.now() + 3000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify cooldown active
    await waitForText(page, 'cooldown');
    
    // Verify buttons disabled
    const categoryButton = page.locator('button:has-text("Science")');
    await expect(categoryButton).toBeDisabled();
    
    // Wait for cooldown to expire
    await page.waitForTimeout(4000);
    
    // Mock cooldown expired
    await mockApiResponse(page, /\/api\/sessions\/cooldown/, {
      active: false,
      remainingSeconds: 0,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify buttons enabled
    await expect(categoryButton).toBeEnabled();
  });

  test('should not apply cooldown to first session of the day', async ({ page }) => {
    // Mock no cooldown for first session
    await mockApiResponse(page, /\/api\/sessions\/cooldown/, {
      active: false,
      remainingSeconds: 0,
    });
    
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 0,
      remaining: 5,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify no cooldown message
    const cooldownText = page.locator('text=/cooldown/i');
    await expect(cooldownText).not.toBeVisible();
    
    // Verify can start session
    const categoryButton = page.locator('button:has-text("Science")');
    await expect(categoryButton).toBeEnabled();
  });

  test('should reset limits at midnight ET', async ({ page }) => {
    // Mock limit reached
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 5,
      remaining: 0,
      resetAt: new Date(Date.now() + 100).toISOString(), // Resets in 100ms
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify limit reached
    await waitForText(page, '0 plays remaining');
    
    // Wait for reset time
    await page.waitForTimeout(200);
    
    // Mock reset limits
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 0,
      remaining: 5,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify limits reset
    await waitForText(page, '5 plays remaining');
  });

  test('should track guest sessions by anonymous ID', async ({ page }) => {
    // Get anonymous ID
    const anonId = await getLocalStorage(page, 'trivia_anon_id');
    expect(anonId).toBeTruthy();
    
    // Mock limit for this anonymous ID
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 2,
      remaining: 3,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify limit display
    await waitForText(page, '3 plays remaining');
    
    // Clear anonymous ID and reload
    await page.evaluate(() => localStorage.removeItem('trivia_anon_id'));
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock fresh limit for new anonymous ID
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 0,
      remaining: 5,
      resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify new limit
    await waitForText(page, '5 plays remaining');
  });
});
