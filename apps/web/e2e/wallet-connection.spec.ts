import { test, expect } from './fixtures/auth';
import {
  waitForElement,
  clickButton,
  waitForText,
  fillField,
  mockApiResponse,
  getLocalStorage,
  waitForLoadingComplete,
} from './utils/test-helpers';

/**
 * E2E Test: Wallet Connection and Profile Creation
 * 
 * Tests Requirements:
 * - Requirement 5: First-Time Wallet Connection
 * - Requirement 42: Wallet Connection (Web)
 * - Requirement 45: Security - Authentication
 */

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth-demo');
    await waitForLoadingComplete(page);
  });

  test('should detect available wallets', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Click connect wallet button
    await clickButton(page, 'Connect Wallet');
    
    // Verify wallet options are displayed
    await waitForText(page, 'Lace');
    
    // Verify wallet icon is displayed
    const walletOption = page.locator('[data-testid="wallet-option-lace"]');
    await expect(walletOption).toBeVisible();
  });

  test('should connect wallet and retrieve stake key', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock API response for wallet connection
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-1',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: null,
        isNewUser: true,
      },
    });
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Wait for connection
    await page.waitForTimeout(1000);
    
    // Verify JWT token is stored
    const token = await getLocalStorage(page, 'trivia_auth_token');
    expect(token).toBe('mock_jwt_token');
    
    // Verify stake key is displayed
    await waitForText(page, 'stake_test1');
  });

  test('should prompt for profile creation on first connection', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock API response for new user
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-2',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: null,
        isNewUser: true,
      },
    });
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Wait for profile creation prompt
    await waitForText(page, 'Create Your Profile');
    await waitForElement(page, 'input[placeholder*="username" i]');
  });

  test('should create profile with username', async ({ page, mockWallet, createTestProfile }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock wallet connection
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-3',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: null,
        isNewUser: true,
      },
    });
    
    // Mock profile creation
    await mockApiResponse(page, /\/api\/auth\/profile/, {
      id: 'player-3',
      stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
      username: 'TestPlayer123',
      email: null,
      createdAt: new Date().toISOString(),
    });
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Create profile
    await createTestProfile(page, 'TestPlayer123');
    
    // Verify profile created
    await waitForText(page, 'TestPlayer123');
    await waitForText(page, 'Profile created successfully');
  });

  test('should validate username uniqueness', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock wallet connection
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-4',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: null,
        isNewUser: true,
      },
    });
    
    // Mock profile creation failure (username taken)
    await mockApiResponse(page, /\/api\/auth\/profile/, {
      error: 'Username already taken',
      code: 'USERNAME_TAKEN',
    }, 400);
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Try to create profile with taken username
    await fillField(page, 'username', 'TakenUsername');
    await clickButton(page, 'Create Profile');
    
    // Verify error message
    await waitForText(page, 'Username already taken');
  });

  test('should allow optional email input', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock wallet connection
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-5',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: null,
        isNewUser: true,
      },
    });
    
    // Mock profile creation with email
    await mockApiResponse(page, /\/api\/auth\/profile/, {
      id: 'player-5',
      stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
      username: 'TestPlayer456',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    });
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Fill profile form with email
    await fillField(page, 'username', 'TestPlayer456');
    await fillField(page, 'email', 'test@example.com');
    await clickButton(page, 'Create Profile');
    
    // Verify profile created
    await waitForText(page, 'TestPlayer456');
  });

  test('should increase daily limit after wallet connection', async ({ page, mockWallet }) => {
    // Start as guest
    await page.goto('/gameplay-demo');
    await waitForLoadingComplete(page);
    
    // Mock guest limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 5,
      sessionsUsed: 2,
      remaining: 3,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    });
    
    // Verify guest limit
    await waitForText(page, '3 plays remaining');
    
    // Navigate to auth and connect wallet
    await page.goto('/auth-demo');
    await mockWallet(page);
    await page.reload();
    
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-6',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'TestPlayer789',
        isNewUser: false,
      },
    });
    
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Go back to gameplay
    await page.goto('/gameplay-demo');
    
    // Mock connected user limit
    await mockApiResponse(page, /\/api\/sessions\/limits/, {
      dailyLimit: 10,
      sessionsUsed: 2,
      remaining: 8,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    });
    
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify increased limit
    await waitForText(page, '8 plays remaining');
  });

  test('should maintain wallet connection across page refreshes', async ({ page, mockWallet }) => {
    // Inject mock wallet
    await mockWallet(page);
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Mock wallet connection
    await mockApiResponse(page, /\/api\/auth\/connect/, {
      token: 'mock_jwt_token',
      player: {
        id: 'player-7',
        stakeKey: 'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8',
        username: 'TestPlayer999',
        isNewUser: false,
      },
    });
    
    // Connect wallet
    await clickButton(page, 'Connect Wallet');
    await clickButton(page, 'Lace');
    
    // Wait for connection
    await waitForText(page, 'TestPlayer999');
    
    // Refresh page
    await page.reload();
    await waitForLoadingComplete(page);
    
    // Verify still connected
    await waitForText(page, 'TestPlayer999');
    await waitForText(page, 'stake_test1');
  });
});
