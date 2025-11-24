/**
 * Enhanced Context Understanding Tests
 * 
 * Tests the enhanced PopFact ticker that validates detailed explanations,
 * domain-specific context with emojis, verdict symbols, and multi-line display
 * 
 * NOTE: These tests require the browser extension to be loaded. 
 * Run with: RUN_EXTENSION_TESTS=1 npm test
 * 
 * For manual testing with extension:
 * 1. Build the extension
 * 2. Load extension in Chrome
 * 3. Run: npx playwright test --headed tests/enhanced-context.spec.ts
 */

import { test, expect } from '@playwright/test';
import { 
  getFactItems,
  getFactItemsByCategory,
  waitForFactItem,
  getFactItemText,
  getOverlay,
  getTickerScroll,
  waitForOverlay
} from './utils/shadow-dom.ts';
import { mockFactCheckResponse, mockFactCheckResponses } from './utils/network-mocking.ts';

test.describe('PopFact Enhanced Context Understanding', () => {
  
  test('should display climate science claim with 🌍 emoji and contextual explanation', async ({ page }) => {
    // Mock response for climate-related claim
    await mockFactCheckResponse(page, {
      claim: 'Climate change is a proven scientific fact',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const trueItems = getFactItemsByCategory(page, 'true');
    const item = trueItems.first();
    await expect(item).toBeVisible();
    
    // Verify explanation contains climate emoji
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('🌍');
    expect(explanationText).toContain('Climate Context');
    expect(explanationText).toContain('NASA');
    expect(explanationText).toContain('NOAA');
    expect(explanationText).toContain('IPCC');
    expect(explanationText).toContain('97% consensus');
  });
  
  test('should display vaccine claim with 💉 emoji and medical context', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Vaccines are safe and effective',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 💉 Medical Context: Vaccines undergo rigorous clinical trials and ongoing safety monitoring by health agencies (FDA, WHO, CDC). The debunked vaccine-autism link originated from a retracted study. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.92,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    await expect(item).toBeVisible();
    
    // Verify medical context
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('💉');
    expect(explanationText).toContain('Medical Context');
    expect(explanationText).toContain('FDA');
    expect(explanationText).toContain('WHO');
    expect(explanationText).toContain('CDC');
    expect(explanationText).toContain('clinical trials');
  });
  
  test('should display election claim with 🗳️ emoji and electoral context', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Election results are verified through multiple audits',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🗳️ Electoral Context: Election integrity is verified through multiple independent audits, bipartisan poll watchers, and official certification processes with documented chain of custody. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.88,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    await expect(item).toBeVisible();
    
    // Verify electoral context
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('🗳️');
    expect(explanationText).toContain('Electoral Context');
    expect(explanationText).toContain('independent audits');
    expect(explanationText).toContain('bipartisan poll watchers');
    expect(explanationText).toContain('certification processes');
  });
  
  test('should display space claim with 🚀 emoji and space context', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Moon landing was real and verified',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🚀 Space Context: Space missions involve thousands of engineers, international cooperation, and independently verifiable evidence including reflectors on the moon and samples returned to Earth. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.95,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    await expect(item).toBeVisible();
    
    // Verify space context
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('🚀');
    expect(explanationText).toContain('Space Context');
    expect(explanationText).toContain('thousands of engineers');
    expect(explanationText).toContain('international cooperation');
    expect(explanationText).toContain('reflectors on the moon');
  });
  
  test('should correctly categorize climate change denial as FALSE with appropriate context', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Climate change is a hoax',
      verdict: 'FALSE',
      explanation: '✗ DISPUTED: This claim contradicts verified evidence from authoritative sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.95,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'false', 15000);
    
    const falseItems = getFactItemsByCategory(page, 'false');
    const item = falseItems.first();
    await expect(item).toBeVisible();
    
    // Verify FALSE verdict and climate context
    const { icon, verdict } = await getFactItemText(item);
    expect(icon).toContain('✗');
    
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('🌍');
    expect(explanationText).toContain('Climate Context');
  });
  
  test('should correctly categorize vaccine misinformation as FALSE with medical context', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Vaccines cause autism',
      verdict: 'FALSE',
      explanation: '✗ DISPUTED: This claim contradicts verified evidence from authoritative sources. 💉 Medical Context: Vaccines undergo rigorous clinical trials and ongoing safety monitoring by health agencies (FDA, WHO, CDC). The debunked vaccine-autism link originated from a retracted study. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.05,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'false', 15000);
    
    const item = getFactItemsByCategory(page, 'false').first();
    await expect(item).toBeVisible();
    
    // Verify medical context explains the debunked claim
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('💉');
    expect(explanationText).toContain('Medical Context');
    expect(explanationText).toContain('debunked');
    expect(explanationText).toContain('retracted study');
  });
});

test.describe('PopFact Detailed Explanation Tests', () => {
  
  test('should display verdict symbol ✓ for TRUE claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'The sky is blue',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    
    // Verify verdict symbol in icon
    const { icon } = await getFactItemText(item);
    expect(icon).toContain('✓');
    
    // Verify verdict symbol in explanation
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('✓');
    expect(explanationText).toContain('VERIFIED');
  });
  
  test('should display verdict symbol ✗ for FALSE claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Earth is flat',
      verdict: 'FALSE',
      explanation: '✗ DISPUTED: This claim contradicts verified evidence from authoritative sources. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.1,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'false', 15000);
    
    const item = getFactItemsByCategory(page, 'false').first();
    
    // Verify verdict symbol
    const { icon } = await getFactItemText(item);
    expect(icon).toContain('✗');
    
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('✗');
    expect(explanationText).toContain('DISPUTED');
  });
  
  test('should display verdict symbol ⚠ for MIXED claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Coffee is healthy',
      verdict: 'MIXED',
      explanation: '⚠ NUANCED: This claim has both supporting and contradicting evidence requiring careful analysis. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.55,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'mixed', 15000);
    
    const item = getFactItemsByCategory(page, 'mixed').first();
    
    // Verify verdict symbol
    const { icon } = await getFactItemText(item);
    expect(icon).toContain('⚠');
    
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('⚠');
    expect(explanationText).toContain('NUANCED');
  });
  
  test('should display verdict symbol ? for UNVERIFIED claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'New technology will revolutionize the industry',
      verdict: 'UNVERIFIED',
      explanation: '? UNVERIFIED: Insufficient reliable evidence available to make a definitive assessment. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.3,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'unverified', 15000);
    
    const item = getFactItemsByCategory(page, 'unverified').first();
    
    // Verify verdict symbol
    const { icon } = await getFactItemText(item);
    expect(icon).toContain('?');
    
    const explanationText = await item.locator('.popfact-explanation').textContent();
    expect(explanationText).toContain('?');
    expect(explanationText).toContain('UNVERIFIED');
  });
  
  test('should include research guidance in all explanations', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim for research guidance',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.8,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const explanationText = await item.locator('.popfact-explanation').textContent();
    
    // Verify research guidance is present
    expect(explanationText).toContain('📚');
    expect(explanationText).toContain('For authoritative fact-checking');
    expect(explanationText).toContain('Snopes.com');
    expect(explanationText).toContain('FactCheck.org');
    expect(explanationText).toContain('PolitiFact.com');
  });
  
  test('should display full detailed explanation without truncation', async ({ page }) => {
    const longExplanation = '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.';
    
    await mockFactCheckResponse(page, {
      claim: 'Climate science is well-established',
      verdict: 'TRUE',
      explanation: longExplanation,
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const explanationText = await item.locator('.popfact-explanation').textContent();
    
    // Verify no truncation - should include all key parts
    expect(explanationText).toContain('VERIFIED');
    expect(explanationText).toContain('Climate Context');
    expect(explanationText).toContain('NASA');
    expect(explanationText).toContain('NOAA');
    expect(explanationText).toContain('IPCC');
    expect(explanationText).toContain('For authoritative fact-checking');
    expect(explanationText?.length).toBeGreaterThan(200);
  });
  
  test('should include domain-specific context for health claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Regular exercise improves health',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. ⚕️ Health Context: Medical and nutritional claims should be evaluated based on peer-reviewed research, clinical trials, and guidance from qualified healthcare professionals rather than anecdotes. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.85,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const explanationText = await item.locator('.popfact-explanation').textContent();
    
    // Verify health context
    expect(explanationText).toContain('⚕️');
    expect(explanationText).toContain('Health Context');
    expect(explanationText).toContain('peer-reviewed research');
    expect(explanationText).toContain('clinical trials');
  });
  
  test('should include domain-specific context for historical claims', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'World War II ended in 1945',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 📜 Historical Context: Historical claims are verified through primary sources, archaeological evidence, contemporary records, and consensus among professional historians. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.95,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const explanationText = await item.locator('.popfact-explanation').textContent();
    
    // Verify historical context
    expect(explanationText).toContain('📜');
    expect(explanationText).toContain('Historical Context');
    expect(explanationText).toContain('primary sources');
    expect(explanationText).toContain('archaeological evidence');
  });
});

test.describe('PopFact Enhanced Visual Display Tests', () => {
  
  test('should have overlay height of 100px for detailed explanations', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus.',
      confidence: 0.8,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    const overlay = getOverlay(page);
    
    // Check that overlay has increased height
    const height = await overlay.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    
    expect(height).toBe('100px');
  });
  
  test('should display verdict badge with correct styling for TRUE', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test TRUE claim',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const badge = item.locator('.popfact-verdict-badge');
    
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('TRUE');
    
    // Verify badge styling
    const bgColor = await badge.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toContain('28, 200, 138'); // rgb(28, 200, 138) - green
  });
  
  test('should display verdict badge with correct styling for FALSE', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test FALSE claim',
      verdict: 'FALSE',
      explanation: '✗ DISPUTED: Test explanation.',
      confidence: 0.1,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'false', 15000);
    
    const item = getFactItemsByCategory(page, 'false').first();
    const badge = item.locator('.popfact-verdict-badge');
    
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('FALSE');
    
    // Verify badge styling
    const bgColor = await badge.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toContain('255, 82, 82'); // rgb(255, 82, 82) - red
  });
  
  test('should display verdict badge with correct styling for MIXED', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test MIXED claim',
      verdict: 'MIXED',
      explanation: '⚠ NUANCED: Test explanation.',
      confidence: 0.5,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'mixed', 15000);
    
    const item = getFactItemsByCategory(page, 'mixed').first();
    const badge = item.locator('.popfact-verdict-badge');
    
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('MIXED');
    
    // Verify badge styling
    const bgColor = await badge.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toContain('255, 193, 7'); // rgb(255, 193, 7) - yellow
  });
  
  test('should display claim header with verdict badge', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Sample claim for header test',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0.85,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const header = item.locator('.popfact-claim-header');
    
    await expect(header).toBeVisible();
    
    // Verify header contains both badge and claim
    const badge = header.locator('.popfact-verdict-badge');
    const claim = header.locator('.popfact-claim');
    
    await expect(badge).toBeVisible();
    await expect(claim).toBeVisible();
    await expect(claim).toContainText('Sample claim');
  });
  
  test('should display confidence indicator when available', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim with confidence',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0.87,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const confidenceIndicator = item.locator('.popfact-confidence');
    
    await expect(confidenceIndicator).toBeVisible();
    
    const text = await confidenceIndicator.textContent();
    expect(text).toContain('Confidence');
    expect(text).toContain('87%'); // Math.round(0.87 * 100)
  });
  
  test('should not display confidence indicator when confidence is 0', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim without confidence',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const confidenceIndicator = item.locator('.popfact-confidence');
    
    // Should not be visible when confidence is 0
    const count = await confidenceIndicator.count();
    expect(count).toBe(0);
  });
  
  test('should support multi-line display for detailed explanations', async ({ page }) => {
    const detailedExplanation = '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.';
    
    await mockFactCheckResponse(page, {
      claim: 'Detailed climate science claim',
      verdict: 'TRUE',
      explanation: detailedExplanation,
      confidence: 0.92,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const explanation = item.locator('.popfact-explanation');
    
    // Verify multi-line support - element should be visible and not overflow
    await expect(explanation).toBeVisible();
    
    // Check that line-height is set for readability
    const lineHeight = await explanation.evaluate((el) => {
      return window.getComputedStyle(el).lineHeight;
    });
    expect(lineHeight).not.toBe('normal'); // Should have explicit line-height
    
    // Verify content is not clipped
    const isOverflowing = await explanation.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(isOverflowing).toBe(false);
  });
});

test.describe('PopFact Ticker Animation Tests', () => {
  
  test('should scroll ticker with longer content smoothly', async ({ page }) => {
    // Create multiple items with long explanations
    const longExplanation = '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.';
    
    await mockFactCheckResponse(page, {
      claim: 'Long content test claim',
      verdict: 'TRUE',
      explanation: longExplanation,
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const tickerScroll = getTickerScroll(page);
    
    // Verify ticker has animation
    const animationName = await tickerScroll.evaluate((el) => {
      return window.getComputedStyle(el).animationName;
    });
    expect(animationName).toContain('scroll'); // Should have scroll animation
    
    // Verify ticker is not paused initially
    const isPaused = await tickerScroll.evaluate((el) => {
      return el.classList.contains('paused');
    });
    expect(isPaused).toBe(false);
  });
  
  test('should pause ticker when pause button is clicked', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim for pause',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0.8,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const tickerScroll = getTickerScroll(page);
    const pauseButton = page.locator('#popfact-flow-toggle');
    
    // Verify button exists
    await expect(pauseButton).toBeVisible();
    await expect(pauseButton).toContainText('Stop');
    
    // Click to pause
    await pauseButton.click();
    await page.waitForTimeout(500);
    
    // Verify ticker is paused
    const isPaused = await tickerScroll.evaluate((el) => {
      return el.classList.contains('paused');
    });
    expect(isPaused).toBe(true);
    
    // Verify button text changed
    await expect(pauseButton).toContainText('Start');
  });
  
  test('should resume ticker when start button is clicked', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test claim for resume',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation.',
      confidence: 0.8,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const tickerScroll = getTickerScroll(page);
    const toggleButton = page.locator('#popfact-flow-toggle');
    
    // Pause first
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    let isPaused = await tickerScroll.evaluate((el) => {
      return el.classList.contains('paused');
    });
    expect(isPaused).toBe(true);
    
    // Resume
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Verify ticker is resumed
    isPaused = await tickerScroll.evaluate((el) => {
      return el.classList.contains('paused');
    });
    expect(isPaused).toBe(false);
    
    // Verify button text changed back
    await expect(toggleButton).toContainText('Stop');
  });
  
  test('should have appropriate animation duration for smooth scrolling', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Test animation speed',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
      confidence: 0.85,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const tickerScroll = getTickerScroll(page);
    
    // Check animation duration
    const animationDuration = await tickerScroll.evaluate((el) => {
      return window.getComputedStyle(el).animationDuration;
    });
    
    // Parse duration (should be in seconds)
    const durationSeconds = parseFloat(animationDuration);
    
    // Should be between 10-60 seconds for reasonable scrolling speed
    expect(durationSeconds).toBeGreaterThan(10);
    expect(durationSeconds).toBeLessThan(60);
  });
  
  test('should maintain ticker visibility while scrolling', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'Visibility test claim',
      verdict: 'TRUE',
      explanation: '✓ VERIFIED: Test explanation with sufficient content for scrolling animation.',
      confidence: 0.8,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const tickerScroll = getTickerScroll(page);
    const item = getFactItemsByCategory(page, 'true').first();
    
    // Verify ticker and items are visible
    await expect(tickerScroll).toBeVisible();
    await expect(item).toBeVisible();
    
    // Wait for animation to progress
    await page.waitForTimeout(2000);
    
    // Items should still be visible during animation
    await expect(tickerScroll).toBeVisible();
    await expect(item).toBeVisible();
  });
});

test.describe('PopFact Multiple Enhanced Claims', () => {
  
  test('should handle multiple claims with different domain contexts', async ({ page }) => {
    const responseMap = new Map<string, any>([
      ['climate change', {
        claim: 'climate change is real',
        verdict: 'TRUE',
        explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
        confidence: 0.95,
      }],
      ['vaccines', {
        claim: 'vaccines are safe',
        verdict: 'TRUE',
        explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 💉 Medical Context: Vaccines undergo rigorous clinical trials and ongoing safety monitoring by health agencies (FDA, WHO, CDC). The debunked vaccine-autism link originated from a retracted study. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
        confidence: 0.92,
      }],
      ['election', {
        claim: 'elections are secure',
        verdict: 'TRUE',
        explanation: '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources. 🗳️ Electoral Context: Election integrity is verified through multiple independent audits, bipartisan poll watchers, and official certification processes with documented chain of custody. 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.',
        confidence: 0.88,
      }],
    ]);
    
    await mockFactCheckResponses(page, responseMap);
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Wait for fact items to appear
    await page.waitForTimeout(3000);
    
    // Verify we have multiple items
    const allItems = getFactItems(page);
    const count = await allItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify different emojis are present
    const pageContent = await page.locator('#popfact-ticker-scroll').textContent();
    
    // May contain one or more of these emojis depending on which claims were processed
    const hasContextEmoji = 
      pageContent?.includes('🌍') || 
      pageContent?.includes('💉') || 
      pageContent?.includes('🗳️');
    expect(hasContextEmoji).toBe(true);
  });
});
