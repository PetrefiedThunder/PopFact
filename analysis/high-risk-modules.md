# High-Risk Modules Analysis

**Generated:** 2026-01-13
**Risk Scale:** LOW | MEDIUM | HIGH | CRITICAL

---

## Executive Summary

| Risk Level | Count | Files |
|------------|-------|-------|
| CRITICAL   | 1     | manifest.json |
| HIGH       | 3     | content.js, background.js, tests/utils/shadow-dom.ts |
| MEDIUM     | 4     | overlay.css, tests/utils/inject-extension.ts, tests/fixtures/test-page.html, tests/extension.spec.ts |
| LOW        | 15+   | All other files |

---

## CRITICAL Risk Files

### 1. manifest.json

**Risk Level:** CRITICAL
**Coupling Score:** 75/100
**Blast Radius:** ALL extension functionality

**Why Critical:**
- Single point of failure for entire extension
- Connects all components: background.js, content.js, popup.html, overlay.css
- Chrome Web Store validation depends on this file
- Any syntax error = extension fails to load

**Direct Dependents (7):**
```
background.js (service_worker)
content.js (content_scripts)
overlay.css (content_scripts)
popup.html (action.default_popup)
disclaimer.html (web_accessible_resources)
icons/icon*.png (icons, action.default_icon)
```

**Transitive Impact:**
- Affects 100% of extension functionality
- All 8 test files reference manifest indirectly

**Code Evidence:**
```json
// manifest.json:20-30
"background": {
  "service_worker": "background.js"  // CRITICAL PATH
},
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],           // CRITICAL PATH
    "css": ["overlay.css"],         // CRITICAL PATH
```

**Risk Mitigation:**
1. Never edit manually without validation
2. Use JSON schema validation
3. Test in unpacked mode before publishing
4. Maintain version control discipline

---

## HIGH Risk Files

### 2. content.js

**Risk Level:** HIGH
**Coupling Score:** 45/100
**Lines of Code:** 504
**Blast Radius:** All page-level functionality

**Why High Risk:**
- Injects DOM elements into every page user visits
- Contains all UI rendering logic
- Mutation observer monitors entire page DOM
- Direct coupling to Chrome APIs and document object

**Direct Dependents (3):**
```
manifest.json (loads this file)
tests/utils/inject-extension.ts (reads file content)
tests/extension-validation.spec.ts (validates structure)
```

**Test Coverage:**
- 6 test files exercise this code
- ~150 test assertions

**Code Evidence - Side Effects:**
```javascript
// content.js:496-503 - Side effect on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopFactOverlay();  // SIDE EFFECT
  });
} else {
  new PopFactOverlay();    // SIDE EFFECT
}
```

**Code Evidence - DOM Coupling:**
```javascript
// content.js:80-84 - Direct DOM manipulation
document.body.appendChild(this.overlay);
document.body.appendChild(toggleBtn);
this.tickerScroll = document.getElementById('popfact-ticker-scroll');
```

**Anti-Patterns Detected:**
1. **God Class:** PopFactOverlay handles UI, DOM parsing, message passing
2. **Side Effects on Import:** Immediately creates instance

**Risk Mitigation:**
1. Consider splitting into smaller modules:
   - `overlay-ui.js` - DOM manipulation
   - `claim-extractor.js` - Text parsing
   - `message-handler.js` - Chrome API communication
2. Add defensive coding for missing document.body
3. Implement cleanup/teardown methods

---

### 3. background.js

**Risk Level:** HIGH
**Coupling Score:** 35/100
**Lines of Code:** 613
**Blast Radius:** All fact-checking functionality

**Why High Risk:**
- Contains all business logic (fact-checking, caching, rate limiting)
- Multiple classes in single file (FactCheckService, MockProvider, OpenKnowledgeProvider)
- External API calls (Wikipedia, Twitter via Jina)
- State management (cache, queue, settings)

**Direct Dependents (3):**
```
manifest.json (loads as service worker)
tests/extension.spec.ts (validates behavior)
tests/extension-validation.spec.ts (validates structure)
```

**Code Evidence - Multiple Responsibilities:**
```javascript
// background.js - 3 classes in one file
class FactCheckService {           // Line 35 - 369 lines
class MockProvider {               // Line 371 - 455 lines
class OpenKnowledgeProvider {      // Line 458 - 610 lines
```

**Code Evidence - Bug Found:**
```javascript
// background.js:246 - BUG: enrichedResult used before definition
this.cache.set(cacheKey, enrichedResult);  // enrichedResult is undefined here!

// enrichedResult is defined at line 249, AFTER this line
const enrichedResult = {
  ...result,
```

**Anti-Patterns Detected:**
1. **Variable Used Before Definition:** Line 246 (see above)
2. **God Module:** 613 lines, 3 classes
3. **Duplicate Code:** Similar rate limiting logic in multiple places

**Risk Mitigation:**
1. **CRITICAL:** Fix bug at line 246 - move cache.set after enrichedResult definition
2. Split into separate files:
   - `fact-check-service.js`
   - `providers/mock-provider.js`
   - `providers/open-knowledge-provider.js`
3. Extract rate limiting to shared utility

---

### 4. tests/utils/shadow-dom.ts

**Risk Level:** HIGH
**Coupling Score:** 60/100
**Lines of Code:** 116
**Blast Radius:** 5 test files (38% of test suite)

**Why High Risk:**
- Most imported test utility
- Changes affect all overlay-related tests
- Central abstraction for DOM queries

**Imported By (5):**
```
tests/overlay-basic.spec.ts
tests/fact-checking.spec.ts
tests/anti-fragility.spec.ts
tests/enhanced-context.spec.ts
tests/performance.spec.ts
```

**Exports (12):**
```typescript
getOverlay, getTickerScroll, getToggleButton, getFactItems,
getFactItemsByCategory, getStatusIndicator, waitForOverlay,
waitForFactItem, isOverlayHidden, toggleOverlay,
getFactItemText, waitForLoadingToComplete
```

**Risk Mitigation:**
1. High test coverage for this file itself
2. Consider splitting by concern:
   - `locators.ts` - DOM query functions
   - `waiters.ts` - Async wait functions
   - `actions.ts` - User interaction helpers

---

## MEDIUM Risk Files

### 5. overlay.css

**Risk Level:** MEDIUM
**Coupling Score:** 30/100
**Lines of Code:** 355
**Blast Radius:** All visual functionality

**Why Medium Risk:**
- Visual appearance of overlay
- Animation definitions (ticker scroll)
- CSS specificity conflicts with host pages possible

**Code Evidence - High z-index (potential conflict):**
```css
/* overlay.css:11-12 */
z-index: 2147483647;  /* Max 32-bit integer */
```

**Code Evidence - Duplicate keyframes:**
```css
/* overlay.css:73-80 */
@keyframes scroll-ticker { ... }

/* overlay.css:99-106 */
@keyframes scroll-left { ... }  /* DUPLICATE - unused */

/* overlay.css:315-322 */
@keyframes pulse { ... }  /* DUPLICATE definition */
```

**Anti-Patterns Detected:**
1. **Dead Code:** `@keyframes scroll-left` defined but never used
2. **Duplicate Definition:** `@keyframes pulse` defined twice

---

### 6. tests/utils/inject-extension.ts

**Risk Level:** MEDIUM
**Coupling Score:** 55/100
**Blast Radius:** 4 test files

**Why Medium Risk:**
- Reads content.js and overlay.css at runtime
- Creates mock Chrome API
- Central to test injection strategy

**Code Evidence - File reads:**
```typescript
// inject-extension.ts:19-24
const contentScriptPath = path.join(process.cwd(), 'content.js');
const contentScript = readFileSync(contentScriptPath, 'utf-8');

const cssPath = path.join(process.cwd(), 'overlay.css');
const css = readFileSync(cssPath, 'utf-8');
```

---

### 7. tests/extension.spec.ts

**Risk Level:** MEDIUM
**Coupling Score:** 40/100
**Lines of Code:** 524
**Blast Radius:** Core extension validation

**Why Medium Risk:**
- Largest test file (524 lines)
- Full integration test suite
- Creates browser contexts with extensions

**Anti-Patterns Detected:**
1. **God Test File:** 524 lines, 10+ test suites
2. **Heavy Setup:** Each test launches full browser

---

## Risk Heatmap

```
                    Coupling Score
                Low (0-30)  Med (31-60)  High (61-100)
             ┌───────────┬────────────┬────────────┐
  Blast      │ popup.js  │ content.js │ manifest   │  Critical
  Radius     │ popup.css │ background │            │
  High       │           │ shadow-dom │            │
             ├───────────┼────────────┼────────────┤
  Med        │disclaimer │ overlay.css│            │  High
             │ perf.ts   │ inject.ts  │            │
             │           │ test-page  │            │
             ├───────────┼────────────┼────────────┤
  Low        │ All other │            │            │  Low-Med
             │ files     │            │            │
             └───────────┴────────────┴────────────┘
```

---

## Recommended Actions

### Immediate (P0)
1. **Fix bug in background.js:246** - Variable used before definition

### Short-term (P1)
1. Remove duplicate CSS keyframes in overlay.css
2. Consider splitting content.js into smaller modules

### Medium-term (P2)
1. Split background.js into multiple provider files
2. Add JSON schema validation for manifest.json changes

### Long-term (P3)
1. Consider module bundler (Rollup/Webpack) for better code organization
2. Implement E2E monitoring for high-risk paths
