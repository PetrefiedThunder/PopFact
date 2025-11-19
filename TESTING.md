# PopFact Testing Guide

This guide explains how to set up, run, and maintain the PopFact QA test suite.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Chrome/Chromium browser (installed automatically by Playwright)

## Test Structure

```
tests/
├── README.md                    # Detailed testing documentation
├── fixtures/
│   └── test-page.html          # Sample page for testing
├── utils/
│   ├── network-mocking.ts      # API mocking utilities
│   ├── shadow-dom.ts           # Shadow DOM helpers
│   └── performance.ts          # Performance measurement tools
├── overlay-basic.spec.ts        # Basic overlay functionality
├── fact-checking.spec.ts        # Fact-checking integration
├── performance.spec.ts          # Performance guardrails
└── anti-fragility.spec.ts      # Resilience testing
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npx playwright test tests/performance.spec.ts
```

### Tests Matching Pattern
```bash
npx playwright test -g "overlay"
```

### With Debugging
```bash
npm run test:debug
```

### In Headed Mode (Visual Browser)
```bash
npm run test:headed
```

### With UI Mode (Interactive)
```bash
npm run test:ui
```

## Understanding Test Categories

### 1. Basic Overlay Tests
**Purpose:** Verify fundamental overlay functionality
**Key Tests:**
- Overlay injection and visibility
- Toggle button functionality
- Z-index positioning
- Non-interference with page

**Run:** `npx playwright test tests/overlay-basic.spec.ts`

### 2. Fact-Checking Tests
**Purpose:** Test fact-checking flow with mocked responses
**Key Tests:**
- TRUE/FALSE/MIXED/UNVERIFIED verdicts
- Icon colors (green ✓, red ✗, yellow !, gray ?)
- Claim truncation
- Multiple concurrent checks

**Run:** `npx playwright test tests/fact-checking.spec.ts`

### 3. Performance Tests
**Purpose:** Ensure performance guardrails
**Key Tests:**
- Time to First Paint < 200ms ⚡
- Animation FPS > 30
- Memory usage < 50MB
- No page interaction blocking

**Run:** `npx playwright test tests/performance.spec.ts`

### 4. Anti-Fragility Tests
**Purpose:** Test resilience and robustness
**Key Tests:**
- Complex nested HTML structures
- Special characters and Unicode
- CSS conflicts
- Rapid DOM changes
- Error handling

**Run:** `npx playwright test tests/anti-fragility.spec.ts`

## Network Mocking

### Why Mock?
We mock API responses to:
- Avoid live API costs during testing
- Ensure deterministic test results
- Test edge cases (errors, slow responses)
- Run tests offline

### How to Mock

```typescript
import { mockFactCheckResponse } from './utils/network-mocking.ts';

// Mock a single response
await mockFactCheckResponse(page, {
  claim: 'test claim',
  verdict: 'FALSE',
  explanation: 'This is a known hoax',
  confidence: 0.1,
});

// Mock multiple responses
const responseMap = new Map([
  ['sky is blue', {
    verdict: 'TRUE',
    explanation: 'Correct',
    confidence: 0.95,
  }],
  ['Earth is flat', {
    verdict: 'FALSE',
    explanation: 'Debunked',
    confidence: 0.05,
  }],
]);

await mockFactCheckResponses(page, responseMap);
```

## Performance Testing

### Time to First Paint
The overlay must appear within 200ms:

```typescript
const result = await checkOverlayPerformance(page, 200);
expect(result.passed).toBe(true);
expect(result.actualTime).toBeLessThan(200);
```

### Animation Frame Rate
Ticker animation should maintain 30+ FPS:

```typescript
const fps = await measureTickerFPS(page, 2000);
expect(fps).toBeGreaterThan(30);
```

### Memory Footprint
Extension should use less than 50MB:

```typescript
const memory = await measureMemoryImpact(page);
const usedMB = memory.usedJSHeapSize / 1024 / 1024;
expect(usedMB).toBeLessThan(50);
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { getOverlay, waitForOverlay } from './utils/shadow-dom.ts';
import { mockFactCheckResponse } from './utils/network-mocking.ts';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // Arrange - Set up mocks
    await mockFactCheckResponse(page, {
      claim: 'test',
      verdict: 'TRUE',
      explanation: 'Test explanation',
      confidence: 0.9,
    });
    
    // Act - Navigate to page
    await page.goto(`file://${process.cwd()}/tests/fixtures/test-page.html`);
    await waitForOverlay(page);
    
    // Assert - Verify behavior
    const overlay = getOverlay(page);
    await expect(overlay).toBeVisible();
  });
});
```

### Best Practices

1. **Use Descriptive Names**
   ```typescript
   // ✅ Good
   test('should display red icon for FALSE verdicts')
   
   // ❌ Bad
   test('test 1')
   ```

2. **Use Resilient Selectors**
   ```typescript
   // ✅ Good - Stable ID
   page.locator('#popfact-overlay')
   
   // ❌ Bad - Brittle structure
   page.locator('div > div > span')
   ```

3. **Avoid Arbitrary Timeouts**
   ```typescript
   // ✅ Good
   await page.waitForSelector('#overlay', { state: 'visible' })
   
   // ❌ Bad
   await page.waitForTimeout(5000)
   ```

4. **Keep Tests Isolated**
   - Each test should be independent
   - Don't rely on test execution order
   - Clean up state between tests

5. **Mock External Calls**
   - Always mock API responses
   - Never make live API calls in tests
   - Use deterministic test data

## CI/CD Integration

### GitHub Actions

Tests automatically run on:
- Push to main/develop branches
- Pull requests
- Manual trigger (workflow_dispatch)

View the workflow: `.github/workflows/qa-tests.yml`

### Viewing Reports

After tests run in CI:
1. Go to Actions tab on GitHub
2. Click on the workflow run
3. Download artifacts:
   - `playwright-report` - HTML test report
   - `test-results` - Raw test results

## Troubleshooting

### Extension Not Loading

**Problem:** Tests fail because extension doesn't load

**Solution:**
The current test setup requires additional configuration for browser extension testing. Tests are structured correctly but need:
- Extension context setup in Playwright config
- Proper Chrome extension loading flags
- Background script initialization

**Workaround:**
Focus on utility functions and test structure. Full integration tests require extension-aware browser context.

### Tests Timeout

**Problem:** Tests exceed timeout limit

**Causes:**
- Waiting for elements that never appear
- Network requests not mocked
- Extension not initializing

**Solutions:**
```typescript
// Increase timeout for specific test
test.setTimeout(60000);

// Use proper waits
await page.waitForSelector('#overlay', { 
  state: 'visible',
  timeout: 10000 
});

// Check element exists first
const overlay = page.locator('#overlay');
if (await overlay.count() > 0) {
  await expect(overlay).toBeVisible();
}
```

### Flaky Tests

**Problem:** Tests pass sometimes, fail others

**Common Causes:**
- Race conditions
- Not waiting for async operations
- Browser timing variations

**Solutions:**
- Use `waitFor` instead of `waitForTimeout`
- Add proper state checks
- Use `{ state: 'attached' | 'visible' | 'hidden' }`

### Performance Tests Failing

**Problem:** Performance thresholds not met

**Debug Steps:**
```bash
# Run in headed mode to see visually
npm run test:headed tests/performance.spec.ts

# Check browser console
# (Add in test)
page.on('console', msg => console.log('Browser:', msg.text()));

# Measure timing manually
const start = Date.now();
await someAction();
console.log('Took:', Date.now() - start, 'ms');
```

## Test Maintenance

### When to Update Tests

1. **Feature Changes**
   - New overlay features → Add new tests
   - Changed behavior → Update assertions
   - Removed features → Remove old tests

2. **UI Changes**
   - New selectors → Update shadow-dom.ts utilities
   - Changed class names → Update locators
   - New animations → Update performance expectations

3. **API Changes**
   - New response format → Update mocking utilities
   - Additional fields → Update MockFactCheckResponse interface

### Keeping Tests Fast

- Use mocks for all external calls
- Minimize page loads (reuse pages when possible)
- Run tests in parallel (Playwright default)
- Keep test data small

### Code Review Checklist

- [ ] Tests have descriptive names
- [ ] Uses resilient selectors (IDs, semantic classes)
- [ ] Mocks all external API calls
- [ ] No arbitrary `waitForTimeout` calls
- [ ] Proper error messages in assertions
- [ ] Tests are independent and isolated
- [ ] Performance tests have reasonable thresholds

## Advanced Usage

### Custom Fixtures

Create custom fixtures for repeated setup:

```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await mockFactCheckResponse(page, defaultResponse);
    await page.goto(testPageUrl);
    await use(page);
  },
});
```

### Parallel Execution

Control test parallelism:

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 1 : 4,
  fullyParallel: true,
});
```

### Custom Reporters

Add custom reporters:

```typescript
// playwright.config.ts
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results.json' }],
  ['junit', { outputFile: 'junit.xml' }],
],
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Test Best Practices](https://playwright.dev/docs/best-practices)

## Support

For questions or issues:
1. Check this guide
2. Review test examples in `tests/` directory
3. Check Playwright docs
4. Open an issue on GitHub

---

**Last Updated:** November 2025
**Maintained By:** PopFact QA Team
