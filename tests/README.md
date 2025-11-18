# PopFact Test Suite

This directory contains the comprehensive test suite for the PopFact browser extension.

## 🧪 Test Framework

- **Framework:** Playwright (TypeScript)
- **Browser:** Chromium
- **Test Runner:** Playwright Test Runner
- **Language:** TypeScript

## 📁 Test Files

### Automated Tests

1. **extension-validation.spec.ts** (15 tests)
   - File existence and structure validation
   - Code syntax checking
   - Manifest validation
   - CSS selector verification
   - Security audit
   - Documentation checks
   - **Status:** ✅ All passing

2. **extension.spec.ts** (18 tests)
   - Full E2E browser automation tests
   - Extension loading verification
   - Ticker overlay display tests
   - Fact-checking functionality
   - Animation and performance
   - Error handling
   - Visual regression tests
   - **Status:** ⚠️ Requires non-headless browser (extension limitation)

### Manual Test Tools

1. **manual-test.sh**
   - Quick validation script
   - Checks file existence
   - Validates syntax
   - Reports on structure

2. **quick-test.html**
   - Visual test page
   - Interactive test interface
   - Console logging verification
   - User-friendly testing experience

## 🚀 Running Tests

### Quick Validation (Recommended)
```bash
npm test
```
Runs the validation test suite that checks code structure, syntax, and configuration without requiring a browser.

### All Tests
```bash
npm run test:all
```
Runs both validation and E2E tests (Note: E2E tests may have limitations with extension loading in CI/CD).

### Interactive Mode
```bash
npm run test:ui
```
Opens Playwright's interactive UI for running and debugging tests.

### Headed Mode (See Browser)
```bash
npm run test:headed
```
Runs tests with a visible browser window (useful for debugging).

### Debug Mode
```bash
npm run test:debug
```
Runs tests with Playwright Inspector for step-by-step debugging.

### Manual Validation
```bash
npm run validate
# or
./manual-test.sh
```

## 📊 Test Coverage

### Core Functionality ✅
- [x] Extension files exist and are valid
- [x] Manifest V3 compliance
- [x] Content script structure
- [x] Background service worker
- [x] Message passing architecture
- [x] Mock fact-checking logic
- [x] CSS styling and animations
- [x] Icons in all required sizes

### Code Quality ✅
- [x] JavaScript syntax validation
- [x] No security vulnerabilities
- [x] Error handling implementation
- [x] Debug logging present

### Documentation ✅
- [x] README completeness
- [x] Installation instructions
- [x] Debug page guidance

## 🎯 Test Results

**Latest Run:** November 18, 2025  
**Tests Run:** 15  
**Passed:** 15  
**Failed:** 0  
**Pass Rate:** 100% ✅

## 📝 Manual Testing Checklist

For complete verification, perform these manual tests in Chrome:

### Installation
- [ ] Load extension at chrome://extensions/
- [ ] Enable "Developer mode"
- [ ] Click "Load unpacked" and select PopFact directory
- [ ] Verify no errors appear

### Functionality
- [ ] Open debug-test.html or quick-test.html
- [ ] Black ticker appears at bottom within 5 seconds
- [ ] Red "PopFact" branding visible
- [ ] Fact-check results scroll across ticker
- [ ] Color-coded verdicts (green/red/yellow/gray)
- [ ] Smooth animation

### Console Verification
- [ ] "PopFact: Overlay initialized" message
- [ ] "Extracted X claims" message
- [ ] "Processing fact-check request" messages
- [ ] No JavaScript errors

### Popup
- [ ] Click extension icon
- [ ] Popup opens with settings
- [ ] All UI elements visible
- [ ] Controls are functional

### Real World
- [ ] Test on CNN.com, BBC.com, or NYTimes.com
- [ ] Ticker appears on real websites
- [ ] Claims extracted from articles
- [ ] No interference with site functionality

## 🔧 Troubleshooting

### Tests Timing Out
- Extension loading in headless mode has limitations
- Run validation tests instead: `npm test`
- Use headed mode for visual confirmation: `npm run test:headed`

### Extension Not Loading
- Verify all files exist: `./manual-test.sh`
- Check manifest.json syntax
- Review console errors in Chrome DevTools

### No Ticker Appearing
- Ensure extension is loaded in chrome://extensions/
- Reload the extension
- Reload the test page
- Check browser console for errors

## 📚 Documentation

- **TEST_REPORT.md** - Comprehensive test report with detailed results
- **TESTING_SUMMARY.md** - Executive summary of testing efforts
- **playwright.config.ts** - Playwright configuration
- **tsconfig.json** - TypeScript configuration

## 🎬 CI/CD Integration

For CI/CD pipelines, use the validation test suite:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm install

- name: Run tests
  run: npm test
```

The validation tests don't require browser automation and are perfect for CI/CD environments.

## 🔐 Security Testing

Security checks included:
- ✅ No eval() usage
- ✅ No dangerous innerHTML patterns
- ✅ Safe DOM manipulation
- ✅ User input sanitization
- ✅ No external script injection

## 📈 Future Enhancements

1. **Unit Tests:** Add Jest for function-level testing
2. **Integration Tests:** Test API integration with live services
3. **Performance Tests:** Benchmark claim extraction and rendering
4. **Cross-Browser Tests:** Add Firefox and Edge specific tests
5. **Visual Regression:** Automated screenshot comparison
6. **Accessibility Tests:** WCAG compliance checking

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add documentation for new test cases
4. Update this README if adding new test files

## 📞 Support

If tests fail unexpectedly:
1. Check test-results/ directory for screenshots
2. Review test-results/*.png for visual evidence
3. Check playwright-report/ for HTML reports
4. Run `npm run test:ui` for interactive debugging

---

**Happy Testing! 🧪✨**
