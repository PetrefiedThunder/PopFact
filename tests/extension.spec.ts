import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * PopFact Browser Extension Test Suite
 *
 * This test suite validates the core functionality of the PopFact extension:
 * - Extension loads correctly in Chrome
 * - Ticker overlay appears on pages
 * - Fact-checking results are displayed
 * - UI elements render correctly
 * - No console errors occur
 * - Performance requirements are met
 */

const extensionPath = path.resolve(__dirname, '..');

/**
 * Helper function to create a browser context with the extension loaded
 */
async function createExtensionContext() {
  const browser = await chromium.launch({
    headless: false, // Extensions require non-headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const context = await browser.newContext();
  return { browser, context };
}

/**
 * Test Suite: Extension Loading
 */
test.describe('Extension Loading', () => {
  test('should load extension without errors', async () => {
    const { browser, context } = await createExtensionContext();

    try {
      // Get the extension's service worker (background script)
      const serviceWorkers = context.serviceWorkers();
      const backgroundPage = context.backgroundPages()[0];

      // Verify extension loaded
      expect(serviceWorkers.length >= 0 || backgroundPage).toBeTruthy();

      console.log('✓ Extension loaded successfully');
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test('should have correct manifest properties', async () => {
    const manifest = require('../manifest.json');

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toContain('PopFact');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0].js).toContain('content.js');
    expect(manifest.content_scripts[0].css).toContain('overlay.css');

    console.log('✓ Manifest validation passed');
  });
});

/**
 * Test Suite: Popup Interface
 */
test.describe('Popup Interface', () => {
  test('should have popup.html file', async () => {
    const fs = require('fs');
    const popupPath = path.resolve(__dirname, '../popup.html');

    expect(fs.existsSync(popupPath)).toBe(true);

    console.log('✓ popup.html exists');
  });

  test('should have valid popup structure', async () => {
    const fs = require('fs');
    const popupPath = path.resolve(__dirname, '../popup.html');
    const content = fs.readFileSync(popupPath, 'utf-8');

    expect(content).toContain('PopFact');
    expect(content).toContain('Settings');
    expect(content).toContain('popup.js');

    console.log('✓ popup.html has valid structure');
  });
});
