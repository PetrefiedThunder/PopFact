# Dead Code Candidates

**Generated:** 2026-01-13
**Analysis Type:** Orphan files, unused exports, unreachable code

---

## Summary

| Category | Count | Action Required |
|----------|-------|-----------------|
| Orphan Files | 4 | Review for deletion |
| Unused CSS | 3 | Delete safely |
| Unused Code | 2 | Investigate |
| Unreferenced Docs | 10+ | Review relevance |

---

## Orphan Files (No Importers AND Minimal Internal Imports)

### 1. tests/fixtures/extension-fixtures.ts

**Location:** `/home/user/PopFact/tests/fixtures/extension-fixtures.ts`
**Lines:** 62
**Status:** ORPHAN - defined but never imported

**Evidence:**
```typescript
// Exports test fixture and expect, but no spec file imports them
export const test = base.extend<ExtensionFixtures>({ ... });
export { expect } from '@playwright/test';
```

**Grep Results:**
```bash
$ grep -r "extension-fixtures" tests/
# No results - file is never imported
```

**Recommendation:** DELETE or integrate into test suite
- If persistent context testing is needed, import this fixture
- Otherwise, remove to reduce maintenance burden

---

### 2. icons/create-placeholder-icons.js

**Location:** `/home/user/PopFact/icons/create-placeholder-icons.js`
**Status:** ORPHAN - utility script, not part of extension

**Evidence:**
- Not referenced in package.json scripts
- Not referenced in manifest.json
- Appears to be one-time generation script

**Recommendation:** KEEP but move to `/scripts/` directory or document usage in README

---

### 3. demo-enhanced-ticker.html

**Location:** `/home/user/PopFact/demo-enhanced-ticker.html`
**Status:** ORPHAN - demo file, not part of extension or tests

**Evidence:**
- Not referenced in manifest.json
- Not referenced in any test file
- Likely used for manual visual testing only

**Recommendation:** Either:
- DELETE if no longer needed for demos
- DOCUMENT its purpose in README
- MOVE to `/demos/` directory

---

### 4. quick-test.html

**Location:** `/home/user/PopFact/quick-test.html`
**Status:** ORPHAN - test page, redundant with debug-test.html

**Evidence:**
- Not referenced in any automated test
- debug-test.html serves similar purpose with better documentation

**Recommendation:** DELETE - consolidate with debug-test.html

---

## Unused CSS Rules

### 1. @keyframes scroll-left (overlay.css:99-106)

**Code:**
```css
/* overlay.css:99-106 - UNUSED */
@keyframes scroll-left {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}
```

**Evidence:**
```bash
$ grep -r "scroll-left" .
overlay.css:@keyframes scroll-left {
# Only definition, no usage
```

**Used Animation:** `scroll-ticker` (line 73)
**Recommendation:** DELETE - duplicate of scroll-ticker with different name

---

### 2. Duplicate @keyframes pulse (overlay.css:315-322)

**Code:**
```css
/* overlay.css:221-228 - First definition (correct) */
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* overlay.css:315-322 - Second definition (OVERRIDES first incorrectly) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  100% { transform: translateX(-50%); }  /* Invalid: 100% defined twice */
}
```

**Issue:** Second definition has invalid CSS (100% defined twice) and overrides the correct pulse animation

**Recommendation:** DELETE lines 315-322 - keep first definition only

---

### 3. .popfact-brand (overlay.css:82-92)

**Code:**
```css
/* overlay.css:82-92 */
.popfact-brand {
  flex: 0 0 auto;
  padding: 0 12px;
  background: #c62828;
  /* ... */
}
```

**Evidence:**
```bash
$ grep -r "popfact-brand" .
overlay.css:.popfact-brand {
tests/extension.spec.ts:const brandLabel = await page.$('.popfact-brand');
```

**Issue:** Class defined in CSS but element with this class is NOT created in content.js
- content.js creates `.popfact-ticker-label` instead

**Recommendation:** DELETE - class is unused. Tests that reference it will fail.

---

## Unused JavaScript Code

### 1. Unreachable Code in content.js:202-225

**Code:**
```javascript
// content.js:202-225 - Code block that creates elements but is inside getTextNodes()
// This code appears after a return statement path and creates orphaned elements

const brand = document.createElement('div');
brand.className = 'popfact-brand';
brand.textContent = 'PopFact';

const ticker = document.createElement('div');
ticker.className = 'popfact-ticker';

this.tickerInner = document.createElement('div');
this.tickerInner.id = 'popfact-ticker-inner';
ticker.appendChild(this.tickerInner);

const status = document.createElement('div');
status.className = 'popfact-status';
status.id = 'popfact-status';
status.textContent = '⚠️ DEMO ONLY - MOCK DATA';

bar.appendChild(brand);      // 'bar' is undefined in this scope!
bar.appendChild(ticker);
bar.appendChild(status);
this.overlay.appendChild(bar);
```

**Issue:**
- This code references undefined variable `bar`
- Code appears to be orphaned/copy-paste artifact
- Creates elements with classes that don't match CSS (`.popfact-brand`, `.popfact-ticker`)
- The actual overlay is created earlier in `createOverlay()` method

**Recommendation:** DELETE lines 202-225 - dead code causing no runtime error only because TreeWalker never reaches this path

---

### 2. Duplicate CLEAR_CACHE Handler (background.js:142)

**Code:**
```javascript
// background.js:125-129 - First handler (outside tab validation)
if (message.type === 'CLEAR_CACHE') {
  this.clearCache();
  sendResponse({ success: true });
  return true;
}

// background.js:142-145 - Second handler (inside tab-required block)
} else if (message.type === 'CLEAR_CACHE') {
  this.clearCache();
  sendResponse({ success: true });
}
```

**Issue:** CLEAR_CACHE is handled twice - first handler catches it, second is unreachable

**Recommendation:** DELETE lines 142-145 - dead code

---

## Unreferenced Documentation Files

The following markdown files are not referenced anywhere and may be stale:

| File | Lines | Last Modified | Recommendation |
|------|-------|---------------|----------------|
| ISSUE_ANALYSIS_REPORT.md | Unknown | Check git log | Review |
| PLAYWRIGHT_FIX.md | Unknown | Check git log | Review |
| FINAL_VERDICT.md | Unknown | Check git log | Review |
| PRODUCTION_STATUS.md | Unknown | Check git log | Review |
| QA_ARCHITECTURE.md | Unknown | Check git log | Review |
| IMPROVEMENTS_SUMMARY.md | Unknown | Check git log | Review |

**Recommendation:**
1. Run `git log --oneline -- *.md | head -20` to see recent changes
2. Consolidate relevant docs into README.md or docs/ directory
3. Archive or delete stale documentation

---

## Verification Commands

```bash
# Find orphan files (files not referenced anywhere)
for f in *.js *.ts *.html; do
  refs=$(grep -r "$(basename $f)" --include="*.js" --include="*.ts" --include="*.json" --include="*.html" . | grep -v "$f:" | wc -l)
  if [ $refs -eq 0 ]; then
    echo "ORPHAN: $f"
  fi
done

# Find unused CSS classes
grep -oP '\.popfact-[a-z-]+' overlay.css | sort -u | while read class; do
  refs=$(grep -r "${class#.}" content.js popup.js | wc -l)
  if [ $refs -eq 0 ]; then
    echo "UNUSED CSS: $class"
  fi
done

# Find unused exports
grep -oP 'export (function|const|class) \K\w+' tests/utils/*.ts | while read exp; do
  refs=$(grep -r "$exp" tests/*.spec.ts | wc -l)
  if [ $refs -eq 0 ]; then
    echo "UNUSED EXPORT: $exp"
  fi
done
```

---

## Summary Actions

### Safe to Delete
1. `overlay.css` lines 99-106 (`@keyframes scroll-left`)
2. `overlay.css` lines 315-322 (duplicate `@keyframes pulse`)
3. `overlay.css` lines 82-92 (`.popfact-brand` class)
4. `content.js` lines 202-225 (orphaned code block)
5. `background.js` lines 142-145 (duplicate CLEAR_CACHE handler)

### Review Before Deletion
1. `tests/fixtures/extension-fixtures.ts` - May be needed for future tests
2. `quick-test.html` - May be used for manual testing
3. `demo-enhanced-ticker.html` - May be needed for demos

### Keep but Reorganize
1. `icons/create-placeholder-icons.js` - Move to scripts/
2. Documentation files - Consolidate into organized structure
