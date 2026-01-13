# Circular Dependencies Analysis

**Generated:** 2026-01-13
**Status:** No circular dependencies detected

---

## Summary

The PopFact codebase has a clean dependency structure with **no circular dependencies**.

### Analysis Methodology

1. Parsed all source files for import/require statements
2. Built directed graph of dependencies
3. Ran cycle detection algorithm (Tarjan's SCC)
4. Result: All strongly connected components have size 1 (no cycles)

---

## Dependency Flow

```
Extension Layer (No cycles - isolated files)
├── manifest.json (hub)
│   ├── background.js (service worker)
│   ├── content.js (content script)
│   ├── overlay.css
│   └── popup.html
│       ├── popup.css
│       └── popup.js

Test Layer (Acyclic DAG)
├── tests/*.spec.ts
│   ├── tests/utils/shadow-dom.ts
│   ├── tests/utils/inject-extension.ts
│   ├── tests/utils/network-mocking.ts
│   └── tests/utils/performance.ts
└── tests/fixtures/
    ├── extension-fixtures.ts
    └── test-page.html
```

---

## Why No Cycles Exist

### 1. Extension Architecture Isolation

The Chrome extension architecture naturally prevents cycles:

- **background.js** - Service worker, isolated execution context
- **content.js** - Content script, isolated execution context
- **popup.js** - Popup script, isolated execution context

These files communicate only via Chrome's message-passing API (`chrome.runtime.sendMessage`), not through module imports.

**Evidence:**
```javascript
// background.js:122-123
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... handles messages from content.js
```

```javascript
// content.js:291-295
chrome.runtime.sendMessage({
  type: 'FACT_CHECK_REQUEST',
  claim: claim,
  source: source,
  url: sanitizedUrl,
```

### 2. Test Utility DAG

Test utilities follow a strict hierarchy:

```
spec files → utils → @playwright/test
                  → Node built-ins (fs, path)
```

No utility imports another utility, preventing potential cycles.

---

## Potential Future Risks

While no cycles exist currently, these patterns could introduce cycles if modified:

### Risk 1: Shared Type Definitions

If type definitions are extracted to a shared file that imports from source files:

```
// AVOID THIS PATTERN
types.ts → background.js → types.ts (cycle!)
```

**Recommendation:** Keep types inline or in a types-only file with no runtime imports.

### Risk 2: Test Fixture Cross-Imports

If test fixtures start importing from spec files:

```
// AVOID THIS PATTERN
smoke.spec.ts → extension-fixtures.ts → smoke.spec.ts (cycle!)
```

**Recommendation:** Maintain unidirectional flow: specs → fixtures → utilities.

### Risk 3: Background/Content Shared Code

If shared utilities are introduced:

```
// AVOID THIS PATTERN
shared-utils.js → background.js
shared-utils.js → content.js
background.js → shared-utils.js (OK individually, but watch for transitive deps)
```

**Recommendation:** Use Chrome message-passing for cross-context communication. If shared code is needed, keep it stateless and import-free.

---

## Verification Commands

Run these to verify no cycles in future:

```bash
# Using madge (install: npm i -g madge)
npx madge --circular background.js content.js popup.js

# Expected output: No circular dependency found!
```

---

## Conclusion

**No action required.** The codebase maintains excellent separation of concerns with no circular dependencies. The extension architecture and test structure are both cycle-free by design.
