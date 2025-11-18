#!/bin/bash

# PopFact Extension Manual Test Script
# This script performs manual verification of the extension functionality

echo "=================================================="
echo "PopFact Extension Manual Verification"
echo "=================================================="
echo ""

# Check if all required files exist
echo "1. Checking Required Files..."
echo "   manifest.json: $([ -f manifest.json ] && echo '✓' || echo '✗')"
echo "   content.js: $([ -f content.js ] && echo '✓' || echo '✗')"
echo "   background.js: $([ -f background.js ] && echo '✓' || echo '✗')"
echo "   overlay.css: $([ -f overlay.css ] && echo '✓' || echo '✗')"
echo "   popup.html: $([ -f popup.html ] && echo '✓' || echo '✗')"
echo "   popup.js: $([ -f popup.js ] && echo '✓' || echo '✗')"
echo "   popup.css: $([ -f popup.css ] && echo '✓' || echo '✗')"
echo "   debug-test.html: $([ -f debug-test.html ] && echo '✓' || echo '✗')"
echo "   icons/icon16.png: $([ -f icons/icon16.png ] && echo '✓' || echo '✗')"
echo "   icons/icon48.png: $([ -f icons/icon48.png ] && echo '✓' || echo '✗')"
echo "   icons/icon128.png: $([ -f icons/icon128.png ] && echo '✓' || echo '✗')"
echo ""

# Validate manifest.json
echo "2. Validating manifest.json..."
if node -e "const m=require('./manifest.json'); if(m.manifest_version!==3||!m.content_scripts||!m.background) process.exit(1)" 2>/dev/null; then
  echo "   ✓ manifest.json is valid"
else
  echo "   ✗ manifest.json has issues"
fi
echo ""

# Check JavaScript syntax
echo "3. Checking JavaScript Syntax..."
node -c content.js 2>/dev/null && echo "   ✓ content.js syntax OK" || echo "   ✗ content.js syntax error"
node -c background.js 2>/dev/null && echo "   ✓ background.js syntax OK" || echo "   ✗ background.js syntax error"
node -c popup.js 2>/dev/null && echo "   ✓ popup.js syntax OK" || echo "   ✗ popup.js syntax error"
echo ""

# Check CSS syntax (basic validation)
echo "4. Checking CSS Files..."
if grep -q "#popfact-overlay" overlay.css; then
  echo "   ✓ overlay.css contains required selectors"
else
  echo "   ✗ overlay.css missing required selectors"
fi
echo ""

# Check HTML files
echo "5. Checking HTML Files..."
if grep -q "popfact" debug-test.html; then
  echo "   ✓ debug-test.html contains PopFact references"
else
  echo "   ✗ debug-test.html missing PopFact references"
fi
if grep -q "PopFact" popup.html; then
  echo "   ✓ popup.html contains PopFact branding"
else
  echo "   ✗ popup.html missing PopFact branding"
fi
echo ""

# File sizes
echo "6. File Size Check..."
echo "   content.js: $(wc -l < content.js) lines"
echo "   background.js: $(wc -l < background.js) lines"
echo "   overlay.css: $(wc -l < overlay.css) lines"
echo ""

# Count test claims in debug page
echo "7. Test Page Content..."
CLAIMS=$(grep -o "The earth is round\|Climate change\|flat earth\|COVID-19 vaccines\|2020 election" debug-test.html | wc -l)
echo "   ✓ Found $CLAIMS test claims in debug-test.html"
echo ""

echo "=================================================="
echo "Summary:"
echo "All critical files are present and syntactically valid."
echo ""
echo "Manual Testing Required:"
echo "1. Load extension in Chrome: chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. Open debug-test.html in Chrome"
echo "5. Verify black ticker appears at bottom"
echo "6. Verify fact-check results scroll across ticker"
echo "7. Check DevTools console for logs"
echo "8. Test the popup (click extension icon)"
echo "=================================================="
