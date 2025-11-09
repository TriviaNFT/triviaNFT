import { test, expect } from './fixtures/auth';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  waitForLoadingComplete,
} from './utils/test-helpers';

/**
 * E2E Test: Leaderboard Updates
 * 
 * Tests Requirements:
 * - Requirement 21: Season Points Calculation
 * - Requirement 22: Season Leaderboard Tie-Breakers
 * - Requirement 25: Global and Category Leaderboards
 * - Requirement 26: Seasonal Leaderboard Reset
 */

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page, mockWallet }) => {
    // Setup connected user
    await mockWallet(page);
    await page.goto('/auth-demo');
    
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-leaderboard',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'LeaderboardPlayer',
        isNewUser: false,
      },
    });
    
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    await page.goto('/leaderboard-demo');
    await waitForLoadingComplete(page);
  });

  test('should display global leaderboard', async ({ page }) => {
    // Mock global leaderboard
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      entries: [
        {
          rank: 1,
          username: 'TopPlayer',
          points: 150,
          nftsMinted: 15,
          perfectScores: 15,
          avgAnswerTime: 5.2,
        },
        {
          rank: 2,
          username: 'SecondPlace',
          points: 140,
          nftsMinted: 14,
          perfectScores: 14,
          avgAnswerTime: 5.5,
        },
        {
          rank: 3,
          username: 'ThirdPlace',
          points: 130,
          nftsMinted: 13,
          perfectScores: 13,
          avgAnswerTime: 6.0,
        },
      ],
      total: 100,
      hasMore: true,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify leaderboard entries
    await waitForText(page, 'TopPlayer');
    await waitForText(page, '150');
    await waitForText(page, 'SecondPlace');
    await waitForText(page, 'ThirdPlace');
    
    // Verify rank display
    await waitForText(page, '#1');
    await waitForText(page, '#2');
    await waitForText(page, '#3');
  });

  test('should highlight current player rank', async ({ page }) => {
    // Mock leaderboard with current player
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      entries: [
        {
          rank: 1,
          username: 'TopPlayer',
          points: 150,
          nftsMinted: 15,
          perfectScores: 15,
          avgAnswerTime: 5.2,
        },
        {
          rank: 2,
          username: 'LeaderboardPlayer',
          points: 140,
          nftsMinted: 14,
          perfectScores: 14,
          avgAnswerTime: 5.5,
          isCurrentPlayer: true,
        },
        {
          rank: 3,
          username: 'ThirdPlace',
          points: 130,
          nftsMinted: 13,
          perfectScores: 13,
          avgAnswerTime: 6.0,
        },
      ],
      total: 100,
      hasMore: true,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify current player is highlighted
    const currentPlayerRow = page.locator('[data-testid="leaderboard-entry-current"]');
    await expect(currentPlayerRow).toBeVisible();
    await expect(currentPlayerRow).toContainText('LeaderboardPlayer');
  });

  test('should display category leaderboard', async ({ page }) => {
    // Mock category leaderboard
    await mockApiResponse(page, /\/api\/leaderboard\/category\/science/, {
      entries: [
        {
          rank: 1,
          username: 'ScienceExpert',
          points: 50,
          nftsMinted: 5,
          perfectScores: 5,
          avgAnswerTime: 4.8,
        },
        {
          rank: 2,
          username: 'ScienceFan',
          points: 40,
          nftsMinted: 4,
          perfectScores: 4,
          avgAnswerTime: 5.2,
        },
      ],
      total: 50,
      hasMore: true,
    });
    
    // Navigate to category leaderboard
    await clickButton(page, 'Science');
    await waitForLoadingComplete(page);
    
    // Verify category leaderboard
    await waitForText(page, 'Science Leaderboard');
    await waitForText(page, 'ScienceExpert');
    await waitForText(page, 'ScienceFan');
  });

  test('should update leaderboard after session completion', async ({ page }) => {
    // Navigate to gameplay
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
    
    // Mock session with points
    await mockApiResponse(page, /\/api\/sessions\/start/, {
      id: 'leaderboard-session-1',
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

    // Mock all correct answers
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

    // Mock session completion with points
    await mockApiResponse(page, /\/api\/sessions\/.*\/complete/, {
      id: 'leaderboard-session-1',
      score: 10,
      totalQuestions: 10,
      status: 'won',
      isPerfect: true,
      pointsEarned: 20, // 10 correct + 10 bonus
      newTotalPoints: 160,
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
    
    // Verify points earned message
    await waitForText(page, '20 points');
    
    // Navigate to leaderboard
    await page.goto('/leaderboard-demo');
    await waitForLoadingComplete(page);
    
    // Mock updated leaderboard
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      entries: [
        {
          rank: 1,
          username: 'LeaderboardPlayer',
          points: 160,
          nftsMinted: 15,
          perfectScores: 15,
          avgAnswerTime: 5.2,
          isCurrentPlayer: true,
        },
        {
          rank: 2,
          username: 'SecondPlace',
          points: 150,
          nftsMinted: 15,
          perfectScores: 15,
          avgAnswerTime: 5.5,
        },
      ],
      total: 100,
      hasMore: true,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify updated rank
    await waitForText(page, '#1');
    await waitForText(page, 'LeaderboardPlayer');
    await waitForText(page, '160');
  });

  test('should display tie-breaker information', async ({ page }) => {
    // Mock leaderboard with tied players
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      entries: [
        {
          rank: 1,
          username: 'Player1',
          points: 100,
          nftsMinted: 10,
          perfectScores: 10,
          avgAnswerTime: 5.0,
        },
        {
          rank: 2,
          username: 'Player2',
          points: 100,
          nftsMinted: 9,
          perfectScores: 10,
          avgAnswerTime: 5.0,
        },
      ],
      total: 50,
      hasMore: false,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify both players have same points
    const player1Points = page.locator('[data-testid="leaderboard-entry"]:has-text("Player1")');
    await expect(player1Points).toContainText('100');
    
    const player2Points = page.locator('[data-testid="leaderboard-entry"]:has-text("Player2")');
    await expect(player2Points).toContainText('100');
    
    // Verify Player1 ranks higher due to more NFTs minted
    await expect(player1Points).toContainText('#1');
    await expect(player2Points).toContainText('#2');
  });

  test('should support pagination', async ({ page }) => {
    // Mock first page
    await mockApiResponse(page, /\/api\/leaderboard\/global\?.*offset=0/, {
      entries: Array.from({ length: 20 }, (_, i) => ({
        rank: i + 1,
        username: `Player${i + 1}`,
        points: 100 - i,
        nftsMinted: 10,
        perfectScores: 10,
        avgAnswerTime: 5.0,
      })),
      total: 100,
      hasMore: true,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify first page entries
    await waitForText(page, 'Player1');
    await waitForText(page, 'Player20');
    
    // Mock second page
    await mockApiResponse(page, /\/api\/leaderboard\/global\?.*offset=20/, {
      entries: Array.from({ length: 20 }, (_, i) => ({
        rank: i + 21,
        username: `Player${i + 21}`,
        points: 80 - i,
        nftsMinted: 8,
        perfectScores: 8,
        avgAnswerTime: 5.5,
      })),
      total: 100,
      hasMore: true,
    });
    
    // Click next page
    await clickButton(page, 'Next');
    await waitForLoadingComplete(page);
    
    // Verify second page entries
    await waitForText(page, 'Player21');
    await waitForText(page, 'Player40');
  });

  test('should display season information', async ({ page }) => {
    // Mock leaderboard with season info
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      season: {
        id: 'winter-s1',
        name: 'Winter Season 1',
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      entries: [
        {
          rank: 1,
          username: 'TopPlayer',
          points: 150,
          nftsMinted: 15,
          perfectScores: 15,
          avgAnswerTime: 5.2,
        },
      ],
      total: 100,
      hasMore: true,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify season display
    await waitForText(page, 'Winter Season 1');
    await waitForText(page, 'Season ends in');
    await waitForText(page, '30 days');
  });

  test('should show empty state when no entries', async ({ page }) => {
    // Mock empty leaderboard
    await mockApiResponse(page, /\/api\/leaderboard\/global/, {
      entries: [],
      total: 0,
      hasMore: false,
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify empty state
    await waitForText(page, 'No players yet');
    await waitForText(page, 'Be the first');
  });
});
