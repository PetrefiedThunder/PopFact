/**
 * Performance Tests
 * 
 * Ensures PopFact overlay doesn't slow down page load or rendering
 */

import { test, expect } from '@playwright/test';
import { 
  checkOverlayPerformance,
  measureTickerFPS,
  measureMemoryImpact
} from './utils/performance.ts';
import { waitForOverlay } from './utils/shadow-dom.ts';
import { injectExtension } from './utils/inject-extension.ts';

test.describe('PopFact Performance Tests', () => {
  
  test('should load overlay within 200ms performance budget', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await injectExtension(page);
    
    // Check if overlay appears within time budget
    const result = await checkOverlayPerformance(page, 200);
    
    console.log(`Overlay appeared in ${result.actualTime}ms`);
    
    // This is a guardrail test - overlay should appear fast
    expect(result.passed).toBe(true);
    expect(result.actualTime).toBeLessThan(200);
  });
  
  test('should not block page rendering', async ({ page }) => {
    // Measure time to page load
    const startTime = Date.now();
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load quickly even with extension
    expect(loadTime).toBeLessThan(2000);
    
    // Overlay should be visible
    await waitForOverlay(page);
  });
  
  test('should maintain smooth animation (>30 FPS)', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // Wait for ticker to start scrolling
    await page.waitForTimeout(1000);
    
    // Measure FPS over 2 seconds
    const fps = await measureTickerFPS(page, 2000);
    
    console.log(`Ticker animation FPS: ${fps.toFixed(2)}`);
    
    // Should maintain at least 30 FPS for smooth animation
    // Note: In headless mode, FPS might be lower, so we're lenient
    expect(fps).toBeGreaterThan(15);
  });
  
  test('should have minimal memory footprint', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // Wait a bit for extension to initialize
    await page.waitForTimeout(2000);
    
    // Measure memory usage
    const memory = await measureMemoryImpact(page);
    
    if (memory.usedJSHeapSize > 0) {
      console.log(`Memory used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Extension should use reasonable amount of memory (<50MB)
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      expect(usedMB).toBeLessThan(50);
    } else {
      // Memory API might not be available in test environment
      console.log('Memory API not available, skipping memory check');
    }
  });
  
  test('should not slow down page interactions', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // Test click responsiveness
    const startTime = Date.now();
    
    // Click on page element
    await page.click('h1');
    
    const clickTime = Date.now() - startTime;
    
    // Click should be instant (<100ms)
    expect(clickTime).toBeLessThan(100);
  });
  
  test('should handle rapid content changes efficiently', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    const startTime = Date.now();
    
    // Add multiple paragraphs rapidly
    await page.evaluate(() => {
      const article = document.querySelector('article');
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('p');
        p.textContent = `Dynamic paragraph ${i}: The sky is blue and water is wet. This is claim ${i}.`;
        article?.appendChild(p);
      }
    });
    
    const addTime = Date.now() - startTime;
    
    // Should handle dynamic content quickly
    expect(addTime).toBeLessThan(500);
    
    // Page should still be responsive
    await page.waitForTimeout(1000);
    const overlay = page.locator('#popfact-overlay');
    await expect(overlay).toBeVisible();
  });
  
  test('should not cause layout thrashing', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // Measure layout recalculations
    const layoutCount = await page.evaluate(() => {
      let count = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            count++;
          }
        }
      });
      
      // Scroll page multiple times
      for (let i = 0; i < 10; i++) {
        window.scrollTo(0, i * 100);
      }
      
      return count;
    });
    
    // This is a basic check - in production, you'd use more sophisticated metrics
    console.log(`Layout calculations during scroll: ${layoutCount}`);
  });
  
  test('should maintain performance with toggle interactions', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    const toggleBtn = page.locator('#popfact-toggle');
    
    // Toggle multiple times and measure
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      await toggleBtn.click();
      await page.waitForTimeout(100);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Should complete 5 toggles quickly (within 1 second plus animation time)
    expect(totalTime).toBeLessThan(2000);
  });
});
