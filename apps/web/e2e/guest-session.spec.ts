import { test, expect } from '@playwright/test';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  getLocalStorage,
  waitForLoadingComplete,
} from './utils/test-helpers';

/**
 * E2E Test: Guest User Session Flow
 * 
 * Tests Requirements:
 * - Requirement 1: Session Management
 * - Requirement 2: Session Concurrency Control
 * - Requirement 3: Daily Session Limits (guest = 5 sessions)
 */

test.describe('Guest User Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to gameplay demo
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
  });

  test('should generate anonymous ID for guest user', async ({ page }) => {
    // Check that anonymous ID is created in localStorage
    const anonId = await getLocalStorage(page, 'trivia_anon_id');
    
    expect(anonId).toBeTruthy();
    expect(anonId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  test('should display category selection', async ({ page }) => {
    // Wait for categories to load
    await waitForText(page, 'Science');
    await waitForText(page, 'History');
    
    // Verify category cards are visible
    const categoryCards = page.locator('[data-testid="category-card"]');
    const count = await categoryCards.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should start a session and display questions', async ({ page }) => {
    // Mock API responses
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'test-session-1',
      categoryId: 'science',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Test question ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        servedAt: new Date().toISOString(),
      })),
      score: 0,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    // Select a category
    await clickButton(page, 'Science');
    
    // Wait for session to start
    await waitForText(page, '10 questions');
    await waitForText(page, '10s each');
    
    // Verify question is displayed
    await waitForElement(page, '[data-testid="question-card"]');
    await waitForText(page, 'Test question 1?');
    
    // Verify timer is running
    await waitForElement(page, '[data-testid="timer"]');
    
    // Verify options are displayed
    const options = page.locator('[data-testid="answer-option"]');
    const optionCount = await options.count();
    expect(optionCount).toBe(4);
  });

  test('should submit answer and advance to next question', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'test-session-2',
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

    // Mock answer submission
    await mockApiResponse(page, /\/api\/sessions\/.*\/answer/, {
      correct: true,
      correctIndex: 0,
      explanation: 'Correct! This is the right answer.',
      score: 1,
    });

    // Start session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Click first option
    const firstOption = page.locator('[data-testid="answer-option"]').first();
    await firstOption.click();
    
    // Verify feedback is shown
    await waitForText(page, 'Correct!');
    
    // Wait for auto-advance
    await page.waitForTimeout(2500);
    
    // Verify progress indicator updated
    await waitForText(page, 'Question 2 of 10');
  });

  test('should complete session and show results', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'test-session-3',
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

    // Mock answer submissions (7 correct, 3 incorrect)
    let answerCount = 0;
    await page.route(/\/api\/sessions\/.*\/answer/, (route) => {
      answerCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          correct: answerCount <= 7,
          correctIndex: 0,
          explanation: answerCount <= 7 ? 'Correct!' : 'Incorrect.',
          score: Math.min(answerCount, 7),
        }),
      });
    });

    // Mock session completion
    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'test-session-3',
      score: 7,
      totalQuestions: 10,
      status: 'won',
      isPerfect: false,
      endedAt: new Date().toISOString(),
    });

    // Start session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Answer all 10 questions quickly
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500); // Wait for feedback and advance
    }
    
    // Verify results screen
    await waitForText(page, 'Session Complete');
    await waitForText(page, '7 / 10');
    
    // Verify no mint eligibility (not perfect)
    const mintButton = page.locator('button:has-text("Mint Now")');
    await expect(mintButton).not.toBeVisible();
    
    // Verify play again button
    await waitForElement(page, 'button:has-text("Play Again")');
  });

  test('should prevent multiple concurrent sessions', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'test-session-4',
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

    // Start first session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Try to navigate back and start another session
    await page.goBack();
    
    // Should show active session guard
    await waitForText(page, 'active session');
    
    // Verify cannot start new session
    const categoryButtons = page.locator('button:has-text("Science")');
    await expect(categoryButtons.first()).toBeDisabled();
  });

  test('should show guest session limit (5 sessions)', async ({ page }) => {
    // Mock daily limit check
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 3,
      remaining: 2,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    });

    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
    
    // Verify limit display
    await waitForText(page, '2 plays remaining');
    await waitForText(page, 'Resets in');
  });
});
