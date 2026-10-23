/**
 * Smoke Tests - Infrastructure Validation
 *
 * These tests validate that the test infrastructure is working correctly
 * without requiring the full browser extension to be loaded.
 */

import { test, expect } from '@playwright/test';

test.describe('Test Infrastructure - Smoke Tests', () => {

  test('TypeScript test files compile without errors', async () => {
    // This test passes if the test file itself compiles
    // which means all the imports and TypeScript syntax are valid
    expect(true).toBe(true);
  });

  test('Playwright configuration is valid', async ({ page }) => {
    // Test that basic Playwright features work
    await page.setContent('<html><body><h1>Test</h1></body></html>');
    await expect(page.locator('h1')).toHaveText('Test');

    // Test that we can take screenshots
    const screenshot = await page.screenshot();
    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});
