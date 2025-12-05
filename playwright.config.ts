import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PopFact browser extension testing
 * @see https://playwright.dev/docs/test-configuration
 * 
 * Note: Extension-specific tests require manual extension loading.
 * Run smoke tests with: npm test
 * Run all tests with extension loaded manually: npm run test:extension
 */
export default defineConfig({
  testDir: './tests',
  
  /* Test match pattern - by default only run smoke tests and github-integration tests */
  testMatch: process.env.RUN_EXTENSION_TESTS ? '**/*.spec.ts' : ['**/smoke.spec.ts', '**/github-integration.spec.ts'],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html'],
    ['list']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
