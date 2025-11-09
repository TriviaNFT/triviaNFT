import { Page, expect } from '@playwright/test';

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for an element to be visible and return it
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  return page.locator(selector);
}

/**
 * Wait for text to appear on the page
 */
export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Click a button by text content
 */
export async function clickButton(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Fill a form field by label or placeholder
 */
export async function fillField(page: Page, label: string, value: string) {
  const input = page.locator(`input[placeholder*="${label}" i], input[aria-label*="${label}" i]`);
  await input.fill(value);
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Get localStorage value
 */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set localStorage value
 */
export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  );
}

/**
 * Clear localStorage
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Wait for timer countdown
 */
export async function waitForTimer(page: Page, seconds: number) {
  // Wait for timer to appear
  await waitForElement(page, '[data-testid="timer"], .timer, text=/\\d+s/');
  
  // Wait for specified duration plus buffer
  await page.waitForTimeout((seconds + 1) * 1000);
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take screenshot with name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Verify toast/notification message
 */
export async function verifyToast(page: Page, message: string, timeout = 5000) {
  const toast = page.locator('[role="alert"], .toast, [data-testid="toast"]').filter({ hasText: message });
  await expect(toast).toBeVisible({ timeout });
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingComplete(page: Page, timeout = 10000) {
  // Wait for any loading indicators to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    'text=/loading/i',
    '[role="progressbar"]',
  ];
  
  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
    } catch {
      // Selector not found, continue
    }
  }
}
