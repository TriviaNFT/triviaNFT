import { test, expect } from './fixtures/auth';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  waitForLoadingComplete,
  verifyToast,
} from './utils/test-helpers';

/**
 * E2E Test: Perfect Score and NFT Minting
 * 
 * Tests Requirements:
 * - Requirement 10: Perfect Score Mint Eligibility
 * - Requirement 11: Guest Mint Eligibility Window
 * - Requirement 12: Mint Eligibility Caps
 * - Requirement 14: NFT Minting Process
 */

test.describe('Perfect Score and Minting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
  });

  test('should grant mint eligibility for perfect score', async ({ page }) => {
    // Mock session start
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'perfect-session-1',
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

    // Mock all answers as correct
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

    // Mock session completion with eligibility
    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'perfect-session-1',
      score: 10,
      totalQuestions: 10,
      status: 'won',
      isPerfect: true,
      eligibilityId: 'eligibility-1',
      endedAt: new Date().toISOString(),
    });

    // Start session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    // Answer all 10 questions correctly
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500);
    }
    
    // Verify perfect score message
    await waitForText(page, 'Flawless!');
    await waitForText(page, '10 / 10');
    
    // Verify mint eligibility notification
    await waitForText(page, 'unlocked a');
    await waitForText(page, 'mint');
    
    // Verify Mint Now button is visible
    await waitForElement(page, 'button:has-text("Mint Now")');
  });

  test('should show 25-minute expiration for guest users', async ({ page }) => {
    // Mock perfect score session
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'guest-perfect-1',
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

    const expiresAt = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes
    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'guest-perfect-1',
      score: 10,
      totalQuestions: 10,
      status: 'won',
      isPerfect: true,
      eligibilityId: 'eligibility-2',
      eligibilityExpiresAt: expiresAt.toISOString(),
      endedAt: new Date().toISOString(),
    });

    // Complete perfect session
    await clickButton(page, 'History');
    await waitForElement(page, '[data-testid="question-card"]');
    
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500);
    }
    
    // Verify 25-minute window message
    await waitForText(page, '25 minutes');
  });

  test('should show 1-hour expiration for connected users', async ({ page, mockWallet }) => {
    // Connect wallet first
    await mockWallet(page);
    await page.goto('/auth-demo');
    
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-1',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'ConnectedPlayer',
        isNewUser: false,
      },
    });
    
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Go to gameplay
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
    
    // Mock perfect score session
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'connected-perfect-1',
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

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'connected-perfect-1',
      score: 10,
      totalQuestions: 10,
      status: 'won',
      isPerfect: true,
      eligibilityId: 'eligibility-3',
      eligibilityExpiresAt: expiresAt.toISOString(),
      endedAt: new Date().toISOString(),
    });

    // Complete perfect session
    await clickButton(page, 'Science');
    await waitForElement(page, '[data-testid="question-card"]');
    
    for (let i = 0; i < 10; i++) {
      const firstOption = page.locator('[data-testid="answer-option"]').first();
      await firstOption.click();
      await page.waitForTimeout(2500);
    }
    
    // Verify 1-hour window message
    await waitForText(page, '1 hour');
  });

  test('should initiate NFT minting process', async ({ page, mockWallet }) => {
    // Setup connected user with eligibility
    await mockWallet(page);
    await page.goto('/mint-demo');
    await waitForLoadingComplete(page);
    
    // Mock eligibilities list
    await mockApiResponse(page, /\/api\/eligibilities/, {
      eligibilities: [
        {
          id: 'eligibility-4',
          categoryId: 'science',
          categoryName: 'Science',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'active',
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify eligibility is displayed
    await waitForText(page, 'Science');
    await waitForElement(page, '[data-testid="eligibility-card"]');
    
    // Mock mint initiation
    await mockApiResponse(page, /\/api\/mint\/eligibility-4/, {
      mintId: 'mint-op-1',
      status: 'pending',
      message: 'Minting in progress...',
    });
    
    // Click Mint Now
    await clickButton(page, 'Mint Now');
    
    // Verify minting started
    await waitForText(page, 'Minting in progress');
  });

  test('should poll mint status and show completion', async ({ page, mockWallet }) => {
    await mockWallet(page);
    await page.goto('/mint-demo');
    await waitForLoadingComplete(page);
    
    // Mock eligibility
    await mockApiResponse(page, /\/api\/eligibilities/, {
      eligibilities: [
        {
          id: 'eligibility-5',
          categoryId: 'history',
          categoryName: 'History',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'active',
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock mint initiation
    await mockApiResponse(page, /\/api\/mint\/eligibility-5/, {
      mintId: 'mint-op-2',
      status: 'pending',
    });
    
    // Mock mint status polling (first pending, then confirmed)
    let statusCallCount = 0;
    await page.route(/\/api\/mint\/mint-op-2\/status/, (route) => {
      statusCallCount++;
      if (statusCallCount < 3) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'pending',
            message: 'Uploading to IPFS...',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'confirmed',
            txHash: 'abc123def456',
            nft: {
              id: 'nft-1',
              name: 'History Trivia NFT #42',
              image: 'ipfs://QmTest123',
              policyId: 'policy123',
              assetFingerprint: 'asset1abc',
            },
          }),
        });
      }
    });
    
    // Start minting
    await clickButton(page, 'Mint Now');
    
    // Wait for status updates
    await waitForText(page, 'Uploading to IPFS');
    
    // Wait for completion
    await waitForText(page, 'confirmed', 15000);
    await waitForText(page, 'History Trivia NFT #42');
    
    // Verify transaction hash link
    await waitForElement(page, 'a[href*="abc123def456"]');
  });

  test('should prevent minting when no NFTs available', async ({ page }) => {
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
    
    // Mock category with no stock
    await mockApiResponse(page, /\/api\/categories/, {
      categories: [
        {
          id: 'science',
          name: 'Science',
          stockAvailable: 0,
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify out of stock message
    await waitForText(page, 'No NFTs are available');
    await waitForText(page, 'try again later');
    
    // Verify category button is disabled or shows warning
    const scienceButton = page.locator('button:has-text("Science")');
    const isDisabled = await scienceButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should show expiration countdown', async ({ page }) => {
    await page.goto('/mint-demo');
    await waitForLoadingComplete(page);
    
    // Mock eligibility with short expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await mockApiResponse(page, /\/api\/eligibilities/, {
      eligibilities: [
        {
          id: 'eligibility-6',
          categoryId: 'science',
          categoryName: 'Science',
          expiresAt: expiresAt.toISOString(),
          status: 'active',
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify countdown is displayed
    await waitForElement(page, '[data-testid="countdown"]');
    await waitForText(page, '4:');
    
    // Wait a bit and verify countdown decreases
    await page.waitForTimeout(2000);
    await waitForText(page, '4:5');
  });
});
