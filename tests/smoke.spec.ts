/**
 * Smoke Tests - Infrastructure Validation
 * 
 * These tests validate that the test infrastructure is working correctly
 * without requiring the full browser extension to be loaded.
 */

import { test, expect } from '@playwright/test';

test.describe('Test Infrastructure - Smoke Tests', () => {
  
  test('Can load local HTML files', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Sample News Article');
  });
  
  test('Test fixture page has expected content', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Verify the page has declarative statements for testing
    const content = await page.textContent('body');
    
    expect(content).toContain('sky is blue');
    expect(content).toContain('Earth is round');
    expect(content).toContain('moon landing was fake');
    expect(content).toContain('vaccines cause autism');
  });
  
  test('Can inject custom scripts into page', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Inject a test element
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-injected';
      div.textContent = 'Injected by test';
      document.body.appendChild(div);
    });
    
    await expect(page.locator('#test-injected')).toBeVisible();
    await expect(page.locator('#test-injected')).toHaveText('Injected by test');
  });
  
  test('Can simulate content script injection', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Simulate what the content script would do
    await page.evaluate(() => {
      // Create overlay structure similar to content.js
      const overlay = document.createElement('div');
      overlay.id = 'popfact-overlay-test';
      overlay.innerHTML = '<div class="test-ticker">Test Ticker</div>';
      document.body.appendChild(overlay);
    });
    
    const overlay = page.locator('#popfact-overlay-test');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Test Ticker');
  });
  
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
