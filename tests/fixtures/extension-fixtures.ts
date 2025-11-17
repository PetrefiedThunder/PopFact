/**
 * Custom Playwright fixtures for browser extension testing
 * 
 * This module provides custom fixtures that properly load the browser extension
 * in a persistent context, which is required for extension testing.
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

/**
 * Extended test with extension context
 * 
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/extension-fixtures';
 * 
 * test('should load extension', async ({ page }) => {
 *   await page.goto('...');
 *   // Extension is now loaded
 * });
 * ```
 */
export const test = base.extend<ExtensionFixtures>({
  // Override the context fixture to use a persistent context with the extension
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '..');
    const userDataDir = path.join(__dirname, '../test-results/user-data');
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions don't work in headless mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    
    await use(context);
    await context.close();
  },
  
  // Get the extension ID
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
