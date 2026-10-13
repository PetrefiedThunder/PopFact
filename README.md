# PopFact Demo - Fact-Checking Overlay Concept

> ⚠️ **IMPORTANT:** This is a **demonstration/proof-of-concept** extension. Verdicts come from heuristic keyword matching and lightweight open-knowledge lookups, **NOT** from real fact-checking services. Do not rely on results for accurate information.

PopFact is a browser extension that demonstrates a CNN-style fact-checking ticker overlay. It showcases the UI/UX concept of real-time fact verification displays, but currently uses mock verdicts and contextual lookups for demonstration purposes only.

### Current Status at a Glance
- ✅ **Icons included:** PNG icons (`icon16/48/128`) are in the repo; regenerate with `icons/generate-icons.sh` if needed.
- ⚠️ **Demo-only data:** Default provider uses public Wikipedia/Twitter lookups plus keyword heuristics; a fully offline mock provider is available in settings.
- ⚠️ **Store readiness:** Privacy policy exists as `PRIVACY_POLICY.md` but still needs hosting; broad `<all_urls>` permission and `innerHTML` usage require review before submission.
- ✅ **Automated QA:** 103 Playwright tests across 8 specs cover overlay basics, fact-checking flows, enhanced context, extension validation, performance, smoke, and anti-fragility scenarios.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](manifest.json)
[![Firefox](https://img.shields.io/badge/Firefox-Compatible-orange.svg)](manifest.json)

## ⚠️ Disclaimer

**PopFact is a DEMONSTRATION ONLY:**
- Uses heuristic keyword matching (e.g., "climate" → TRUE, "flat earth" → FALSE)
- Optional open-knowledge lookups (Wikipedia/Twitter context) but **no verified fact-checking sources**
- Does NOT provide accurate or reliable verification
- Should NOT be used for actual fact-checking

**For real fact-checking, visit:** [Snopes](https://www.snopes.com), [FactCheck.org](https://www.factcheck.org), [PolitiFact](https://www.politifact.com)

## Features

📺 **CNN-Style News Ticker**
- Fixed overlay at bottom of browser viewport
- Horizontal scrolling fact-check results
- Color-coded verdicts (Green = True, Red = False, Yellow = Mixed, Gray = Unverified)

🔍 **Text Analysis (Demo Mode)**
- Extracts claims from web page text
- Identifies declarative statements
- Matches against keyword patterns
- Displays mock results in ticker

⚡ **Real-time Processing**
- Automatic detection of declarative statements
- Background processing with intelligent caching
- Configurable confidence thresholds
- Optional open-knowledge context (Wikipedia + Twitter) with no API keys required, plus a mock provider for fully offline demos

🎛️ **Customizable Settings**
- Ticker speed control
- Confidence threshold adjustment
- Enable/disable content types
- API provider selection (for future real integration)

## Installation

### For Testing/Demo

1. **Clone this repository:**
   ```bash
   git clone https://github.com/PetrefiedThunder/PopFact.git
   cd PopFact
   ```

2. **PNG icons included** (regenerate only if needed):

   See [GENERATE_ICONS.md](GENERATE_ICONS.md) for detailed instructions.

   **Quick method with ImageMagick:**
   ```bash
   cd icons
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `PopFact` directory

4. **Load in Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

### From Chrome Web Store

_Coming soon_ - See [Production Deployment](#production-deployment) for store submission status.

## Usage

1. **Visit any webpage** (news sites work best)
2. **Watch the ticker** appear at the bottom of the page
3. **See fact-checks scroll** with color-coded verdicts
4. **Click extension icon** to access settings and statistics
5. **Send Wrap-up Email**: From the popup, choose "Send Wrap-up Email" to launch an email draft with a spreadsheet-style summary of the latest fact checks

The ticker will automatically:
- Extract text from all page text nodes (skipping `script`/`style`/`noscript` and its own overlay)
- Identify up to 10 new potential factual claims per scan, and re-scan when page content changes
- Match them against keyword patterns
- Display results in the scrolling ticker

## How It Works

### Text Extraction
```javascript
1. Walk all page text nodes (skipping script/style/noscript and the overlay)
2. Split text into sentences
3. Filter for declarative statements (40–1000 chars, ≥6 words, no questions, no first-person narratives)
4. Send up to 10 new claims per scan to the background script
5. Re-scan on DOM mutations (500 ms debounce); a bounded 1,000-claim history prevents reprocessing
```

### Mock Fact-Checking
```javascript
1. Normalize claim text to lowercase
2. Check for keyword patterns:
   - TRUE:  "earth is round", "climate change", "vaccines prevent disease", …
   - FALSE: "earth is flat", "vaccines cause autism", "moon landing was fake", …
   - MIXED: "coffee is healthy", "organic is better", "detox cleanses", …
   - Special cases: "climate … hoax" → FALSE; "vaccine … safe" → TRUE
   - Other → UNVERIFIED
3. Return mock verdict with explanation
```

### Display
```javascript
1. Receive results from background script
2. Create ticker items with appropriate color class
3. Duplicate content for seamless scrolling
4. Animate with CSS transform
```

## Project Structure

- `manifest.json` — Manifest V3 definition (Chrome + Firefox)
- `content.js` — claim extraction, mutation observer, ticker overlay
- `background.js` — mock verdicts, Wikipedia/Twitter context lookups, caching
- `popup.html` / `popup.js` / `popup.css` — settings, statistics, wrap-up email
- `overlay.css` — ticker styling
- `disclaimer.html` — install disclaimer
- `icons/` — SVG source and generated PNG icons
- `tests/` — Playwright suites and fixtures

## Development

### Prerequisites

- Chrome 88+ or Firefox 89+
- Node.js (optional, for development tools)
- ImageMagick or image editor (for icon generation)

### Testing

```bash
# Validate extension files
./validate.sh

# Run in Chrome
chrome://extensions/ → Load unpacked

# Test on these sites
- https://www.cnn.com
- https://www.bbc.com
- https://www.nytimes.com
```

### Debugging

Open DevTools (F12) and check console for:
```
PopFact: Overlay initialized
PopFact: Extracted 5 claims for fact-checking
PopFact: Processing fact-check request: [claim text]
```

See [DEBUG.md](DEBUG.md) for comprehensive debugging guide.

## Production Deployment

- Node.js 18+ (for development tools)
- Chrome or Firefox browser
- _No API keys required_ for the demo providers

❌ **NOT READY FOR PRODUCTION** - Before any store submission:
- Host `PRIVACY_POLICY.md` at a public URL and reference it in listings.
- Review and possibly reduce `<all_urls>` permission (currently required for demo coverage).
- Replace `innerHTML` usage flagged in `content.js` with safer DOM methods.
- Keep store description aligned with the "Demo" positioning (see `manifest.json`).

PopFact includes a comprehensive QA test suite built with Playwright (103 tests across 8 specs: overlay basics, mock fact-checking, enhanced context, extension behavior, extension validation, performance, smoke, and anti-fragility).

**Quick Start:**
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run all tests
npm test

# Run tests with UI
npm run test:ui
```

**Test Categories:**
- **Basic Overlay Tests** - Core functionality (9 tests)
- **Fact-Checking Tests** - Mocked provider responses (8 tests)
- **Enhanced Context Tests** - Wikipedia/Twitter lookup behavior (28 tests)
- **Extension Tests** - Background/content integration (18 tests)
- **Extension Validation Tests** - Manifest and packaging (15 tests)
- **Performance Tests** - < 200ms load time (8 tests)
- **Smoke Tests** - Minimal load checks (6 tests)
- **Anti-Fragility Tests** - Edge cases and resilience (11 tests)

**Key Features:**
- 🚫 No live API calls (all responses mocked)
- ⚡ Performance guardrails (< 200ms overlay load)
- 🎯 Resilient selectors (works with HTML changes)
- 📊 103 comprehensive tests

For detailed testing documentation, see [TESTING.md](TESTING.md) and [tests/README.md](tests/README.md).

### Manual Testing

1. Load the extension in developer mode
2. Visit any news website or article
3. Open the browser console to see PopFact logs
4. Watch the ticker for fact-check results

### Required Before Store Submission

1. ✅ Generate PNG icons (`GENERATE_ICONS.md`)
2. ⚠️ Host privacy policy publicly
3. ✅ Update descriptions to say "Demo"
4. ✅ Add disclaimer on install
5. ⚠️ Replace the remaining `innerHTML` usage in `content.js` with safe DOM methods
6. ⚠️ Create store screenshots
7. ⚠️ Test thoroughly

### Submission Guides

- **Quick Start:** [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) (4-hour guide)
- **Full Audit:** [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) (complete compliance)
- **Checklist:** Generated by `./prepare-production.sh`

## Roadmap

**v1.0** (Current) - Demo with Mock Data
- ✅ CNN-style ticker overlay
- ✅ Text extraction from pages
- ✅ Mock keyword-based fact-checking
- ✅ Color-coded verdicts
- ✅ Settings UI

**v1.1** (Planned) - Enhanced Demo
- [ ] Improved claim detection
- [ ] More keyword patterns
- [ ] Better ticker animation
- [ ] Keyboard shortcuts
- [ ] Dark mode support

**v2.0** (Future) - Real Fact-Checking
- [ ] Integration with fact-checking APIs (OpenAI, Claude, Google Fact Check)
- [ ] Machine learning claim classification
- [ ] Source attribution
- [ ] User-submitted fact-checks
- [ ] Browser action for per-site control

**v3.0** (Vision) - Advanced Features
- [ ] Audio transcription and fact-checking
- [ ] Video caption extraction
- [ ] Multi-language support
- [ ] Community fact-checking
- [ ] Browser-native implementation

## API Integration (Future)

The extension is designed to support real fact-checking APIs:

```javascript
// Example: OpenAI integration (not yet implemented)
async function performFactCheck(claim) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Fact-check: "${claim}"`
      }]
    })
  });
  // Process response...
}
```

See [API_INTEGRATION.md](API_INTEGRATION.md) for integration examples.

## Privacy

PopFact respects your privacy:
- ✅ All processing happens **locally** in your browser
- ✅ **No data** sent to external servers
- ✅ **No tracking** or analytics
- ✅ **No personal information** collected
- ✅ Settings stored locally only

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas for contribution:**
- Improved claim detection algorithms
- Additional keyword patterns for mock data
- UI/UX enhancements
- Real API integrations
- Documentation improvements
- Bug fixes and testing

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 PetrefiedThunder

Licensed under the Apache License, Version 2.0
```

## Acknowledgments

- Inspired by VH1's Pop-Up Video
- News ticker design inspired by CNN, BBC, Fox News
- Built with Chrome Extensions Manifest V3
- Open source community

## Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/PetrefiedThunder/PopFact/issues)
- **Discussions:** [Ask questions](https://github.com/PetrefiedThunder/PopFact/discussions)
- **Documentation:** Check the `/docs` folder or `.md` files
- **Email:** [Coming soon]

## Disclaimer (Repeated for Emphasis)

**THIS EXTENSION IS FOR DEMONSTRATION PURPOSES ONLY.**

PopFact uses heuristic keyword matching and lightweight open-knowledge lookups—not verified fact-checking services. Results are mock/demo data and should NOT be considered factual. Always verify important information through authoritative fact-checking sources like Snopes, FactCheck.org, or PolitiFact.

By installing this extension, you acknowledge:
- Results are mock/demonstration data
- Extension should NOT be used for actual fact verification
- You will NOT rely on results for important decisions
- You understand this is a proof-of-concept only

---

**Made with ❤️ for truth, accuracy, and good UI/UX**

**Status:** Demo/Proof-of-Concept | **Version:** 1.0.0 | **Updated:** 2026-10-12
