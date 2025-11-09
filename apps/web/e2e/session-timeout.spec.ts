import { test, expect } from '@playwright/test';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  waitForLoadingComplete,
  waitForTimer,
} from './utils/test-helpers';

/**
 * E2E Test: Session Timeout Handling
 * 
 * Tests Requirements:
 * - Requirement 1: Session Management (timer enforcement)
 * - Requirement 33: Player Messaging - Timeout
 */

test.describe('Session Timeout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
  });

  test('should display countdown timer for each question', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-1',
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

    // Start session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Verify timer is displayed
    const timer = await waitForElement(page, '[data-testid="timer"]');
    await expect(timer).toBeVisible();
    
    // Verify timer shows 10 seconds initially
    await waitForText(page, '10');
  });

  test('should countdown from 10 to 0', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-2',
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

    // Start session
    await clickButton(page, 'History');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Wait and verify countdown
    await waitForText(page, '10');
    await page.waitForTimeout(1000);
    await waitForText(page, '9');
    await page.waitForTimeout(1000);
    await waitForText(page, '8');
  });

  test('should mark answer as incorrect when timer expires', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-3',
      categoryId: 'geography',
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

    // Mock timeout answer submission
    await mockApiResponse(page, /\/api\/sessions\/.*\/answer/, {
      correct: false,
      correctIndex: 0,
      explanation: 'Time expired.',
      score: 0,
    });

    // Start session
    await clickButton(page, 'Geography');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Wait for timer to expire (don't answer)
    await page.waitForTimeout(11000);
    
    // Verify timeout message
    await waitForText(page, "Time's up!");
    await waitForText(page, 'counts as incorrect');
  });

  test('should auto-advance to next question after timeout', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-4',
      categoryId: 'sports',
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

    // Mock timeout answer
    await mockApiResponse(page, /\/api\/sessions\/.*\/answer/, {
      correct: false,
      correctIndex: 0,
      explanation: 'Time expired.',
      score: 0,
    });

    // Start session
    await clickButton(page, 'Sports');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Verify on question 1
    await waitForText(page, 'Question 1 of 10');
    
    // Wait for timeout and auto-advance
    await page.waitForTimeout(13500); // 10s timer + 2s feedback + buffer
    
    // Verify advanced to question 2
    await waitForText(page, 'Question 2 of 10');
  });

  test('should disable answer options after timeout', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-5',
      categoryId: 'arts',
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

    // Mock timeout answer
    await mockApiResponse(page, /\/api\/sessions\/.*\/answer/, {
      correct: false,
      correctIndex: 0,
      explanation: 'Time expired.',
      score: 0,
    });

    // Start session
    await clickButton(page, 'Arts');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Wait for timeout
    await page.waitForTimeout(11000);
    
    // Verify options are disabled
    const options = page.locator('[data-testid="answer-option"]');
    const firstOption = options.first();
    await expect(firstOption).toBeDisabled();
  });

  test('should show correct answer after timeout', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-6',
      categoryId: 'entertainment',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Question ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        servedAt: new Date().toISOString(),
      })),
      score: 0,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    // Mock timeout answer with correct answer
    await mockApiResponse(page, /\/api\/sessions\/.*\/answer/, {
      correct: false,
      correctIndex: 1,
      explanation: 'The correct answer was Option B.',
      score: 0,
    });

    // Start session
    await clickButton(page, 'Entertainment');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Wait for timeout
    await page.waitForTimeout(11000);
    
    // Verify correct answer is shown
    await waitForText(page, 'Option B');
    await waitForText(page, 'correct answer');
  });

  test('should prevent pausing during active session', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-7',
      categoryId: 'technology',
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

    // Start session
    await clickButton(page, 'Technology');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Verify no pause button exists
    const pauseButton = page.locator('button:has-text("Pause")');
    await expect(pauseButton).not.toBeVisible();
  });

  test('should continue timer after page refresh', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-8',
      categoryId: 'literature',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        servedAt: new Date(Date.now() - 5000).toISOString(), // Started 5 seconds ago
      })),
      score: 0,
      startedAt: new Date(Date.now() - 5000).toISOString(),
      status: 'active',
    });

    // Start session
    await clickButton(page, 'Literature');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Wait 2 seconds
    await page.waitForTimeout(2000);
    
    // Mock session recovery
    await mockApiResponse(page, /\/api\/sessions\/timeout-session-8/, {
      id: 'timeout-session-8',
      categoryId: 'literature',
      currentQuestionIndex: 0,
      questions: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i + 1}`,
        text: `Question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        servedAt: new Date(Date.now() - 7000).toISOString(), // Now 7 seconds ago
      })),
      score: 0,
      startedAt: new Date(Date.now() - 7000).toISOString(),
      status: 'active',
    });
    
    // Refresh page
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify timer continues from where it left off (should be around 3 seconds remaining)
    const timer = await waitForElement(page, '[data-testid="timer"]');
    const timerText = await timer.textContent();
    const remainingTime = parseInt(timerText || '0');
    
    // Should be less than 5 seconds remaining
    expect(remainingTime).toBeLessThan(5);
  });

  test('should handle multiple timeouts in a session', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'timeout-session-9',
      categoryId: 'general',
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

    // Mock timeout answers
    await page.route(/\/api\/sessions\/.*\/answer/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          correct: false,
          correctIndex: 0,
          explanation: 'Time expired.',
          score: 0,
        }),
      });
    });

    // Start session
    await clickButton(page, 'General');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Let first question timeout
    await page.waitForTimeout(13500);
    await waitForText(page, 'Question 2 of 10');
    
    // Let second question timeout
    await page.waitForTimeout(13500);
    await waitForText(page, 'Question 3 of 10');
    
    // Verify score is still 0
    const scoreDisplay = page.locator('[data-testid="score"]');
    await expect(scoreDisplay).toContainText('0');
  });
});
