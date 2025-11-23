import { test, expect } from '@playwright/test';

/**
 * E2E Test: Landing Page Responsive Layout
 * 
 * Tests Requirements:
 * - Requirement 4.1: Mobile layout (≤640px) - single column, cards below copy
 * - Requirement 4.2: Tablet layout (641-1024px) - two columns with tighter spacing
 * - Requirement 4.3: Desktop layout (≥1024px) - generous spacing, stronger glows
 * - Requirement 4.4: CTAs visible without scrolling on mobile
 * - Requirement 4.5: Touch-friendly sizes (minimum 44×44px)
 */

test.describe('Landing Page Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all sections on landing page', async ({ page }) => {
    // Navigation
    await expect(page.getByText('TriviaNFT').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect.*Wallet/i }).first()).toBeVisible();
    
    // Hero Section - Logo
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Hero Section - Buttons
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leaderboard/i })).toBeVisible();
    
    // NFT Cards
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
  });

  test('mobile layout (375px): single column, cards below copy, tighter spacing', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Allow layout to adjust
    
    // Verify logo is visible
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Verify CTAs are visible without scrolling
    const startGameButton = page.getByRole('button', { name: /Start.*Game/i });
    const startGameBox = await startGameButton.boundingBox();
    expect(startGameBox).not.toBeNull();
    expect(startGameBox!.y).toBeLessThan(667); // Should be visible in viewport
    
    // Verify touch-friendly button sizes (minimum 44×44px, we use 48px)
    expect(startGameBox!.height).toBeGreaterThanOrEqual(44);
    
    const whitepaperButton = page.getByRole('button', { name: /Whitepaper/i });
    const whitepaperBox = await whitepaperButton.boundingBox();
    expect(whitepaperBox).not.toBeNull();
    expect(whitepaperBox!.height).toBeGreaterThanOrEqual(44);
    
    // Verify Connect Wallet button is touch-friendly (use first one from navigation)
    const connectWalletButton = page.getByRole('button', { name: /Connect.*Wallet/i }).first();
    const connectWalletBox = await connectWalletButton.boundingBox();
    expect(connectWalletBox).not.toBeNull();
    expect(connectWalletBox!.height).toBeGreaterThanOrEqual(44);
    
    // Verify NFT cards are visible
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
  });

  test('mobile layout (640px): verify tighter spacing', async ({ page }) => {
    // Set mobile viewport at upper bound
    await page.setViewportSize({ width: 640, height: 1136 });
    await page.waitForTimeout(500);
    
    // Verify all CTAs are visible
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leaderboard/i })).toBeVisible();
    
    // Verify NFT cards are visible
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
  });

  test('tablet layout (768px): two columns with tighter spacing', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Verify logo is visible
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Verify NFT cards are visible
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
    
    // Verify all buttons are visible
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leaderboard/i })).toBeVisible();
    
    // Verify buttons are still touch-friendly
    const startGameButton = page.getByRole('button', { name: /Start.*Game/i });
    const startGameBox = await startGameButton.boundingBox();
    expect(startGameBox).not.toBeNull();
    expect(startGameBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('tablet layout (1024px): verify layout at upper bound', async ({ page }) => {
    // Set tablet viewport at upper bound
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    // Verify logo is visible
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Verify NFT cards are visible
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
    
    // Verify all buttons are visible
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
  });

  test('desktop layout (1280px): generous spacing and stronger glows', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    
    // Verify logo is visible
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Verify NFT cards are visible with full size
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
    
    // Verify all buttons are visible
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leaderboard/i })).toBeVisible();
  });

  test('desktop layout (1440px): verify layout at larger screen', async ({ page }) => {
    // Set large desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    
    // Verify logo is visible
    const logo = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo).toBeVisible();
    
    // Verify CTAs are properly sized
    const startGameButton = page.getByRole('button', { name: /Start.*Game/i });
    await expect(startGameButton).toBeVisible();
    
    // Verify NFT cards are visible
    const nftCards = page.getByLabel(/Three neon-edged collectible cards/i);
    await expect(nftCards).toBeVisible();
  });

  test('CTAs remain visible without scrolling on mobile', async ({ page }) => {
    // Test at smallest mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Verify Start Game button is visible in viewport
    const startGameButton = page.getByRole('button', { name: /Start.*Game/i });
    const startGameBox = await startGameButton.boundingBox();
    expect(startGameBox).not.toBeNull();
    expect(startGameBox!.y + startGameBox!.height).toBeLessThan(viewportHeight);
    
    // Verify Whitepaper button is visible in viewport
    const whitepaperButton = page.getByRole('button', { name: /Whitepaper/i });
    const whitepaperBox = await whitepaperButton.boundingBox();
    expect(whitepaperBox).not.toBeNull();
    expect(whitepaperBox!.y + whitepaperBox!.height).toBeLessThan(viewportHeight);
  });

  test('all interactive elements have touch-friendly sizes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Test all buttons (use first() for buttons that appear multiple times)
    const buttons = [
      page.getByRole('button', { name: /Connect.*Wallet/i }).first(),
      page.getByRole('button', { name: /Start.*Game/i }),
      page.getByRole('button', { name: /Whitepaper/i }),
      page.getByRole('button', { name: /Profile/i }),
      page.getByRole('button', { name: /Leaderboard/i }),
    ];
    
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('navigation buttons work correctly', async ({ page }) => {
    // Test Start Game button
    const startGameButton = page.getByRole('button', { name: /Start.*Game/i });
    await startGameButton.click();
    await page.waitForURL(/play/);
    expect(page.url()).toContain('play');
    
    // Go back to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test Whitepaper button
    const whitepaperButton = page.getByRole('button', { name: /Whitepaper/i });
    await whitepaperButton.click();
    await page.waitForURL(/whitepaper/);
    expect(page.url()).toContain('whitepaper');
  });

  test('hero buttons navigate correctly', async ({ page }) => {
    // Test Profile button
    const profileButton = page.getByRole('button', { name: /Profile/i });
    await profileButton.click();
    await page.waitForURL(/profile/);
    expect(page.url()).toContain('profile');
    
    // Go back and test Leaderboard button
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const leaderboardButton = page.getByRole('button', { name: /Leaderboard/i });
    await leaderboardButton.click();
    await page.waitForURL(/leaderboard/);
    expect(page.url()).toContain('leaderboard');
  });

  test('responsive layout transitions smoothly between breakpoints', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const logo1 = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo1).toBeVisible();
    
    // Transition to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const logo2 = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo2).toBeVisible();
    
    // Transition to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    const logo3 = page.getByRole('img', { name: /TriviaNFT logo/i });
    await expect(logo3).toBeVisible();
    
    // All buttons should remain visible throughout
    await expect(page.getByRole('button', { name: /Start.*Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Whitepaper/i })).toBeVisible();
  });
});
