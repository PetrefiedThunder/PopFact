/**
 * Anti-Fragility Tests
 * 
 * Tests that ensure PopFact works reliably even when websites change their HTML
 * Uses resilient selectors and handles edge cases
 */

import { test, expect } from '@playwright/test';
import { 
  getOverlay,
  waitForOverlay,
  getFactItems
} from './utils/shadow-dom.ts';
import { mockFactCheckResponse } from './utils/network-mocking.ts';

test.describe('PopFact Anti-Fragility - Resilient Operation', () => {
  
  test('should work on pages with complex nested structures', async ({ page }) => {
    // Create a page with deeply nested content
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Complex Page</title></head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="content">
                <section>
                  <article>
                    <div>
                      <p>The sky is blue. This is a declarative statement.</p>
                    </div>
                  </article>
                </section>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Wait a moment for extension to process
    await page.waitForTimeout(1000);
    
    // Overlay should still appear
    await waitForOverlay(page, 3000);
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should handle pages with no declarative statements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Simple Page</title></head>
        <body>
          <h1>Welcome</h1>
          <p>Click here to subscribe!</p>
          <button>Download Now</button>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    // Overlay should still appear (with loading or no items)
    await waitForOverlay(page, 3000);
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should not break on pages with special characters', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Special Characters</title></head>
        <body>
          <p>Price: $100 & €90 ≈ £80. The exchange rate is 1.2.</p>
          <p>Math: 2 + 2 = 4, 5 × 6 = 30, ∑ of values is 100.</p>
          <p>Quotes: "Hello" 'World' « French » ‹ Swiss ›</p>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should handle very long pages efficiently', async ({ page }) => {
    // Generate a long page
    let content = '<html><body>';
    for (let i = 0; i < 100; i++) {
      content += `<p>Paragraph ${i}: This is some text content. The Earth is round.</p>`;
    }
    content += '</body></html>';
    
    await page.setContent(content);
    await page.waitForTimeout(1000);
    
    // Should still load overlay
    await waitForOverlay(page, 3000);
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should not break when page uses conflicting CSS', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CSS Conflicts</title>
          <style>
            * { z-index: 999999 !important; }
            div { position: fixed !important; bottom: 0 !important; }
            #popfact-overlay { display: none !important; }
          </style>
        </head>
        <body>
          <div>Some content</div>
          <p>The sky is blue according to science.</p>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    // Even with conflicting CSS, overlay should attempt to appear
    // Note: Some CSS conflicts might actually hide it, which is expected
    const overlay = page.locator('#popfact-overlay');
    const exists = await overlay.count() > 0;
    expect(exists).toBe(true);
  });
  
  test('should handle pages that modify DOM rapidly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Dynamic Page</title></head>
        <body>
          <div id="content">Initial content</div>
          <script>
            setInterval(() => {
              const div = document.getElementById('content');
              if (div) {
                div.innerHTML = '<p>Updated at ' + Date.now() + ': The sky is blue.</p>';
              }
            }, 100);
          </script>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(2000);
    
    // Extension should handle rapid DOM changes
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should work on pages with iframes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Page with Iframe</title></head>
        <body>
          <p>Main page content: The Earth is round.</p>
          <iframe srcdoc="<p>Iframe content</p>" width="400" height="200"></iframe>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should handle pages with shadow DOM from other components', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Shadow DOM Page</title></head>
        <body>
          <div id="host"></div>
          <p>Regular content: The sky is blue.</p>
          <script>
            const host = document.getElementById('host');
            const shadow = host.attachShadow({mode: 'open'});
            shadow.innerHTML = '<p>Shadow content: Hidden from main DOM</p>';
          </script>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
  
  test('should handle errors gracefully', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Page that might cause issues
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Problematic Page</title></head>
        <body>
          <p>Content with null: \x00</p>
          <script>
            // Cause some errors
            window.onerror = () => false;
            throw new Error('Test error');
          </script>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    // Overlay should still work despite page errors
    const overlay = page.locator('#popfact-overlay');
    const exists = await overlay.count() > 0;
    expect(exists).toBe(true);
  });
  
  test('should use accessibility-friendly selectors', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // We use ID selectors which are stable
    const overlay = page.locator('#popfact-overlay');
    await expect(overlay).toBeVisible();
    
    const toggle = page.locator('#popfact-toggle');
    await expect(toggle).toBeVisible();
    
    // Class-based selectors for styled components
    const ticker = page.locator('.popfact-ticker-container');
    await expect(ticker).toBeVisible();
  });
  
  test('should not interfere with page JavaScript', async ({ page }) => {
    let jsExecuted = false;
    
    await page.exposeFunction('testCallback', () => {
      jsExecuted = true;
    });
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>JS Test</title></head>
        <body>
          <button id="testBtn">Click Me</button>
          <p>The sky is blue according to science.</p>
          <script>
            document.getElementById('testBtn').addEventListener('click', () => {
              window.testCallback();
            });
          </script>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(1000);
    
    // Click the button
    await page.click('#testBtn');
    await page.waitForTimeout(500);
    
    // Page JS should still work
    expect(jsExecuted).toBe(true);
    
    // Overlay should be visible
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
});
