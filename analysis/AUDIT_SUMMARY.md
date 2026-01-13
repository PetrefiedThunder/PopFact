# PopFact Codebase Interdependency Audit

**Date:** 2026-01-13
**Auditor:** Claude (Dependency Archaeologist)
**Codebase:** PopFact Browser Extension

---

## Executive Summary

PopFact is a Chrome browser extension that provides fact-checking functionality with a CNN-style ticker overlay. The codebase is **moderately healthy** with some critical issues requiring immediate attention.

### Key Findings

| Metric | Value | Assessment |
|--------|-------|------------|
| Total Files | 69 | Moderate size |
| Source Files | 19 | Well-scoped |
| Test Files | 13 | Good coverage |
| External Dependencies | 3 | Minimal (dev-only) |
| Circular Dependencies | 0 | Excellent |
| Critical Bugs | 1 | Needs immediate fix |
| Dead Code Blocks | 5 | Cleanup needed |
| Technical Debt Score | 35/100 | Moderate |

---

## Critical Issue (P0)

**Bug in background.js:246** - Variable `enrichedResult` is used before it's defined. This will cause runtime errors when the cache reaches capacity.

```javascript
// CURRENT (BROKEN):
this.cache.set(cacheKey, enrichedResult);  // enrichedResult undefined!
const enrichedResult = { ... };  // Defined AFTER use
```

**Action Required:** Move cache.set() after enrichedResult definition.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  manifest.json (HUB - connects all components)          │
├──────────────┬──────────────┬──────────────────────────┤
│  Background  │   Content    │        Popup             │
│  Context     │   Script     │        Context           │
├──────────────┼──────────────┼──────────────────────────┤
│ background.js│ content.js   │ popup.html/js/css        │
│ (613 LOC)    │ (504 LOC)    │ (406 LOC total)          │
│              │ overlay.css  │                          │
│ 3 classes    │ 1 class      │ 6 functions              │
└──────────────┴──────────────┴──────────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │   Chrome APIs    │
            │ runtime, storage │
            │ tabs, scripting  │
            └──────────────────┘
```

---

## Dependency Analysis Summary

### Hub Files (High Coupling)
1. **manifest.json** (75/100) - Connects all extension components
2. **tests/utils/shadow-dom.ts** (60/100) - Imported by 5 test files
3. **tests/utils/inject-extension.ts** (55/100) - Imported by 4 test files

### High-Risk Modules
1. **content.js** - God class, 504 LOC, heavy DOM coupling
2. **background.js** - Bug present, 3 classes in one file

### Orphan Files (No Importers)
1. `tests/fixtures/extension-fixtures.ts` - Unused fixture
2. `icons/create-placeholder-icons.js` - One-time utility
3. `demo-enhanced-ticker.html` - Demo file
4. `quick-test.html` - Redundant with debug-test.html

### Dead Code
- CSS: 3 unused rule blocks (~40 lines)
- JS: 1 unreachable code block (24 lines)
- Handler: 1 duplicate message handler (4 lines)

---

## Anti-Patterns Detected

| Pattern | File | Severity |
|---------|------|----------|
| God Class | content.js:PopFactOverlay | Medium |
| God Module | background.js | Medium |
| Dead Code | content.js:202-225 | Low |
| Duplicate Definitions | overlay.css | Low |
| Variable Before Definition | background.js:246 | Critical |

---

## Deliverables

| File | Purpose |
|------|---------|
| `dependency-graph.json` | Machine-readable full dependency map |
| `circular-dependencies.md` | Cycle analysis (none found) |
| `high-risk-modules.md` | Ranked by coupling + blast radius |
| `dead-code-candidates.md` | Orphan files and unused code |
| `refactoring-priorities.md` | Actionable tech debt ranking |
| `architecture-diagram.mermaid` | Visual dependency graph |

---

## Recommended Actions

### Immediate (Today)
- [ ] Fix bug in background.js:246

### This Week
- [ ] Delete dead code in content.js:202-225
- [ ] Clean up duplicate CSS definitions
- [ ] Remove duplicate CLEAR_CACHE handler

### This Sprint
- [ ] Split content.js into smaller modules
- [ ] Split background.js into provider files

### Backlog
- [ ] Add TypeScript to source files
- [ ] Add build system (Rollup/Vite)
- [ ] Consolidate documentation

---

## Conclusion

The PopFact codebase has a clean architecture with no circular dependencies and good test coverage. However, there is one critical bug that needs immediate attention, and the codebase would benefit from modularization of the two main source files (content.js and background.js).

The technical debt is moderate and manageable. Following the prioritized refactoring roadmap in `refactoring-priorities.md` will improve maintainability significantly.
