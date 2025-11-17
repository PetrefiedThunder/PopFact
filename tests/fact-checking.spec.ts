/**
 * Fact Checking Integration Tests with Mocked Responses
 * 
 * Tests the end-to-end flow of fact-checking with mocked API responses
 */

import { test, expect } from '@playwright/test';
import { 
  getFactItems,
  getFactItemsByCategory,
  waitForFactItem,
  getFactItemText,
  waitForLoadingToComplete
} from './utils/shadow-dom.ts';
import { mockFactCheckResponse, mockFactCheckResponses } from './utils/network-mocking.ts';

test.describe('PopFact Fact-Checking - Mocked Responses', () => {
  
  test('should display fact check result with TRUE verdict', async ({ page }) => {
    // Set up mock response for TRUE claims
    await mockFactCheckResponse(page, {
      claim: 'test claim',
      verdict: 'TRUE',
      explanation: 'This claim is supported by reliable sources',
      confidence: 0.9,
    });
    
    // Navigate to test page
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Wait for a fact item to appear
    await waitForFactItem(page, 'true', 15000);
    
    // Verify TRUE item exists
    const trueItems = getFactItemsByCategory(page, 'true');
    await expect(trueItems.first()).toBeVisible();
    
    // Verify it has the correct icon
    const icon = await trueItems.first().locator('.popfact-item-icon').textContent();
    expect(icon).toContain('✓');
  });
  
  test('should display fact check result with FALSE verdict', async ({ page }) => {
    // Set up mock response for FALSE claims
    await mockFactCheckResponse(page, {
      claim: 'test claim',
      verdict: 'FALSE',
      explanation: 'This claim contradicts established facts',
      confidence: 0.1,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Wait for FALSE fact item
    await waitForFactItem(page, 'false', 15000);
    
    // Verify FALSE item exists with red styling
    const falseItems = getFactItemsByCategory(page, 'false');
    await expect(falseItems.first()).toBeVisible();
    
    // Verify icon
    const icon = await falseItems.first().locator('.popfact-item-icon').textContent();
    expect(icon).toContain('✗');
  });
  
  test('should display fact check result with MIXED verdict', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'test claim',
      verdict: 'MIXED',
      explanation: 'This claim contains both accurate and inaccurate elements',
      confidence: 0.5,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    await waitForFactItem(page, 'mixed', 15000);
    
    const mixedItems = getFactItemsByCategory(page, 'mixed');
    await expect(mixedItems.first()).toBeVisible();
    
    const icon = await mixedItems.first().locator('.popfact-item-icon').textContent();
    expect(icon).toContain('!');
  });
  
  test('should display fact check result with UNVERIFIED verdict', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'test claim',
      verdict: 'UNVERIFIED',
      explanation: 'Insufficient evidence to verify this claim',
      confidence: 0.5,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    await waitForFactItem(page, 'unverified', 15000);
    
    const unverifiedItems = getFactItemsByCategory(page, 'unverified');
    await expect(unverifiedItems.first()).toBeVisible();
    
    const icon = await unverifiedItems.first().locator('.popfact-item-icon').textContent();
    expect(icon).toContain('?');
  });
  
  test('should handle multiple different fact checks', async ({ page }) => {
    // Set up multiple mock responses
    const responseMap = new Map<string, any>([
      ['sky is blue', {
        claim: 'sky is blue',
        verdict: 'TRUE',
        explanation: 'Correct: due to Rayleigh scattering',
        confidence: 0.95,
      }],
      ['Earth is flat', {
        claim: 'Earth is flat',
        verdict: 'FALSE',
        explanation: 'False: Earth is spherical',
        confidence: 0.05,
      }],
      ['coffee is healthy', {
        claim: 'coffee is healthy',
        verdict: 'MIXED',
        explanation: 'Partially true: depends on consumption',
        confidence: 0.5,
      }],
    ]);
    
    await mockFactCheckResponses(page, responseMap);
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Wait for fact items to appear
    await page.waitForTimeout(3000);
    
    // Verify we have multiple fact items
    const allItems = getFactItems(page);
    const count = await allItems.count();
    expect(count).toBeGreaterThan(0);
  });
  
  test('should truncate long claims in the ticker', async ({ page }) => {
    const longClaim = 'This is a very long claim that should be truncated because it exceeds the maximum length that we want to display in the ticker to keep it readable and not overwhelming for users';
    
    await mockFactCheckResponse(page, {
      claim: longClaim,
      verdict: 'TRUE',
      explanation: 'Test explanation',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const text = await item.locator('.popfact-claim').textContent();
    
    // Should be truncated to ~80 chars with ellipsis
    expect(text?.length).toBeLessThanOrEqual(83); // 80 + '...'
  });
  
  test('should display both claim and explanation', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'The sky is blue',
      verdict: 'TRUE',
      explanation: 'Confirmed by atmospheric science',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForFactItem(page, 'true', 15000);
    
    const item = getFactItemsByCategory(page, 'true').first();
    const { claim, verdict } = await getFactItemText(item);
    
    // Should have claim text
    expect(claim.length).toBeGreaterThan(0);
    
    // Should have explanation/verdict
    expect(verdict.length).toBeGreaterThan(0);
  });
  
  test('should remove loading message after first fact check', async ({ page }) => {
    await mockFactCheckResponse(page, {
      claim: 'test',
      verdict: 'TRUE',
      explanation: 'test',
      confidence: 0.9,
    });
    
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    
    // Wait for fact items
    await waitForFactItem(page, undefined, 15000);
    
    // Loading message should be gone
    const loading = page.locator('.popfact-loading');
    await expect(loading).not.toBeVisible();
  });
});
