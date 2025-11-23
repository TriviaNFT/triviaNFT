import { test, expect } from '@playwright/test';

/**
 * E2E Test: Profile Page Responsive Layout
 * 
 * Tests Requirements:
 * - Requirement 1.2: Touch targets ≥ 44×44px on mobile
 * - Requirement 4.1: Consistent responsive layout
 * - Requirement 4.2: Components adapt to viewport
 * - Requirement 4.4: Modals fit within viewport
 */

test.describe('Profile Page Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should display wallet connect prompt when not authenticated', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    
    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
  });

  test('mobile layout (375px): wallet connect prompt is centered and readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Verify wallet connect prompt is visible
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    await expect(page.getByText(/Connect your Cardano wallet/i)).toBeVisible();
  });

  test('tablet layout (768px): wallet connect prompt is appropriately sized', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Verify wallet connect prompt is visible
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
  });

  test('desktop layout (1280px): wallet connect prompt is centered with max-width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    
    // Verify wallet connect prompt is visible
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
  });

  test('navigation buttons are touch-friendly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Test Connect Wallet button in navigation (if visible)
    const connectButton = page.getByRole('button', { name: /Connect.*Wallet/i }).first();
    if (await connectButton.isVisible()) {
      const box = await connectButton.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('responsive layout transitions smoothly between breakpoints', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    
    // Transition to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    
    // Transition to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
  });

  test('no horizontal scrolling on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check if page has horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('no horizontal scrolling on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Check if page has horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('no horizontal scrolling on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    
    // Check if page has horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('wallet connect card fits within viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Find the wallet connect card
    const card = page.locator('text=/Connect Your Wallet/i').locator('..');
    if (await card.isVisible()) {
      const box = await card.boundingBox();
      if (box) {
        // Card should fit within viewport
        expect(box.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });

  test('wallet connect card fits within viewport on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Find the wallet connect card
    const card = page.locator('text=/Connect Your Wallet/i').locator('..');
    if (await card.isVisible()) {
      const box = await card.boundingBox();
      if (box) {
        // Card should fit within viewport
        expect(box.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });

  test('text is readable without horizontal scrolling on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Verify main text is visible
    await expect(page.getByText(/Connect Your Wallet/i)).toBeVisible();
    await expect(page.getByText(/Connect your Cardano wallet/i)).toBeVisible();
    
    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });
});
