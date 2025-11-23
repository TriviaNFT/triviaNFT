import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for property-based tests
 * These tests don't require a running web server as they test configuration files
 */
export default defineConfig({
  testDir: './e2e/properties',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: 'html',
  
  /* Shared settings for all the projects below */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },
  
  /* Standard test timeout */
  timeout: 30000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* No web server needed for property tests */
});
