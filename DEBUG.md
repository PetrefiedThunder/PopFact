# PopFact Debug Guide

## Quick Debug Checklist

### ✅ Extension Installation
```bash
1. Open Chrome → chrome://extensions/
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the PopFact directory
5. Verify extension appears in list
```

### ✅ File Integrity Check
```bash
cd /home/user/PopFact
ls -la

# Should see:
# - manifest.json
# - content.js (167 lines)
# - background.js (71 lines)
# - overlay.css (92 lines)
# - popup.html, popup.js, popup.css
# - icons/ directory
```

### ✅ Syntax Validation
```bash
# Check JavaScript syntax
node --check background.js
node --check content.js
node --check popup.js

# All should return no errors
```

---

## Common Issues & Solutions

### ❌ Issue: Ticker Not Appearing

**Symptoms:**
- Page loads but no black bar at bottom
- Console shows no PopFact messages

**Debug Steps:**
1. Open DevTools (F12) → Console tab
2. Look for errors related to PopFact
3. Check if content script loaded:
   ```javascript
   document.getElementById('popfact-overlay')
   // Should return: <div id="popfact-overlay">...</div>
   ```

**Solutions:**
- **If null:** Extension not loaded or content script failed
  - Reload page (Ctrl+R)
  - Reload extension in chrome://extensions/
  - Check manifest.json content_scripts section

- **If overlay exists but hidden:**
  - Inspect element in DevTools
  - Check CSS: `position: fixed; bottom: 0;`
  - Verify z-index: `2147483647`

---

### ❌ Issue: No Fact-Checks Showing

**Symptoms:**
- Ticker appears but is empty
- No scrolling text

**Debug Steps:**
1. Open console and check for:
   ```
   PopFact: Extracted X claims for fact-checking
   ```
2. If 0 claims extracted:
   - Page may not have enough text
   - Use debug-test.html (included)

3. Check background script:
   - Go to chrome://extensions/
   - Find PopFact extension
   - Click "Inspect views: service worker"
   - Look for "Processing fact-check request" messages

**Solutions:**
- **If no claims extracted:**
  - Test on news site (CNN, BBC, NYTimes)
  - Use debug-test.html
  - Check page has <p>, <h1>, <h2>, <h3> elements

- **If claims extracted but no results:**
  - Background script may not be running
  - Check service worker inspector for errors
  - Reload extension

---

### ❌ Issue: Console Errors

**Common Error:** `Cannot read property 'id' of null`
**Fix:** Ensure document.body exists before appending overlay
```javascript
// In content.js, init() is only called when DOM is ready
// This is already handled in the code
```

**Common Error:** `chrome.runtime.sendMessage is not defined`
**Fix:** Verify extension is loaded in chrome://extensions/

**Common Error:** `Animation not working`
**Fix:** Check #popfact-ticker-inner has duplicated content
```javascript
// In updateTicker(), after adding all items:
const clone = this.tickerInner.cloneNode(true);
this.tickerInner.appendChild(clone);
```

---

## Debug Console Commands

Open DevTools console on any page with PopFact loaded:

```javascript
// Check overlay element
document.getElementById('popfact-overlay')

// Check ticker content
document.getElementById('popfact-ticker-inner')?.innerHTML

// Check brand label
document.querySelector('.popfact-brand')?.textContent
// Should return: "POPFACT"

// Check all fact items
document.querySelectorAll('.popfact-item').length
// Should return: 10 (5 items × 2 for loop)

// Force check if extension is loaded
chrome.runtime?.id
// Should return extension ID string
```

---

## Background Script Debugging

1. Open `chrome://extensions/`
2. Find PopFact extension
3. Click **"Inspect views: service worker"**
4. New DevTools window opens showing background script console
5. Look for:
   ```
   PopFact Background Service: Initialized (Mock Mode)
   PopFact: Processing fact-check request: [claim text]
   ```

**Test message passing:**
```javascript
// In background service worker console, try:
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    type: 'FACT_CHECK_RESULT',
    data: {
      claim: 'Test claim',
      verdict: 'TRUE',
      explanation: 'Test explanation',
      confidence: 0.9,
      sources: [],
      checkedAt: Date.now()
    }
  });
});
// Should see new item appear in ticker
```

---

## Test Page Usage

Use the included `debug-test.html`:

```bash
# Open in browser
cd /home/user/PopFact
open debug-test.html  # or just drag file into Chrome

# Expected behavior:
# 1. Black ticker appears at bottom immediately
# 2. Console shows: "Extracted 5 claims for fact-checking"
# 3. Ticker fills with 5 color-coded fact-checks within 1 second
# 4. Items scroll smoothly left to right
# 5. Media detection shows "coming soon" message (page has hidden video tag)
```

**Test Claims on Debug Page:**
- ✅ "earth is round" → TRUE (green)
- ✅ "climate" + "warming" → TRUE (green)
- ❌ "flat earth" → FALSE (red)
- ⚠️ "COVID" → MIXED (yellow)
- ❌ "2020 election" → FALSE (red)

---

## Network Debugging

PopFact should **NOT** make any network requests (pure mock mode).

**Verify:**
1. Open DevTools → Network tab
2. Load page with PopFact
3. Filter by XHR/Fetch
4. Should see **ZERO** requests from PopFact

If you see requests:
- Check background.js for fetch() calls
- Ensure performFactCheckMock is being used (not external API)

---

## Performance Debugging

**Check extension performance:**
1. Open DevTools → Performance tab
2. Record page load
3. Look for "PopFactOverlay" in timeline
4. Should complete in <100ms

**Memory usage:**
```javascript
// Check overlay size
document.getElementById('popfact-overlay')?.getBoundingClientRect()
// height: 52, bottom: viewport height

// Check ticker items
document.querySelectorAll('.popfact-item').length
// Should be 2× number of claims (for loop duplication)
```

---

## Manifest Verification

Ensure manifest.json has correct structure:

```json
{
  "manifest_version": 3,
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["overlay.css"],
    "run_at": "document_end"
  }],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Common manifest errors:**
- Missing comma between properties
- Wrong file paths
- Invalid JSON syntax

**Validate:**
```bash
cat manifest.json | python3 -m json.tool
# Should output formatted JSON with no errors
```

---

## Expected Behavior Summary

### On Page Load:
1. **T+0ms:** Content script injected
2. **T+10ms:** Overlay created and appended to DOM
3. **T+20ms:** Claims extracted from page (max 5)
4. **T+30ms:** Messages sent to background
5. **T+40ms:** Background processes claims (synchronous mock)
6. **T+50ms:** Results sent back to content script
7. **T+60ms:** Ticker updated with results
8. **T+100ms:** Animation starts scrolling

### Visual Indicators:
- ✅ Black bar (52px) at bottom of viewport
- ✅ Red "PopFact" label on left
- ✅ "LIVE FACT-CHECK DEMO" on right
- ✅ Color-coded claims scrolling in center
- ✅ Smooth left-to-right animation (25s loop)

### Console Messages:
```
PopFact Background Service: Initialized (Mock Mode)
PopFact: Overlay initialized
PopFact: Extracted 5 claims for fact-checking
PopFact: Processing fact-check request: [claim 1]
PopFact: Processing fact-check request: [claim 2]
...
```

---

## Quick Fix Commands

### Reload Extension:
```bash
# In Chrome, you can:
1. Go to chrome://extensions/
2. Click reload icon on PopFact card
3. Refresh any open tabs
```

### Reset Extension State:
```bash
# Remove and re-add extension
1. chrome://extensions/
2. Click "Remove" on PopFact
3. Click "Load unpacked" again
4. Select PopFact directory
```

### Clear Browser Cache:
```bash
# If CSS not updating:
1. DevTools open → Right-click refresh button
2. Select "Empty Cache and Hard Reload"
```

---

## Success Criteria

Extension is working correctly if:

✅ Ticker appears on every page load
✅ Console shows claim extraction (0-5 claims)
✅ Background processes requests instantly
✅ Results appear in ticker within 100ms
✅ Animation scrolls smoothly
✅ Colors match verdicts correctly
✅ No network requests made
✅ No console errors

---

## Still Having Issues?

### Check These:
1. Chrome version (should be 88+)
2. Extension enabled in chrome://extensions/
3. Service worker status (should be active)
4. No conflicting extensions (try in Incognito)
5. JavaScript enabled
6. No browser restrictions on content scripts

### Debug Output Template:
```
Browser: Chrome [version]
Extension Status: [Loaded/Not loaded]
Page URL: [url]
Console Errors: [yes/no - paste errors]
Ticker Visible: [yes/no]
Claims Extracted: [number]
Background Running: [yes/no]
```

---

## Contact / Report Issues

If you encounter bugs:
1. Open browser console (F12)
2. Copy all PopFact-related messages
3. Include page URL
4. Note what you expected vs what happened
