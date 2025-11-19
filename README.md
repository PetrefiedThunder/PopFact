# PopFact - Real-time Fact Checker Browser Extension

PopFact is a browser extension that provides real-time fact-checking for web content, including text, audio, and video. Inspired by Pop-Up Video and news network tickers, it displays verified information in a continuous scroll at the bottom of your browser.

## Features

🔍 **Multi-Source Fact-Checking**
- Analyzes text content on web pages
- Transcribes and fact-checks audio content
- Processes video content for declarative statements

📺 **News Ticker Display**
- Continuous scroll at the bottom of the screen
- Color-coded verdicts (✓ True, ✗ False, ! Mixed, ? Unverified)
- Non-intrusive design that can be toggled on/off

⚡ **Real-time Processing**
- Automatic detection of declarative statements
- Background processing with intelligent caching
- Configurable confidence thresholds
- Uses open knowledge sources (Wikipedia + Twitter context) by default so you can fact-check without private API keys

🎛️ **Customizable Settings**
- Choose which content types to monitor
- Adjust ticker speed and appearance
- Configure fact-checking API provider

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/PetrefiedThunder/PopFact.git
   cd PopFact
   ```

2. Generate icon files:
   ```bash
   cd icons
   # Use ImageMagick or online converter to create PNG icons from icon.svg
   # See generate-icons.sh for instructions
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `PopFact` directory

4. Load the extension in Firefox:
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

### For Production

Install from the Chrome Web Store or Firefox Add-ons (coming soon).

## Configuration

### API Setup

PopFact requires a fact-checking API to verify claims. You have several options:

#### Option 1: OpenAI GPT-4 (Recommended for development)

1. Get an API key from https://platform.openai.com/
2. Click the PopFact extension icon
3. Select "OpenAI" as API Provider
4. Enter your API key
5. Click "Save Settings"

#### Option 2: Anthropic Claude

1. Get an API key from https://console.anthropic.com/
2. Configure in extension settings
3. Modify `background.js` to use Claude API format

#### Option 3: Google Fact Check Tools API

1. Enable the API at https://console.cloud.google.com/
2. Get your API key
3. Configure in extension settings

#### Option 4: Custom Fact-Checking API

Implement your own fact-checking service:

1. Update the `performFactCheck()` method in `background.js`
2. Format the API response to match the expected structure:
   ```javascript
   {
     claim: string,
     verdict: 'TRUE' | 'FALSE' | 'MIXED' | 'UNVERIFIED',
     explanation: string,
     confidence: number, // 0-1
     sources: string[],
     timestamp: number
   }
   ```

## Usage

1. **Automatic Monitoring**: Once installed, PopFact automatically monitors web pages for declarative statements

2. **Toggle Overlay**: Click the floating button in the bottom-right to show/hide the ticker

3. **View Results**: Fact-checked claims scroll across the bottom with color-coded verdicts

4. **Configure Settings**: Click the extension icon to access settings and statistics
5. **Send Wrap-up Email**: From the popup, choose "Send Wrap-up Email" to launch an email draft with a spreadsheet-style summary of the latest fact checks

## How It Works

### Text Analysis

1. **Content Extraction**: The content script scans the page for text nodes
2. **Sentence Detection**: Text is split into sentences using pattern matching
3. **Declarative Filtering**: Sentences are filtered for factual claims
4. **Fact Checking**: Claims are sent to the background service for verification
5. **Display**: Results appear in the ticker with appropriate verdicts

### Audio/Video Processing

1. **Media Detection**: The extension monitors `<audio>` and `<video>` elements
2. **Transcription**: Audio is transcribed using Web Speech API or external service
3. **Analysis**: Transcribed text is processed like regular text content
4. **Real-time Updates**: Facts appear in the ticker as media plays

### Fact-Checking Pipeline

```
Page Content → Extract Claims → Background Service → API Request
                                                          ↓
Display Ticker ← Format Results ← Cache Results ← API Response
```

## Architecture

```
PopFact/
├── manifest.json          # Extension configuration
├── content.js            # Content script (injected into pages)
├── background.js         # Service worker (fact-checking logic)
├── overlay.css           # Ticker styling
├── popup.html            # Settings UI
├── popup.css             # Settings styling
├── popup.js              # Settings logic
└── icons/                # Extension icons
    ├── icon.svg
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

### Prerequisites

- Node.js 18+ (for development tools)
- Chrome or Firefox browser
- API key for fact-checking service

### Testing

PopFact includes a comprehensive QA test suite built with Playwright.

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
- **Fact-Checking Tests** - Mocked AI responses (9 tests)
- **Performance Tests** - < 200ms load time (8 tests)
- **Anti-Fragility Tests** - Edge cases and resilience (11 tests)

**Key Features:**
- 🚫 No live API calls (all responses mocked)
- ⚡ Performance guardrails (< 200ms overlay load)
- 🎯 Resilient selectors (works with HTML changes)
- 📊 36 comprehensive tests

For detailed testing documentation, see [TESTING.md](TESTING.md) and [tests/README.md](tests/README.md).

### Manual Testing

1. Load the extension in developer mode
2. Visit any news website or article
3. Open the browser console to see PopFact logs
4. Watch the ticker for fact-check results

### Debugging

- Enable console logging in `background.js` and `content.js`
- Use Chrome DevTools to inspect the overlay element
- Check the background service worker console for API errors

## API Integration Examples

### OpenAI Integration

```javascript
async performFactCheck(claim) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOUR_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a fact-checking assistant. Analyze claims and respond with TRUE, FALSE, MIXED, or UNVERIFIED.'
        },
        {
          role: 'user',
          content: `Fact-check: "${claim}"`
        }
      ]
    })
  });

  const data = await response.json();
  // Parse and return formatted result
}
```

### Claude Integration

```javascript
async performFactCheck(claim) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': YOUR_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Fact-check this claim: "${claim}"`
      }]
    })
  });

  const data = await response.json();
  // Parse and return formatted result
}
```

## Privacy & Security

- **No Data Collection**: PopFact does not collect or store personal information
- **Local Processing**: Text extraction happens locally in your browser
- **API Communication**: Only claims are sent to fact-checking APIs
- **Cache Management**: Results are cached locally to minimize API calls
- **Optional Features**: All monitoring can be disabled in settings

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Support for more fact-checking APIs
- [ ] Machine learning-based claim detection
- [ ] Browser-native speech recognition
- [ ] Multi-language support
- [ ] Customizable overlay themes
- [ ] Export fact-check history
- [ ] Integration with academic databases
- [ ] Community-sourced fact-checking

## Known Limitations

- Audio transcription requires external API (not yet implemented)
- Video analysis is limited to embedded captions/transcripts
- Fact-checking accuracy depends on the configured API
- Some dynamic content may not be detected immediately
- Rate limiting may apply based on API provider

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by VH1's Pop-Up Video
- News ticker design inspired by CNN, BBC, and other news networks
- Built with Chrome Extensions Manifest V3

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@popfact.example.com
- Documentation: https://github.com/PetrefiedThunder/PopFact/wiki

## Disclaimer

PopFact is a tool to assist with fact-checking and should not be the sole source of truth. Always verify important information through multiple reliable sources. The accuracy of fact-checks depends on the configured API provider and the quality of their data sources.

---

Made with ❤️ for truth and accuracy
