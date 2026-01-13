# Refactoring Priorities

**Generated:** 2026-01-13
**Priority Scale:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

---

## Executive Summary

| Priority | Issues | Effort | Impact |
|----------|--------|--------|--------|
| P0 Critical | 1 | 5 min | Prevents runtime bug |
| P1 High | 3 | 2-4 hrs | Improves stability |
| P2 Medium | 5 | 1-2 days | Improves maintainability |
| P3 Low | 4 | 1 week+ | Improves architecture |

---

## P0 - Critical (Fix Immediately)

### 1. Bug: Variable Used Before Definition

**File:** `background.js:246`
**Impact:** Runtime error when cache is full
**Effort:** 5 minutes

**Current Code (BUGGY):**
```javascript
// background.js:239-256
try {
  const result = await this.performFactCheck(request.claim, {
    source: request.source,
    url: request.url
  });

  // Cache result with LRU eviction
  const cacheKey = this.getCacheKey(request.claim);
  if (this.cache.size >= this.cacheMaxSize) {
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }
  this.cache.set(cacheKey, enrichedResult);  // BUG: enrichedResult undefined!

  // Enrich result with request metadata and active provider
  const enrichedResult = {  // Defined here, AFTER use
    ...result,
```

**Fixed Code:**
```javascript
try {
  const result = await this.performFactCheck(request.claim, {
    source: request.source,
    url: request.url
  });

  // Enrich result with request metadata and active provider (MOVED UP)
  const enrichedResult = {
    ...result,
    claim: request.claim,
    sourceType: request.source,
    url: request.url,
    provider: this.settings.apiProvider,
    timestamp: Date.now()
  };

  // Cache result with LRU eviction (NOW AFTER enrichedResult)
  const cacheKey = this.getCacheKey(request.claim);
  if (this.cache.size >= this.cacheMaxSize) {
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }
  this.cache.set(cacheKey, enrichedResult);  // Now works correctly
```

---

## P1 - High Priority (This Sprint)

### 2. Dead Code Block in content.js

**File:** `content.js:202-225`
**Impact:** Code confusion, references undefined `bar` variable
**Effort:** 15 minutes

**Action:** Delete lines 202-225 entirely

```javascript
// DELETE THIS ENTIRE BLOCK (content.js:202-225)
const brand = document.createElement('div');
brand.className = 'popfact-brand';
// ... (entire block through line 225)
```

---

### 3. Duplicate CSS Definitions

**File:** `overlay.css`
**Impact:** Unpredictable styling, larger file size
**Effort:** 15 minutes

**Actions:**
1. Delete lines 99-106 (`@keyframes scroll-left`)
2. Delete lines 315-322 (duplicate `@keyframes pulse`)
3. Delete lines 82-92 (`.popfact-brand` unused class)

---

### 4. Duplicate Message Handler

**File:** `background.js:142-145`
**Impact:** Dead code confusion
**Effort:** 5 minutes

**Action:** Delete the duplicate CLEAR_CACHE handler

```javascript
// DELETE these lines (background.js:142-145)
} else if (message.type === 'CLEAR_CACHE') {
  this.clearCache();
  sendResponse({ success: true });
}
```

---

## P2 - Medium Priority (Next Sprint)

### 5. God Class: PopFactOverlay

**File:** `content.js`
**Impact:** Hard to test, hard to maintain
**Effort:** 4-6 hours

**Current State:**
- 504 lines
- Single class handles: UI, DOM parsing, message passing, text extraction

**Recommended Split:**
```
content.js (orchestrator - 100 lines)
├── overlay-ui.js (UI creation, toggle, animations - 150 lines)
├── claim-extractor.js (text parsing, filtering - 100 lines)
├── message-handler.js (Chrome API communication - 80 lines)
└── ticker-renderer.js (fact item rendering - 100 lines)
```

**Benefits:**
- Each module testable independently
- Clear separation of concerns
- Easier to debug specific functionality

---

### 6. God Module: background.js

**File:** `background.js`
**Impact:** 613 lines, 3 classes in one file
**Effort:** 2-3 hours

**Current State:**
```javascript
class FactCheckService { }      // 334 lines
class MockProvider { }          // 85 lines
class OpenKnowledgeProvider { } // 152 lines
```

**Recommended Split:**
```
background.js (entry point - 50 lines)
├── services/fact-check-service.js (main service)
├── providers/mock-provider.js
├── providers/open-knowledge-provider.js
├── utils/rate-limiter.js
└── config/trusted-sources.js
```

---

### 7. Test File Organization

**File:** `tests/extension.spec.ts`
**Impact:** 524 lines, hard to navigate
**Effort:** 2-3 hours

**Recommended Split:**
```
tests/
├── extension/
│   ├── loading.spec.ts
│   ├── ticker-display.spec.ts
│   ├── fact-checking.spec.ts
│   ├── animation.spec.ts
│   └── error-handling.spec.ts
└── utils/
    └── (existing utils)
```

---

### 8. Inconsistent Test Assertions

**Files:** Various test files
**Impact:** Tests may pass incorrectly
**Effort:** 1-2 hours

**Example Issues:**

```typescript
// tests/enhanced-context.spec.ts:401 - Incorrect color check
const bgColor = await badge.evaluate((el) => {
  return window.getComputedStyle(el).backgroundColor;
});
// CSS color #4caf50 = rgb(76, 175, 80)
expect(bgColor).toContain('76, 175, 80');  // This checks for rgba format
// But badge has 30% opacity: rgba(76, 175, 80, 0.3)
// The 0.3 converts differently!
```

**Action:** Review all color assertions, use consistent format

---

### 9. Missing TypeScript for Source Files

**Files:** `background.js`, `content.js`, `popup.js`
**Impact:** No type safety, harder to refactor
**Effort:** 1 day

**Recommendation:**
1. Rename to `.ts` files
2. Add type annotations
3. Configure tsconfig.json to compile source files
4. Add build step to package.json

---

## P3 - Low Priority (Backlog)

### 10. Documentation Consolidation

**Issue:** 23+ markdown files, many potentially stale
**Effort:** 2-4 hours

**Recommended Structure:**
```
docs/
├── README.md (main entry)
├── INSTALLATION.md
├── DEVELOPMENT.md
├── TESTING.md
├── API.md
└── CHANGELOG.md (keep at root)
```

---

### 11. Build System

**Issue:** No build/bundle step, raw JS files
**Effort:** 4-8 hours

**Benefits of Adding:**
- Module bundling (can use ES6 imports)
- Minification for production
- Source maps for debugging
- Type checking with TypeScript

**Recommended Stack:**
- Rollup (lightweight, extension-friendly)
- Or Vite (modern, fast)

---

### 12. Test Coverage Reporting

**Issue:** No visibility into actual coverage
**Effort:** 2 hours

**Action:**
```bash
npm install -D @playwright/test@latest
# Add to playwright.config.ts:
# coverage: { enabled: true }
```

---

### 13. Orphan File Cleanup

**Files:** See dead-code-candidates.md
**Effort:** 1 hour

**Actions:**
1. Delete `tests/fixtures/extension-fixtures.ts` (unused)
2. Delete `quick-test.html` (redundant)
3. Move `icons/create-placeholder-icons.js` to `scripts/`
4. Review and archive stale documentation

---

## Implementation Roadmap

### Week 1 (Critical + High)
- [ ] Fix background.js:246 bug (P0)
- [ ] Delete dead code in content.js (P1)
- [ ] Clean up duplicate CSS (P1)
- [ ] Remove duplicate handler (P1)

### Week 2-3 (Medium)
- [ ] Split content.js into modules (P2)
- [ ] Split background.js into modules (P2)
- [ ] Fix test color assertions (P2)

### Week 4+ (Low, as time permits)
- [ ] Add TypeScript to source files (P2)
- [ ] Reorganize test files (P2)
- [ ] Consolidate documentation (P3)
- [ ] Add build system (P3)
- [ ] Add coverage reporting (P3)
- [ ] Clean up orphan files (P3)

---

## Technical Debt Score

**Current Score:** 35/100 (Moderate)

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Code Quality | 25% | 30 | Bugs, dead code |
| Architecture | 25% | 40 | God classes/modules |
| Testing | 20% | 50 | Good coverage, some issues |
| Documentation | 15% | 20 | Over-documented, disorganized |
| Build/Tooling | 15% | 30 | No build step, raw JS |

**Target Score:** 70/100 after P0-P2 items addressed
