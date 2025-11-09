import { test as base, Page } from '@playwright/test';

/**
 * Test fixtures for authentication
 * Provides utilities for wallet connection and profile creation
 */

export interface AuthFixtures {
  /**
   * Mock wallet connection for testing
   */
  mockWallet: (page: Page) => Promise<void>;
  
  /**
   * Create a test user profile
   */
  createTestProfile: (page: Page, username: string) => Promise<void>;
  
  /**
   * Get guest anonymous ID from storage
   */
  getGuestId: (page: Page) => Promise<string>;
}

export const test = base.extend<AuthFixtures>({
  /**
   * Mock wallet connection by injecting window.cardano
   */
  mockWallet: async ({}, use) => {
    await use(async (page: Page) => {
      await page.addInitScript(() => {
        // Mock CIP-30 wallet interface
        (window as any).cardano = {
          lace: {
            name: 'Lace',
            icon: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
            apiVersion: '0.1.0',
            enable: async () => ({
              getNetworkId: async () => 0, // Preprod
              getUsedAddresses: async () => [
                'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
              ],
              getUnusedAddresses: async () => [],
              getUtxos: async () => [],
              getBalance: async () => '1000000000',
              getRewardAddresses: async () => [
                'stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8'
              ],
              signTx: async (tx: string) => tx,
              signData: async (addr: string, payload: string) => ({
                signature: 'mock_signature',
                key: 'mock_key'
              }),
              submitTx: async (tx: string) => 'mock_tx_hash',
            }),
          },
        };
      });
    });
  },

  /**
   * Create a test profile with username
   */
  createTestProfile: async ({}, use) => {
    await use(async (page: Page, username: string) => {
      // Wait for profile creation form
      await page.waitForSelector('input[placeholder*="username" i]', { timeout: 5000 });
      
      // Fill username
      await page.fill('input[placeholder*="username" i]', username);
      
      // Submit form
      await page.click('button:has-text("Create Profile")');
      
      // Wait for profile creation to complete
      await page.waitForTimeout(1000);
    });
  },

  /**
   * Get guest anonymous ID from localStorage
   */
  getGuestId: async ({}, use) => {
    await use(async (page: Page) => {
      const anonId = await page.evaluate(() => {
        return localStorage.getItem('trivia_anon_id') || '';
      });
      return anonId;
    });
  },
});

export { expect } from '@playwright/test';
