# PopFact Demo - Fact-Checking Overlay Concept

> ⚠️ **IMPORTANT:** This is a **demonstration/proof-of-concept** extension that uses mock keyword matching, NOT real fact-checking. Do not rely on results for accurate information.

PopFact is a browser extension that demonstrates a CNN-style fact-checking ticker overlay. It showcases the UI/UX concept of real-time fact verification displays, but currently uses simple pattern matching for demonstration purposes only.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](manifest.json)
[![Firefox](https://img.shields.io/badge/Firefox-Compatible-orange.svg)](manifest.json)

## ⚠️ Disclaimer

**PopFact is a DEMONSTRATION ONLY:**
- Uses simple keyword matching (e.g., "climate" → TRUE, "flat earth" → FALSE)
- Does NOT connect to real fact-checking databases
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

⚡ **Local Processing**
- All analysis happens in your browser
- No data sent to external servers
- Fast, instant results
- Works offline

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

2. **Generate PNG icons** (required):

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
4. **Click extension icon** to access settings

The ticker will automatically:
- Extract text from `<p>`, `<h1>`, `<h2>`, `<h3>` elements
- Identify up to 5 potential factual claims
- Match them against keyword patterns
- Display results in the scrolling ticker

## How It Works

### Text Extraction
```javascript
1. Scan page for paragraph and heading elements
2. Split text into sentences
3. Filter for declarative statements (>40 chars, >6 words)
4. Send first 5 claims to background script
```

### Mock Fact-Checking
```javascript
1. Normalize claim text to lowercase
2. Check for keyword patterns:
   - "covid" → MIXED
   - "2020 election" → FALSE
   - "earth is round", "vaccines work" → TRUE
   - "climate", "warming" → TRUE
   - "flat earth" → FALSE
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

```
PopFact/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (mock fact-checking)
├── content.js              # Content script (overlay injection)
├── overlay.css             # Ticker styling
├── popup.html/js/css       # Settings UI
├── disclaimer.html         # First-install disclaimer
├── icons/                  # Extension icons
│   ├── icon.svg           # Source icon
│   └── icon*.png          # Generated PNG icons
├── README.md              # This file
├── PRIVACY_POLICY.md      # Privacy policy
├── PRODUCTION_AUDIT.md    # Store compliance audit
├── QUICK_START_PRODUCTION.md  # Submission guide
└── LICENSE                # Apache 2.0 license
```

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

### Current Status

❌ **NOT READY FOR PRODUCTION** - Critical issues must be fixed first.

See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for detailed status.

### Required Before Store Submission

1. ✅ Generate PNG icons (`GENERATE_ICONS.md`)
2. ⚠️ Host privacy policy publicly
3. ✅ Update descriptions to say "Demo"
4. ✅ Add disclaimer on install
5. ✅ Replace innerHTML with safe DOM methods
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

PopFact uses simple keyword matching and does NOT provide real fact-checking. Results are mock data generated locally and should NOT be considered factual. Always verify important information through authoritative fact-checking sources like Snopes, FactCheck.org, or PolitiFact.

By installing this extension, you acknowledge:
- Results are mock/demonstration data
- Extension should NOT be used for actual fact verification
- You will NOT rely on results for important decisions
- You understand this is a proof-of-concept only

---

**Made with ❤️ for truth, accuracy, and good UI/UX**

**Status:** Demo/Proof-of-Concept | **Version:** 1.0.0 | **Updated:** 2024-11-18
