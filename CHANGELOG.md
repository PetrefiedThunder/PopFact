# Changelog

All notable changes to PopFact will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Audio transcription for video/audio content
- Multi-language support
- Machine learning-based claim detection
- Community fact-checking features
- Chrome Web Store release
- Firefox Add-ons release

## [1.0.0] - 2024-11-15

### Added
- Initial release of PopFact browser extension
- Real-time fact-checking overlay with news ticker display
- Automatic text content extraction and analysis
- Declarative statement detection and filtering
- Support for multiple fact-checking API providers:
  - OpenAI GPT-4
  - Anthropic Claude
  - Google Fact Check Tools
  - Custom API integration
- Configurable settings popup with:
  - API provider selection
  - Content type toggles (text, audio, video)
  - Ticker speed control
  - Confidence threshold adjustment
- Color-coded fact-check verdicts:
  - ✓ True (green)
  - ✗ False (red)
  - ! Mixed (yellow)
  - ? Unverified (gray)
- Intelligent caching system to reduce API calls
- Background service worker for efficient processing
- Toggle button to show/hide overlay
- Chrome and Firefox compatibility (Manifest V3)
- Responsive design that works on all screen sizes
- Media element detection (audio/video) - placeholder for future transcription
- Statistics tracking (claims checked count)
- Clear cache functionality

### Documentation
- Comprehensive README with installation and usage instructions
- API integration guide with examples for major providers
- Contributing guidelines
- Changelog
- MIT License

### Technical Features
- Mutation observer for dynamic content monitoring
- Request queuing system with rate limiting
- Exponential backoff for failed requests
- Local storage for settings and cache
- Secure API key storage
- Cross-origin request handling

## [0.1.0] - Development

### Initial Development
- Project setup and structure
- Core concept and design
- Proof of concept implementation

---

## Version History

- **1.0.0**: First public release with core fact-checking features
- **0.1.0**: Internal development and testing

## Upcoming Versions

### [1.1.0] - Planned
- Enhanced claim detection using NLP
- Improved ticker animation performance
- Source attribution display
- Keyboard shortcuts
- Export fact-check history

### [1.2.0] - Planned
- Audio transcription integration
- Video caption extraction
- Real-time voice fact-checking
- Multiple language support

### [2.0.0] - Future
- Machine learning model for claim classification
- Community-sourced fact-checking
- Browser-native implementation
- Mobile browser support

---

For details on each release, see the [Releases](https://github.com/PetrefiedThunder/PopFact/releases) page.
