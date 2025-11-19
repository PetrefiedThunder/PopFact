# Quick Start: Prepare PopFact for Production

**Goal:** Get PopFact ready for Chrome Web Store submission in 1-2 days

## Step-by-Step Guide

### ⏱️ Time: ~4 hours total

---

## STEP 1: Generate Icons (30 minutes)

### If you have ImageMagick:
```bash
cd /home/user/PopFact
./prepare-production.sh
```

### If you DON'T have ImageMagick:

**Option A: Install ImageMagick**
```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# macOS
brew install imagemagick

# Then run
./prepare-production.sh
```

**Option B: Use Online Converter**
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icons/icon.svg`
3. Create these sizes:
   - 16×16 → save as `icon16.png`
   - 48×48 → save as `icon48.png`
   - 128×128 → save as `icon128.png`
4. Save all to `icons/` folder

**Verify:**
```bash
ls icons/*.png
# Should show: icon16.png icon48.png icon128.png
```

✅ **Checkpoint:** PNG icons exist

---

## STEP 2: Host Privacy Policy (1 hour)

### Option A: GitHub Pages (Recommended)
```bash
cd /home/user/PopFact

# Copy privacy policy to docs folder
mkdir -p docs
cp PRIVACY_POLICY.md docs/privacy.md

# Commit and push
git add docs/privacy.md
git commit -m "Add: Privacy policy for store listing"
git push

# Enable GitHub Pages:
# 1. Go to https://github.com/PetrefiedThunder/PopFact/settings/pages
# 2. Source: Deploy from branch
# 3. Branch: main (or your branch) / docs
# 4. Save

# Your privacy policy will be at:
# https://petrefiedthunder.github.io/PopFact/privacy.html
```

### Option B: Gist
```bash
# 1. Go to https://gist.github.com
# 2. Create new gist
# 3. Paste contents of PRIVACY_POLICY.md
# 4. Name it: PopFact-Privacy-Policy.md
# 5. Create public gist
# 6. Copy the URL
```

### Option C: Your Own Website
- Upload `PRIVACY_POLICY.md` to your website
- Make it accessible at a public URL

**Save the URL for later!**

✅ **Checkpoint:** Privacy policy hosted, URL saved

---

## STEP 3: Update Extension Description (15 minutes)

Edit `manifest.json`:

```json
{
  "name": "PopFact Demo - Fact-Check Concept",
  "version": "1.0.0",
  "description": "Demo: CNN-style fact-checking ticker overlay. Uses mock data for demonstration only. Not real fact-checking.",
  "short_name": "PopFact",
  "homepage_url": "https://github.com/PetrefiedThunder/PopFact"
}
```

Edit `content.js` line 40:
```javascript
<div class="popfact-status" id="popfact-status">DEMO ONLY - MOCK DATA</div>
```

✅ **Checkpoint:** Description updated to be accurate

---

## STEP 4: Add Disclaimer (30 minutes)

Create `disclaimer-popup.html` in root:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { padding: 20px; font-family: Arial; width: 400px; }
    h2 { color: #c62828; }
    .warning { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <h2>⚠️ Important Disclaimer</h2>
  <div class="warning">
    <p><strong>This is a DEMONSTRATION extension.</strong></p>
    <p>PopFact uses simple keyword matching, NOT real fact-checking.</p>
    <p><strong>DO NOT rely on results for accurate information.</strong></p>
  </div>
  <p>For real fact-checking, visit:</p>
  <ul>
    <li>Snopes.com</li>
    <li>FactCheck.org</li>
    <li>PolitiFact.com</li>
  </ul>
</body>
</html>
```

Show disclaimer on first install by adding to `background.js`:

```javascript
// Add to end of background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'disclaimer-popup.html'
    });
  }
});
```

✅ **Checkpoint:** Disclaimer added

---

## STEP 5: Create Screenshots (1 hour)

### Load extension:
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked → select PopFact folder

### Take screenshots:
1. Visit https://www.cnn.com
2. Wait for ticker to load
3. Press F11 (fullscreen)
4. Take screenshot showing:
   - Webpage content
   - PopFact ticker at bottom
   - Fact-checks scrolling

### Screenshot requirements:
- **Size:** 1280×800 or 640×400
- **Format:** PNG or JPEG
- **Minimum:** 1 screenshot
- **Recommended:** 3-5 screenshots

**Save to:** `screenshots/` folder

### What to capture:
1. Main view (ticker visible on news site)
2. Close-up of ticker with fact-checks
3. Settings popup (click extension icon)
4. Multiple verdict types (green/red/yellow)

✅ **Checkpoint:** Screenshots saved

---

## STEP 6: Test Extension (2 hours)

### Clean install test:
```bash
# Create test package
cd /home/user/PopFact
zip -r popfact-test.zip . -x "*.git*" "node_modules/*" "*.md" "debug*"

# Load in new Chrome profile
# 1. Open Chrome
# 2. chrome://extensions/
# 3. Remove old version
# 4. Load unpacked
# 5. Test on multiple sites
```

### Test checklist:
- [ ] Ticker appears on CNN.com
- [ ] Ticker appears on BBC.com  
- [ ] Claims are extracted (check console)
- [ ] Fact-checks display with colors
- [ ] Scrolling animation works
- [ ] Settings popup opens
- [ ] No console errors
- [ ] Disclaimer shows on install

✅ **Checkpoint:** Extension works correctly

---

## STEP 7: Create Store Listing (30 minutes)

### Chrome Web Store Developer Account:
1. Go to https://chrome.google.com/webstore/devconsole
2. Pay $5 one-time fee
3. Verify email

### Prepare listing content:

**Detailed Description** (500+ words):
```
PopFact Demo - Fact-Checking Overlay Concept

IMPORTANT: This is a demonstration/proof-of-concept extension that showcases a fact-checking overlay interface. It does NOT perform real fact-checking.

WHAT IT DOES:
PopFact displays a CNN-style news ticker at the bottom of web pages, showing "fact-checks" of content on the page. The ticker scrolls horizontally with color-coded verdicts (green for "true", red for "false", etc.).

HOW IT WORKS:
- Extracts text from web pages you visit
- Identifies potential factual claims
- Matches claims against simple keyword patterns (LOCAL, in your browser)
- Displays mock results in the ticker overlay

WHAT IT DOES NOT DO:
- Connect to real fact-checking databases
- Provide accurate or reliable verification
- Use AI or machine learning
- Transmit your data to servers

THE RESULTS ARE FOR DEMONSTRATION ONLY and use simple keyword matching (e.g., "climate change" → marked as TRUE, "flat earth" → marked as FALSE). Do not rely on this extension for actual fact-checking.

INTENDED USE:
- Demonstration of browser extension UI/UX
- Educational tool for learning extension development  
- Proof-of-concept for future fact-checking tools
- Visual concept for news ticker overlays

For real fact-checking, please visit authoritative sources like Snopes, FactCheck.org, or PolitiFact.

PRIVACY:
- All processing happens locally in your browser
- No data is sent to external servers
- See our privacy policy for full details

OPEN SOURCE:
Full source code available at: https://github.com/PetrefiedThunder/PopFact

By installing this extension, you acknowledge that all fact-check results are mock/demonstration data.
```

**Category:** Developer Tools (or Productivity)

**Tags/Keywords:**
- fact-checking
- demo
- news
- ticker
- overlay
- proof-of-concept

✅ **Checkpoint:** Store listing content ready

---

## STEP 8: Package Extension (15 minutes)

```bash
cd /home/user/PopFact

# Create clean package
zip -r popfact-v1.0.0.zip \
  manifest.json \
  background.js \
  content.js \
  overlay.css \
  popup.html \
  popup.js \
  popup.css \
  icons/ \
  LICENSE \
  -x "*.git*" "*.md" "debug*" "validate.sh" "prepare-production.sh"

# Verify package
unzip -l popfact-v1.0.0.zip
```

✅ **Checkpoint:** ZIP package created

---

## STEP 9: Submit to Chrome Web Store (30 minutes)

1. Go to https://chrome.google.com/webstore/devconsole

2. Click "New Item"

3. Upload `popfact-v1.0.0.zip`

4. Fill out store listing:
   - **Product name:** PopFact Demo - Fact-Check Concept
   - **Summary:** Demo fact-checking ticker overlay (mock data only)
   - **Detailed description:** [Paste from Step 7]
   - **Category:** Developer Tools
   - **Language:** English

5. Upload screenshots (from Step 5)

6. Privacy practices:
   - Does this extension handle personal data? **Yes**
   - Data collected: Page content (for local processing)
   - Privacy policy URL: [Your URL from Step 2]
   - Usage: Local processing only, not transmitted

7. Distribution:
   - **Visibility:** Public (or Unlisted for testing)
   - **Geographic:** All countries

8. Preview listing

9. Click "Submit for Review"

10. Wait for review (1-7 days typically)

✅ **Checkpoint:** Submitted!

---

## STEP 10: Monitor Status (Ongoing)

### Check review status:
- https://chrome.google.com/webstore/devconsole

### If rejected:
1. Read rejection reason carefully
2. Fix issues
3. Increment version to 1.0.1
4. Resubmit

### If approved:
1. Share extension URL
2. Monitor reviews
3. Plan next version

---

## 🎉 YOU'RE DONE!

**What you accomplished:**
✅ Generated required icons
✅ Hosted privacy policy
✅ Updated descriptions to be accurate
✅ Added disclaimer
✅ Created screenshots
✅ Tested thoroughly
✅ Packaged extension
✅ Submitted for review

**Next steps:**
- Wait for review (check email)
- Respond to any review feedback
- Plan improvements for v2.0

---

## 🆘 TROUBLESHOOTING

**Problem:** ImageMagick won't install
**Solution:** Use online converter (cloudconvert.com)

**Problem:** GitHub Pages not working
**Solution:** Use gist.github.com or your own hosting

**Problem:** Review taking too long (>7 days)
**Solution:** Check developer console for messages, be patient

**Problem:** Extension rejected
**Solution:** Read rejection carefully, fix ALL issues, resubmit

---

## 📚 ADDITIONAL RESOURCES

- Full audit: `PRODUCTION_AUDIT.md`
- Detailed checklist: `PRODUCTION_CHECKLIST.md`
- Privacy policy: `PRIVACY_POLICY.md`
- Validation: `./validate.sh`

**Questions?** Open an issue on GitHub!
