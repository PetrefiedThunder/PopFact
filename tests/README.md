# PopFact QA Testing Suite

This directory contains the end-to-end testing suite for the PopFact browser extension using Playwright.

## Overview

The PopFact QA suite is designed to ensure the extension is:
- **Stable**: Works reliably across different web pages
- **Performant**: Doesn't slow down page load or rendering
- **Non-breaking**: Doesn't interfere with website functionality
- **Resilient**: Handles edge cases and HTML structure changes

## Test Categories

### 1. Basic Overlay Tests (`overlay-basic.spec.ts`)
Tests fundamental overlay functionality:
- Overlay injection and visibility
- Toggle button functionality
- Status indicators
- Z-index positioning
- Non-interference with page scrolling

### 2. Fact-Checking Tests (`fact-checking.spec.ts`)
Tests the fact-checking flow with mocked responses:
- TRUE verdict display (green ✓)
- FALSE verdict display (red ✗)
- MIXED verdict display (yellow !)
- UNVERIFIED verdict display (gray ?)
- Multiple concurrent fact checks
- Claim truncation
- Loading state management

### 3. Performance Tests (`performance.spec.ts`)
Ensures performance guardrails:
- **Time to First Paint < 200ms** - Overlay appears quickly
- Frame rate > 30 FPS for smooth animations
- Memory footprint < 50MB
- No blocking of page interactions
- Efficient handling of dynamic content
- No layout thrashing

### 4. Anti-Fragility Tests (`anti-fragility.spec.ts`)
Tests resilience and robustness:
- Works with complex nested HTML structures
- Handles pages with no declarative statements
- Supports special characters and Unicode
- Efficient on very long pages
- Resistant to CSS conflicts
- Handles rapid DOM changes
- Works with iframes and shadow DOM
- Graceful error handling
- Doesn't interfere with page JavaScript

## Key Testing Strategies

### Shadow DOM Testing
While our overlay doesn't use Shadow DOM itself, we use resilient selectors:
```typescript
// ✅ Good - Stable ID selector
page.locator('#popfact-overlay')

// ✅ Good - Semantic class selector
page.locator('.popfact-item.true')

// ❌ Bad - Brittle structure selector
page.locator('div > div > span')
```

### Network Mocking
We mock API responses to avoid live API calls:
```typescript
import { mockFactCheckResponse } from './utils/network-mocking';

await mockFactCheckResponse(page, {
  claim: 'test claim',
  verdict: 'FALSE',
  explanation: 'This is a known hoax',
  confidence: 0.1,
});
```

### Performance Guardrails
Performance tests fail if thresholds are exceeded:
```typescript
// Overlay must appear within 200ms
const result = await checkOverlayPerformance(page, 200);
expect(result.passed).toBe(true);
```

## Running Tests

### Install Dependencies
```bash
npm install
npx playwright install chromium
```

### Run All Tests
```bash
npm test
```

### Run Tests in Headed Mode
```bash
npm run test:headed
```

### Run Tests with UI
```bash
npm run test:ui
```

### Debug Tests
```bash
npm run test:debug
```

### View Test Report
```bash
npm run test:report
```

### Run Specific Test File
```bash
npx playwright test tests/performance.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "performance"
```

## Test Utilities

### Network Mocking (`utils/network-mocking.ts`)
- `mockFactCheckResponse()` - Mock a single response
- `mockFactCheckResponses()` - Mock multiple responses with pattern matching
- `mockApiEndpoint()` - Mock external API endpoints

### Shadow DOM Helpers (`utils/shadow-dom.ts`)
- `getOverlay()` - Get the overlay element
- `getFactItems()` - Get all fact check items
- `waitForFactItem()` - Wait for a fact item to appear
- `toggleOverlay()` - Toggle overlay visibility

### Performance Utilities (`utils/performance.ts`)
- `checkOverlayPerformance()` - Measure time to first paint
- `measureTickerFPS()` - Measure animation frame rate
- `measureMemoryImpact()` - Check memory usage

## Test Fixtures

### Test Page (`fixtures/test-page.html`)
A sample news article with various types of claims:
- TRUE claims: "The sky is blue", "The Earth is round"
- FALSE claims: "Moon landing was fake", "Vaccines cause autism"
- MIXED claims: "Coffee is healthy"
- Dynamic content injection for testing MutationObserver

## Writing New Tests

### Example: Test a New Feature
```typescript
import { test, expect } from '@playwright/test';
import { getOverlay, waitForOverlay } from './utils/shadow-dom';
import { mockFactCheckResponse } from './utils/network-mocking';

test('should display custom verdict icon', async ({ page }) => {
  // Set up mock
  await mockFactCheckResponse(page, {
    claim: 'test',
    verdict: 'TRUE',
    explanation: 'Verified',
    confidence: 0.9,
  });
  
  // Navigate to test page
  await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
  
  // Wait for overlay
  await waitForOverlay(page);
  
  // Assert expected behavior
  const item = page.locator('.popfact-item.true').first();
  await expect(item).toBeVisible();
});
```

## CI/CD Integration

Tests are designed to run in CI environments:
- Headless by default
- Retries enabled on CI
- Artifacts captured on failure
- HTML report generation

### Example GitHub Actions Workflow
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run tests
  run: npm test

- name: Upload report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

1. **Use Resilient Selectors**: Prefer IDs and semantic classes over structural selectors
2. **Mock External Calls**: Always mock API responses to avoid live calls
3. **Test Performance**: Include timing assertions for critical paths
4. **Handle Async**: Use proper waits instead of arbitrary timeouts
5. **Test Edge Cases**: Include tests for error conditions and edge cases
6. **Keep Tests Isolated**: Each test should be independent
7. **Document Intent**: Use descriptive test names and comments

## Troubleshooting

### Tests Timeout
- Increase timeout in test: `test.setTimeout(60000)`
- Check if overlay is actually loading
- Verify extension is loaded in browser

### Extension Not Loading
- Ensure manifest.json is valid
- Check playwright.config.ts extension path
- Verify all extension files are present

### Flaky Tests
- Use proper wait conditions instead of `waitForTimeout()`
- Check for race conditions
- Ensure test isolation

### Performance Tests Failing
- Run in headed mode to see visual issues
- Check browser console for errors
- Verify host machine performance

## Future Enhancements

- [ ] Visual regression testing with screenshot comparison
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Accessibility testing (ARIA, keyboard navigation)
- [ ] Load testing with large pages (>10k elements)
- [ ] Real browser extension environment testing
- [ ] Integration with real fact-checking APIs (staging)
- [ ] Mobile device testing

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Add to appropriate test category or create new file
3. Update this README with new test descriptions
4. Ensure tests pass locally before committing
5. Keep tests fast (< 30s per test ideally)

## Support

For issues or questions about the test suite:
- Check existing test files for examples
- Review Playwright documentation: https://playwright.dev
- Open an issue on GitHub
