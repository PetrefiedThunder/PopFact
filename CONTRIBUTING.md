# Contributing to PopFact

Thank you for your interest in contributing to PopFact! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/PetrefiedThunder/PopFact/issues)
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser version and OS
   - Screenshots if applicable

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would be valuable
4. Include mockups or examples if possible

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/PopFact.git
cd PopFact

# Create a branch
git checkout -b feature/my-feature

# Make changes and test in browser
# Load unpacked extension in chrome://extensions

# Commit changes
git add .
git commit -m "Add: descriptive commit message"

# Push to your fork
git push origin feature/my-feature
```

## Code Style

### JavaScript

- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Use meaningful variable names
- Add comments for complex logic
- Follow existing code patterns

Example:
```javascript
// Good
const claimText = extractClaimFromSentence(sentence);

// Avoid
var x = extract(s);
```

### CSS

- Use kebab-case for class names
- Prefix all PopFact classes with `popfact-`
- Keep specificity low
- Use CSS variables for colors

Example:
```css
.popfact-ticker-container {
  background: var(--popfact-bg-color);
}
```

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Extension loads without errors
- [ ] Text extraction works on various websites
- [ ] Ticker displays correctly
- [ ] Settings save and apply properly
- [ ] No console errors
- [ ] Works in both Chrome and Firefox
- [ ] Tested with different API providers
- [ ] Responsive to different screen sizes

## Areas for Contribution

### High Priority

- [ ] Improved claim detection algorithm
- [ ] Audio transcription integration
- [ ] Video caption extraction
- [ ] Multi-language support
- [ ] Performance optimizations

### Medium Priority

- [ ] Additional API integrations
- [ ] Customizable themes
- [ ] Export/import settings
- [ ] Fact-check history viewer
- [ ] Browser action shortcuts

### Documentation

- [ ] API integration examples
- [ ] Video tutorials
- [ ] Translation of docs
- [ ] Code comments
- [ ] Wiki articles

## Project Structure

```
PopFact/
├── manifest.json       # Extension metadata
├── content.js         # Injected into web pages
├── background.js      # Service worker
├── overlay.css        # Ticker styles
├── popup.html/js/css  # Settings UI
└── icons/             # Extension icons
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
Add: New feature
Fix: Bug fix
Update: Improvement to existing feature
Refactor: Code restructuring
Docs: Documentation changes
Style: Formatting, no code change
Test: Adding tests
```

Examples:
```
Add: Support for Google Fact Check API
Fix: Ticker animation stuttering on Firefox
Update: Improve claim detection accuracy
Docs: Add API integration examples
```

## Questions?

- Open a [Discussion](https://github.com/PetrefiedThunder/PopFact/discussions)
- Check the [Wiki](https://github.com/PetrefiedThunder/PopFact/wiki)
- Email: dev@popfact.example.com

Thank you for contributing to PopFact! 🎉
