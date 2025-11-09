import { test, expect } from './fixtures/auth';
import {
  waitForElement,
  clickButton,
  waitForText,
  mockApiResponse,
  waitForLoadingComplete,
} from './utils/test-helpers';

/**
 * E2E Test: NFT Forging
 * 
 * Tests Requirements:
 * - Requirement 15: Category Ultimate Forging
 * - Requirement 16: Master Ultimate Forging
 * - Requirement 17: Seasonal Ultimate Forging
 * - Requirement 18: Forging Ownership Rules
 * - Requirement 35: Player Messaging - Forge Confirmation
 */

test.describe('NFT Forging', () => {
  test.beforeEach(async ({ page, mockWallet }) => {
    // Setup connected user
    await mockWallet(page);
    await page.goto('/auth-demo');
    
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-forge',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'ForgePlayer',
        isNewUser: false,
      },
    });
    
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    await page.goto('/forge-demo');
    await waitForLoadingComplete(page);
  });

  test('should display forge progress for Category Ultimate', async ({ page }) => {
    // Mock forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'science',
          categoryName: 'Science',
          required: 10,
          current: 7,
          canForge: false,
          nfts: Array.from({ length: 7 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Science NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify progress display
    await waitForText(page, 'Science');
    await waitForText(page, '7 / 10');
    
    // Verify progress bar
    await waitForElement(page, '[data-testid="forge-progress-bar"]');
    
    // Verify forge button is disabled
    const forgeButton = page.locator('button:has-text("Forge Ultimate")');
    await expect(forgeButton).toBeDisabled();
  });

  test('should enable forge button when requirements met', async ({ page }) => {
    // Mock forge progress with complete requirements
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'history',
          categoryName: 'History',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `History NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify progress complete
    await waitForText(page, '10 / 10');
    
    // Verify forge button is enabled
    const forgeButton = page.locator('button:has-text("Forge Ultimate")');
    await expect(forgeButton).toBeEnabled();
  });

  test('should show confirmation dialog before forging', async ({ page }) => {
    // Mock complete forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'science',
          categoryName: 'Science',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Science NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Click forge button
    await clickButton(page, 'Forge Ultimate');
    
    // Verify confirmation dialog
    await waitForText(page, 'Forging will consume your NFTs permanently');
    await waitForText(page, 'Proceed?');
    
    // Verify NFT list in dialog
    await waitForText(page, 'Science NFT #1');
    await waitForText(page, 'Science NFT #10');
    
    // Verify Cancel and Confirm buttons
    await waitForElement(page, 'button:has-text("Cancel")');
    await waitForElement(page, 'button:has-text("Confirm")');
  });

  test('should cancel forging when Cancel clicked', async ({ page }) => {
    // Mock forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'geography',
          categoryName: 'Geography',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Geography NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Click forge button
    await clickButton(page, 'Forge Ultimate');
    
    // Wait for dialog
    await waitForText(page, 'Forging will consume');
    
    // Click Cancel
    await clickButton(page, 'Cancel');
    
    // Verify dialog closed
    await page.waitForTimeout(500);
    const dialog = page.locator('text=Forging will consume');
    await expect(dialog).not.toBeVisible();
  });

  test('should initiate Category Ultimate forging', async ({ page }) => {
    // Mock forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'sports',
          categoryName: 'Sports',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Sports NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock forge initiation
    await mockApiResponse(page, /\/api\/forge\/category/, {
      forgeId: 'forge-op-1',
      status: 'pending',
      message: 'Forging in progress...',
    });
    
    // Start forging
    await clickButton(page, 'Forge Ultimate');
    await clickButton(page, 'Confirm');
    
    // Verify forging started
    await waitForText(page, 'Forging in progress');
  });

  test('should poll forge status and show completion', async ({ page }) => {
    // Mock forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'arts',
          categoryName: 'Arts',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Arts NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock forge initiation
    await mockApiResponse(page, /\/api\/forge\/category/, {
      forgeId: 'forge-op-2',
      status: 'pending',
    });
    
    // Mock forge status polling
    let statusCallCount = 0;
    await page.route(/\/api\/forge\/forge-op-2\/status/, (route) => {
      statusCallCount++;
      if (statusCallCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'burning',
            message: 'Burning input NFTs...',
            burnTxHash: 'burn_tx_123',
          }),
        });
      } else if (statusCallCount === 2) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'minting',
            message: 'Minting Ultimate NFT...',
            burnTxHash: 'burn_tx_123',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'confirmed',
            message: 'Forge complete!',
            burnTxHash: 'burn_tx_123',
            mintTxHash: 'mint_tx_456',
            ultimateNft: {
              id: 'ultimate-1',
              name: 'Arts Ultimate Trivia NFT',
              image: 'ipfs://QmUltimate',
              policyId: 'policy_ultimate',
              assetFingerprint: 'asset_ultimate',
            },
          }),
        });
      }
    });
    
    // Start forging
    await clickButton(page, 'Forge Ultimate');
    await clickButton(page, 'Confirm');
    
    // Verify status updates
    await waitForText(page, 'Burning input NFTs');
    await waitForText(page, 'Minting Ultimate NFT');
    await waitForText(page, 'Forge complete', 20000);
    
    // Verify Ultimate NFT displayed
    await waitForText(page, 'Arts Ultimate Trivia NFT');
    
    // Verify transaction hashes
    await waitForElement(page, 'a[href*="burn_tx_123"]');
    await waitForElement(page, 'a[href*="mint_tx_456"]');
  });

  test('should display Master Ultimate forge progress', async ({ page }) => {
    // Mock forge progress with multiple categories
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'master',
          required: 10,
          current: 8,
          canForge: false,
          categories: [
            { id: 'science', name: 'Science', hasNft: true },
            { id: 'history', name: 'History', hasNft: true },
            { id: 'geography', name: 'Geography', hasNft: true },
            { id: 'sports', name: 'Sports', hasNft: true },
            { id: 'arts', name: 'Arts', hasNft: true },
            { id: 'entertainment', name: 'Entertainment', hasNft: true },
            { id: 'technology', name: 'Technology', hasNft: true },
            { id: 'literature', name: 'Literature', hasNft: true },
            { id: 'general', name: 'General', hasNft: false },
          ],
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify Master forge progress
    await waitForText(page, 'Master Ultimate');
    await waitForText(page, '8 / 10 categories');
    
    // Verify category checkmarks
    await waitForText(page, 'Science ✓');
    await waitForText(page, 'History ✓');
  });

  test('should display Seasonal Ultimate forge progress', async ({ page }) => {
    // Mock seasonal forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'season',
          seasonId: 'winter-s1',
          seasonName: 'Winter Season 1',
          required: 2,
          current: 1,
          canForge: false,
          categories: [
            { id: 'science', name: 'Science', nftCount: 2 },
            { id: 'history', name: 'History', nftCount: 1 },
            { id: 'geography', name: 'Geography', nftCount: 0 },
          ],
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify Seasonal forge progress
    await waitForText(page, 'Seasonal Ultimate');
    await waitForText(page, 'Winter Season 1');
    
    // Verify category progress
    await waitForText(page, 'Science: 2/2 ✓');
    await waitForText(page, 'History: 1/2');
    await waitForText(page, 'Geography: 0/2');
  });

  test('should show grace period warning for seasonal forging', async ({ page }) => {
    // Mock seasonal forge with grace period
    const gracePeriodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'season',
          seasonId: 'winter-s1',
          seasonName: 'Winter Season 1',
          required: 2,
          current: 3,
          canForge: true,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          categories: [
            { id: 'science', name: 'Science', nftCount: 2 },
            { id: 'history', name: 'History', nftCount: 2 },
            { id: 'geography', name: 'Geography', nftCount: 2 },
          ],
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify grace period warning
    await waitForText(page, 'grace period');
    await waitForText(page, '2 days');
  });

  test('should handle forge errors gracefully', async ({ page }) => {
    // Mock forge progress
    await mockApiResponse(page, /\/api\/forge\/progress/, {
      progress: [
        {
          type: 'category',
          categoryId: 'technology',
          categoryName: 'Technology',
          required: 10,
          current: 10,
          canForge: true,
          nfts: Array.from({ length: 10 }, (_, i) => ({
            id: `nft-${i}`,
            name: `Technology NFT #${i + 1}`,
            assetFingerprint: `asset${i}`,
          })),
        },
      ],
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock forge failure
    await mockApiResponse(page, /\/api\/forge\/category/, {
      error: 'Ownership verification failed',
      code: 'OWNERSHIP_VERIFICATION_FAILED',
    }, 400);
    
    // Try to forge
    await clickButton(page, 'Forge Ultimate');
    await clickButton(page, 'Confirm');
    
    // Verify error message
    await waitForText(page, 'Ownership verification failed');
  });
});
