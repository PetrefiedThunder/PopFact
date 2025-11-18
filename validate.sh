#!/bin/bash
# PopFact Extension Validator
# Run this script to check if the extension is ready to load

echo "🔍 PopFact Extension Validator"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check required files
echo "📁 Checking required files..."

FILES=("manifest.json" "content.js" "background.js" "overlay.css" "popup.html" "popup.js" "popup.css")

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file exists"
  else
    echo -e "  ${RED}✗${NC} $file missing"
    ((ERRORS++))
  fi
done

# Check icons directory
if [ -d "icons" ]; then
  echo -e "  ${GREEN}✓${NC} icons/ directory exists"
else
  echo -e "  ${YELLOW}⚠${NC} icons/ directory missing (optional)"
  ((WARNINGS++))
fi

echo ""

# Validate JavaScript syntax
echo "📝 Validating JavaScript syntax..."

for jsfile in content.js background.js popup.js; do
  if [ -f "$jsfile" ]; then
    if node --check "$jsfile" 2>/dev/null; then
      echo -e "  ${GREEN}✓${NC} $jsfile syntax OK"
    else
      echo -e "  ${RED}✗${NC} $jsfile has syntax errors"
      ((ERRORS++))
    fi
  fi
done

echo ""

# Check manifest.json
echo "📋 Validating manifest.json..."

if [ -f "manifest.json" ]; then
  if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} manifest.json is valid JSON"

    # Check specific fields
    if grep -q '"manifest_version": 3' manifest.json; then
      echo -e "  ${GREEN}✓${NC} Manifest version 3"
    else
      echo -e "  ${RED}✗${NC} Not using Manifest V3"
      ((ERRORS++))
    fi

    if grep -q '"content_scripts"' manifest.json; then
      echo -e "  ${GREEN}✓${NC} Content scripts declared"
    else
      echo -e "  ${RED}✗${NC} No content scripts found"
      ((ERRORS++))
    fi

    if grep -q '"service_worker"' manifest.json; then
      echo -e "  ${GREEN}✓${NC} Service worker declared"
    else
      echo -e "  ${RED}✗${NC} No service worker found"
      ((ERRORS++))
    fi

  else
    echo -e "  ${RED}✗${NC} manifest.json has invalid JSON syntax"
    ((ERRORS++))
  fi
fi

echo ""

# Check file sizes
echo "📊 Checking file sizes..."

if [ -f "content.js" ]; then
  LINES=$(wc -l < content.js)
  echo "  content.js: $LINES lines"
  if [ $LINES -lt 100 ]; then
    echo -e "    ${YELLOW}⚠${NC} File seems short, expected ~167 lines"
    ((WARNINGS++))
  fi
fi

if [ -f "background.js" ]; then
  LINES=$(wc -l < background.js)
  echo "  background.js: $LINES lines"
  if [ $LINES -lt 50 ]; then
    echo -e "    ${YELLOW}⚠${NC} File seems short, expected ~71 lines"
    ((WARNINGS++))
  fi
fi

if [ -f "overlay.css" ]; then
  LINES=$(wc -l < overlay.css)
  echo "  overlay.css: $LINES lines"
  if [ $LINES -lt 50 ]; then
    echo -e "    ${YELLOW}⚠${NC} File seems short, expected ~92 lines"
    ((WARNINGS++))
  fi
fi

echo ""

# Check CSS structure
echo "🎨 Validating CSS structure..."

if [ -f "overlay.css" ]; then
  if grep -q "#popfact-overlay" overlay.css && \
     grep -q "position: fixed" overlay.css && \
     grep -q "bottom: 0" overlay.css; then
    echo -e "  ${GREEN}✓${NC} Bottom ticker structure correct"
  else
    echo -e "  ${RED}✗${NC} Missing required CSS rules"
    ((ERRORS++))
  fi

  if grep -q "@keyframes popfact-scroll" overlay.css; then
    echo -e "  ${GREEN}✓${NC} Scroll animation defined"
  else
    echo -e "  ${YELLOW}⚠${NC} Missing scroll animation"
    ((WARNINGS++))
  fi
fi

echo ""

# Check content.js structure
echo "⚙️  Validating content.js structure..."

if [ -f "content.js" ]; then
  if grep -q "class PopFactOverlay" content.js; then
    echo -e "  ${GREEN}✓${NC} PopFactOverlay class found"
  else
    echo -e "  ${RED}✗${NC} Missing PopFactOverlay class"
    ((ERRORS++))
  fi

  if grep -q "extractClaimsFromPage" content.js; then
    echo -e "  ${GREEN}✓${NC} Claim extraction function found"
  else
    echo -e "  ${RED}✗${NC} Missing extractClaimsFromPage function"
    ((ERRORS++))
  fi

  if grep -q "updateTicker" content.js; then
    echo -e "  ${GREEN}✓${NC} Ticker update function found"
  else
    echo -e "  ${RED}✗${NC} Missing updateTicker function"
    ((ERRORS++))
  fi
fi

echo ""

# Check background.js structure
echo "🔧 Validating background.js structure..."

if [ -f "background.js" ]; then
  if grep -q "performFactCheckMock" background.js; then
    echo -e "  ${GREEN}✓${NC} Mock fact-check engine found"
  else
    echo -e "  ${RED}✗${NC} Missing performFactCheckMock function"
    ((ERRORS++))
  fi

  if grep -q "FACT_CHECK_REQUEST" background.js; then
    echo -e "  ${GREEN}✓${NC} Message listener configured"
  else
    echo -e "  ${RED}✗${NC} Missing message listener"
    ((ERRORS++))
  fi
fi

echo ""
echo "================================"
echo "📊 Validation Summary"
echo "================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "🚀 Ready to load extension:"
  echo "   1. Open chrome://extensions/"
  echo "   2. Enable 'Developer mode'"
  echo "   3. Click 'Load unpacked'"
  echo "   4. Select this directory"
  echo ""
  echo "🧪 Test the extension:"
  echo "   - Open debug-test.html in Chrome"
  echo "   - Visit any news website"
  echo "   - Look for black ticker at bottom"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
  echo "Extension should work but may have minor issues."
  exit 0
else
  echo -e "${RED}❌ $ERRORS error(s), $WARNINGS warning(s)${NC}"
  echo "Please fix the errors before loading the extension."
  exit 1
fi
