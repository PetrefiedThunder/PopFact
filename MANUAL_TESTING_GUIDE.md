# PopFact Manual Testing Guide

**Purpose**: Step-by-step procedures for manual QA testing of PopFact browser extension  
**Audience**: QA Engineers, Developers, Testers  
**Time Required**: ~30-45 minutes for full manual test suite

---

## Prerequisites

### Before You Begin

1. **Chrome Browser** (or Chromium-based browser)
2. **Extension Installed**:
   - Open `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the PopFact directory
3. **Test Pages**:
   - `debug-test.html` (included)
   - `quick-test.html` (included)
   - Real news websites (CNN, BBC, NYTimes, etc.)

---

## Test Suite 1: Basic Functionality

### Test 1.1: Extension Loads Successfully

**Steps**:
1. Open `chrome://extensions`
2. Locate "PopFact" extension
3. Verify extension is enabled

**Expected Results**:
- ✅ Extension appears in list
- ✅ No errors shown
- ✅ Extension icon visible in toolbar (if applicable)

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 1.2: Overlay Appears on Page

**Steps**:
1. Navigate to `debug-test.html` (open file in Chrome)
2. Wait 1-2 seconds for page to load
3. Look at bottom of browser window

**Expected Results**:
- ✅ Orange/red ticker bar appears at bottom
- ✅ "POPFACT" label visible on left
- ✅ "ACTIVE" status visible on right
- ✅ Loading message initially displayed
- ✅ Overlay doesn't cover page content

**Visual Check**:
```
┌─────────────────────────────────────┐
│                                     │
│        Page Content Here            │
│                                     │
└─────────────────────────────────────┘
┌─POPFACT──[ Ticker ]────────[ACTIVE]┐  ← Should see this
└─────────────────────────────────────┘
```

**Status**: [ ] Pass  [ ] Fail  
**Screenshot**: ___________________________  
**Notes**: ___________________________

---

### Test 1.3: Toggle Button Works

**Steps**:
1. Navigate to `debug-test.html`
2. Wait for overlay to appear
3. Click the toggle button (▼ or ▲) in center-right of overlay
4. Observe overlay behavior
5. Click toggle button again

**Expected Results**:
- ✅ Toggle button is visible and clickable
- ✅ First click: Overlay slides down/hides
- ✅ Button changes to ▲ (up arrow)
- ✅ Second click: Overlay slides up/shows
- ✅ Button changes to ▼ (down arrow)
- ✅ Page content is still accessible when overlay hidden

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 1.4: Ticker Flow Control

**Steps**:
1. Navigate to `debug-test.html`
2. Wait for fact-check items to appear in ticker
3. Observe ticker scrolling
4. Click "★ Stop" button
5. Observe ticker
6. Click "▶ Start" button

**Expected Results**:
- ✅ Ticker scrolls continuously when active
- ✅ "★ Stop" button visible
- ✅ Clicking "Stop" pauses ticker animation
- ✅ Status changes to "PAUSED"
- ✅ Button text changes to "▶ Start"
- ✅ Clicking "Start" resumes ticker animation
- ✅ Status changes to "ACTIVE"

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

## Test Suite 2: Fact-Checking Functionality

### Test 2.1: Claim Extraction

**Steps**:
1. Navigate to `debug-test.html`
2. Open browser console (F12)
3. Look for "PopFact: Extracted X claims" messages
4. Wait 5-10 seconds for processing

**Expected Results**:
- ✅ Console shows "PopFact: Overlay initialized"
- ✅ Console shows "PopFact: Extracted X claims for fact-checking"
- ✅ At least 3-5 claims extracted from test page
- ✅ No error messages in console

**Console Output Example**:
```
PopFact: Overlay initialized
PopFact: Extracted 5 claims for fact-checking
```

**Status**: [ ] Pass  [ ] Fail  
**Console Screenshot**: ___________________________  
**Notes**: ___________________________

---

### Test 2.2: Fact-Check Display

**Steps**:
1. Navigate to `debug-test.html`
2. Wait for fact-check results to appear in ticker
3. Observe ticker items

**Expected Results**:
- ✅ Fact-check items appear in ticker within 5-10 seconds
- ✅ Each item shows:
  - Icon (✓, ✗, !, or ?)
  - Claim text (truncated if long)
  - Verdict/explanation
- ✅ Items scroll continuously
- ✅ Multiple items visible

**Item Format Example**:
```
[✓] The sky is blue | TRUE - Verified by science
[✗] Moon landing fake | FALSE - Thoroughly debunked
```

**Status**: [ ] Pass  [ ] Fail  
**Screenshot**: ___________________________  
**Notes**: ___________________________

---

### Test 2.3: Verdict Color Coding

**Steps**:
1. Navigate to `debug-test.html`
2. Observe ticker items as they scroll
3. Identify items by color/icon

**Expected Results**:
- ✅ TRUE verdicts: Green background, ✓ icon
- ✅ FALSE verdicts: Red/pink background, ✗ icon
- ✅ MIXED verdicts: Yellow background, ! icon
- ✅ UNVERIFIED verdicts: Gray background, ? icon
- ✅ Colors are distinguishable
- ✅ Icons are clear and readable

**Color Check**:
- TRUE: #28a745 (green) ✓
- FALSE: #dc3545 (red) ✗
- MIXED: #ffc107 (yellow) !
- UNVERIFIED: #6c757d (gray) ?

**Status**: [ ] Pass  [ ] Fail  
**Screenshot showing different colors**: ___________________________  
**Notes**: ___________________________

---

## Test Suite 3: Performance

### Test 3.1: Page Load Performance

**Steps**:
1. Navigate to `debug-test.html`
2. Open DevTools (F12) → Performance tab
3. Reload page (Ctrl+R)
4. Stop recording after page loads
5. Examine timeline

**Expected Results**:
- ✅ Page loads normally (not noticeably slower)
- ✅ Overlay appears within 200ms of page load
- ✅ No long-running scripts (>100ms)
- ✅ No layout thrashing visible

**Performance Metrics**:
- Time to overlay: ______ ms (should be < 200ms)
- Total load time: ______ ms

**Status**: [ ] Pass  [ ] Fail  
**Performance Screenshot**: ___________________________  
**Notes**: ___________________________

---

### Test 3.2: Animation Smoothness

**Steps**:
1. Navigate to `debug-test.html`
2. Wait for ticker to show fact-check items
3. Observe ticker scrolling animation for 10 seconds
4. Look for stuttering, jumping, or lag

**Expected Results**:
- ✅ Animation is smooth and continuous
- ✅ No stuttering or jumping
- ✅ Consistent speed
- ✅ No frame drops visible
- ✅ Text is readable while scrolling

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 3.3: Memory Usage

**Steps**:
1. Navigate to `debug-test.html`
2. Open DevTools (F12) → Memory tab
3. Take heap snapshot
4. Note memory usage
5. Wait 2 minutes with page active
6. Take another heap snapshot
7. Compare memory usage

**Expected Results**:
- ✅ Initial memory: < 20MB
- ✅ Memory after 2 mins: < 50MB
- ✅ No significant memory growth
- ✅ No memory leaks detected

**Memory Usage**:
- Initial: ______ MB
- After 2 min: ______ MB
- Growth: ______ MB

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 3.4: CPU Usage

**Steps**:
1. Navigate to `debug-test.html`
2. Open Task Manager (Shift+Esc in Chrome)
3. Find "debug-test.html" process
4. Observe CPU usage for 30 seconds

**Expected Results**:
- ✅ CPU usage averages < 5% when idle
- ✅ Brief spikes during claim extraction OK
- ✅ No constant high CPU usage
- ✅ Page remains responsive

**CPU Observations**:
- Average CPU: ______ %
- Peak CPU: ______ %

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

## Test Suite 4: Compatibility & Edge Cases

### Test 4.1: Real News Website Test

**Steps**:
1. Visit a major news site (CNN, BBC, NYTimes)
2. Wait for overlay to appear
3. Observe functionality

**Test on these sites**:
- [ ] CNN.com
- [ ] BBC.com/news
- [ ] NYTimes.com
- [ ] (Other): ___________________________

**Expected Results**:
- ✅ Overlay appears
- ✅ Doesn't interfere with site navigation
- ✅ Doesn't break site layout
- ✅ No console errors
- ✅ Claim extraction works

**Status**: [ ] Pass  [ ] Fail  
**Site Tested**: ___________________________  
**Issues Found**: ___________________________

---

### Test 4.2: Page Scrolling

**Steps**:
1. Navigate to `debug-test.html`
2. Scroll down page
3. Scroll up page
4. Scroll to bottom
5. Scroll to top

**Expected Results**:
- ✅ Overlay stays fixed at bottom
- ✅ Overlay doesn't move when scrolling
- ✅ Scrolling is smooth and unaffected
- ✅ Overlay always visible at bottom

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 4.3: Long Page Handling

**Steps**:
1. Open a very long news article (1000+ words)
2. Wait for overlay to appear
3. Observe performance
4. Check console for errors

**Expected Results**:
- ✅ Extension handles long content
- ✅ No performance degradation
- ✅ Doesn't extract excessive claims (max ~5-10)
- ✅ No console errors

**Status**: [ ] Pass  [ ] Fail  
**Page Used**: ___________________________  
**Notes**: ___________________________

---

### Test 4.4: Dynamic Content

**Steps**:
1. Navigate to `debug-test.html`
2. Wait 3 seconds (dynamic content loads automatically)
3. Check if new content is detected
4. Look for "Dynamic content" claim in ticker

**Expected Results**:
- ✅ Extension detects dynamically added content
- ✅ New claims are extracted
- ✅ Ticker updates with new fact-checks

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 4.5: Multiple Tabs

**Steps**:
1. Open `debug-test.html` in Tab 1
2. Wait for overlay to appear
3. Open `debug-test.html` in Tab 2
4. Switch between tabs

**Expected Results**:
- ✅ Overlay appears in both tabs
- ✅ Each tab has its own overlay
- ✅ No interference between tabs
- ✅ Switching tabs doesn't cause errors

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

## Test Suite 5: Error Handling

### Test 5.1: No Internet Connection

**Steps**:
1. Disconnect from internet
2. Navigate to `debug-test.html` (cached)
3. Observe extension behavior

**Expected Results**:
- ✅ Overlay still appears
- ✅ No JavaScript errors
- ✅ Extension doesn't crash
- ✅ Graceful degradation (shows loading or no data message)

**Status**: [ ] Pass  [ ] Fail  
**Notes**: ___________________________

---

### Test 5.2: Console Errors

**Steps**:
1. Navigate to `debug-test.html`
2. Open DevTools Console (F12)
3. Look for errors (red messages)

**Expected Results**:
- ✅ No critical errors
- ✅ Only expected warnings (if any)
- ✅ No uncaught exceptions

**Errors Found**: 
___________________________

**Status**: [ ] Pass  [ ] Fail  
**Console Screenshot**: ___________________________

---

## Test Results Summary

### Overall Results

| Test Suite | Tests | Passed | Failed | Pass % |
|------------|-------|--------|--------|--------|
| Basic Functionality | 4 | ____ | ____ | ____ % |
| Fact-Checking | 3 | ____ | ____ | ____ % |
| Performance | 4 | ____ | ____ | ____ % |
| Compatibility | 5 | ____ | ____ | ____ % |
| Error Handling | 2 | ____ | ____ | ____ % |
| **TOTAL** | **18** | ____ | ____ | ____ % |

---

### Critical Issues Found

**Issue #1**: ___________________________  
**Severity**: [ ] Critical  [ ] High  [ ] Medium  [ ] Low  
**Steps to Reproduce**: ___________________________  
**Screenshot**: ___________________________

**Issue #2**: ___________________________  
**Severity**: [ ] Critical  [ ] High  [ ] Medium  [ ] Low  
**Steps to Reproduce**: ___________________________  
**Screenshot**: ___________________________

---

### Sign-Off

**Manual QA Status**: [ ] PASS  [ ] FAIL  [ ] CONDITIONAL PASS

**Tester Name**: ___________________________  
**Date**: ___________________________  
**Time Spent**: ___________________________  
**Browser Version**: ___________________________

**Recommendation**: 
[ ] Approve for production  
[ ] Approve with minor fixes  
[ ] Requires major fixes  
[ ] Reject - critical issues found

**Notes**: ___________________________

---

## Appendix: Quick Reference

### Console Commands for Testing

```javascript
// Check if extension loaded
console.log(document.getElementById('popfact-overlay'));

// Get all fact items
document.querySelectorAll('.popfact-item').length;

// Check if ticker is paused
document.getElementById('popfact-ticker-scroll').classList.contains('paused');

// Force trigger claim extraction (if implemented)
// ... custom commands here
```

### Common Issues & Solutions

**Issue**: Overlay doesn't appear  
**Solution**: Check Extensions page, reload page, check console for errors

**Issue**: Ticker not scrolling  
**Solution**: Check if paused, reload page

**Issue**: No fact-checks appearing  
**Solution**: Wait longer (up to 10s), check console, verify page has claims

---

**Document Version**: 1.0  
**Last Updated**: November 24, 2025  
**Maintained By**: QA Team
