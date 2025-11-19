import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PopFact browser extension testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Required for loading unpacked extensions in tests
        launchOptions: {
          args: [
            `--disable-extensions-except=${__dirname}`,
            `--load-extension=${__dirname}`,
          ],
        },
      },
    },
  ],
});
