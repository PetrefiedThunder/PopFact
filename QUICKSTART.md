# PopFact Quick Start Guide

Get PopFact up and running in 5 minutes!

## Installation

### Step 1: Load the Extension

**Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `PopFact` folder
5. The PopFact icon should appear in your extensions toolbar

**Firefox:**
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the PopFact folder and select `manifest.json`
4. The extension will be loaded temporarily

### Step 2: Generate Icons (Optional)

For a complete installation, you need PNG icons:

```bash
cd icons

# If you have ImageMagick:
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png

# Or use an online converter:
# https://cloudconvert.com/svg-to-png
```

**Note:** The extension will work without PNG icons, but you'll see placeholder icons.

## Configuration

### Quick Setup (Demo Mode)

The extension works out of the box with mock fact-checking:

1. Click the PopFact extension icon
2. Keep "API Provider" set to "Mock (Demo)"
3. Click "Save Settings"
4. Visit any news website
5. Watch the ticker at the bottom!

### Production Setup (OpenAI)

For real fact-checking with OpenAI GPT-4:

1. Get an API key:
   - Go to https://platform.openai.com/
   - Sign up or log in
   - Navigate to API keys
   - Create new secret key
   - Copy the key

2. Configure PopFact:
   - Click the PopFact extension icon
   - Select "OpenAI" as API Provider
   - Paste your API key
   - Click "Save Settings"

3. Test it:
   - Visit a news article
   - The ticker will show real fact-checks!

## Usage

### Basic Usage

1. **Visit a webpage** with text content (news article, blog post, etc.)
2. **Wait a moment** for PopFact to analyze the content
3. **Watch the ticker** at the bottom of the screen for fact-check results

### Toggle the Overlay

- Click the **circular button** in the bottom-right corner to show/hide the ticker
- The button shows ▼ when visible, ▲ when hidden

### View Statistics

1. Click the PopFact extension icon
2. See "Claims Checked" count
3. Click "View Statistics" for details

### Customize Settings

Open the popup (click extension icon) to adjust:

- **Content Types**: Toggle text/audio/video monitoring
- **Ticker Speed**: Choose slow/medium/fast
- **Confidence Threshold**: Set minimum confidence level (0-100%)
- **API Provider**: Switch between different fact-checking services

## Testing

### Test on These Sites

Try PopFact on various content types:

- **News**: CNN, BBC, Reuters, New York Times
- **Blogs**: Medium, WordPress blogs
- **Social Media**: Twitter (X), Facebook posts
- **Wikipedia**: Articles with factual claims

### What to Expect

**True Claims** (Green ✓):
- "Water boils at 100°C at sea level"
- "The Earth orbits the Sun"
- Well-established scientific facts

**False Claims** (Red ✗):
- "The Earth is flat"
- Common misinformation

**Mixed Claims** (Yellow !):
- "Coffee is healthy" (depends on context)
- Partially accurate statements

**Unverified Claims** (Gray ?):
- Novel claims without established verification
- Insufficient information

## Troubleshooting

### The ticker doesn't appear

1. Refresh the page
2. Check that the extension is enabled in `chrome://extensions/`
3. Look for errors in the browser console (F12)

### No fact-checks showing

1. Make sure you're on a page with text content
2. Check that "Check text content" is enabled in settings
3. Verify your API key is correct (if using OpenAI/Claude)
4. Check browser console for API errors

### API errors

1. Verify your API key is valid
2. Check you have API credits/quota
3. Ensure you have internet connection
4. Try switching to "Mock (Demo)" mode to test

### Extension not loading

1. Make sure all files are present
2. Check `manifest.json` is valid JSON
3. Look for errors in `chrome://extensions/` page
4. Try removing and re-adding the extension

## Performance Tips

### Optimize API Usage

- Use the cache (enabled by default)
- Set higher confidence threshold to reduce API calls
- Disable audio/video if not needed
- Mock mode is free and instant

### Browser Performance

- Disable on pages you don't need fact-checking
- Clear cache periodically in settings
- Close DevTools when not debugging

## Next Steps

### Advanced Configuration

- Read [API_INTEGRATION.md](API_INTEGRATION.md) for other API providers
- Customize the ticker appearance in `overlay.css`
- Adjust claim detection logic in `content.js`

### Contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Report bugs or suggest features on GitHub
- Submit pull requests

### Stay Updated

- Watch the repository for updates
- Check [CHANGELOG.md](CHANGELOG.md) for new features
- Join discussions on GitHub

## Support

Need help?

- 📖 Read the full [README.md](README.md)
- 🔧 Check [API_INTEGRATION.md](API_INTEGRATION.md) for API setup
- 🐛 Report issues on GitHub
- 💬 Start a discussion for questions

---

**Happy fact-checking!** 🎉

Remember: PopFact is a tool to assist with verification. Always cross-reference important information with multiple reliable sources.
