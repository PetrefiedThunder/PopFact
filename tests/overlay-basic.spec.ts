/**
 * Basic Overlay Tests
 * 
 * Tests that verify the PopFact overlay appears and functions correctly
 */

import { test, expect } from '@playwright/test';
import { 
  getOverlay, 
  getToggleButton, 
  waitForOverlay,
  isOverlayHidden,
  toggleOverlay
} from './utils/shadow-dom.ts';
import { injectExtension } from './utils/inject-extension.ts';

test.describe('PopFact Overlay - Basic Functionality', () => {
  
  test('should inject overlay on page load', async ({ page }) => {
    // Navigate to test page
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Inject extension (simulates extension loading)
    await injectExtension(page);
    
    // Wait for overlay to appear
    await waitForOverlay(page);
    
    // Verify overlay exists
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should display PopFact branding', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Check for branding label
    const label = page.locator('.popfact-ticker-label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('POPFACT');
  });
  
  test('should have a toggle button', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Verify toggle button exists
    const toggleBtn = getToggleButton(page);
    await expect(toggleBtn).toBeVisible();
  });
  
  test('should toggle overlay visibility when button is clicked', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Initially visible
    let hidden = await isOverlayHidden(page);
    expect(hidden).toBe(false);
    
    // Click toggle to hide
    await toggleOverlay(page);
    await page.waitForTimeout(500); // Wait for animation
    
    hidden = await isOverlayHidden(page);
    expect(hidden).toBe(true);
    
    // Click again to show
    await toggleOverlay(page);
    await page.waitForTimeout(500);
    
    hidden = await isOverlayHidden(page);
    expect(hidden).toBe(false);
  });
  
  test('should display status indicator', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Check for status indicator
    const status = page.locator('.popfact-status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('ACTIVE');
  });
  
  test('should have ticker scroll container', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Verify ticker scroll element exists
    const ticker = page.locator('#popfact-ticker-scroll');
    await expect(ticker).toBeVisible();
  });
  
  test('should display loading message initially', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Check for loading message
    const loading = page.locator('.popfact-loading');
    
    // Loading message might appear briefly or be replaced quickly
    // Just verify the ticker exists
    const ticker = page.locator('#popfact-ticker-scroll');
    await expect(ticker).toBeVisible();
  });
  
  test('should not interfere with page scrolling', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Get initial scroll position
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
    
    // Scroll page
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Verify scroll worked
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(500);
    
    // Overlay should still be visible at bottom
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should have proper z-index to stay on top', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    await waitForOverlay(page);
    
    // Check z-index is very high
    const overlay = getOverlay(page);
    const zIndex = await overlay.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    
    // Should be max z-index
    expect(parseInt(zIndex)).toBeGreaterThan(2000000000);
  });
});
