# Privacy Policy for PopFact Browser Extension

**Last Updated:** November 18, 2024
**Effective Date:** November 18, 2024

## Overview

PopFact ("we", "our", or "the extension") is a browser extension that provides a demonstration of fact-checking overlay functionality. This privacy policy explains how PopFact handles information when you use the extension.

## Information Collection and Use

### Data We Collect

**Local Text Analysis:**
- PopFact extracts text content from web pages you visit to identify potential factual claims
- Text is analyzed locally within your browser only
- **No text content is transmitted to external servers**
- **No text content is stored permanently**

**Settings Data:**
- User preferences (ticker speed, confidence threshold, API provider selection)
- Stored locally using Chrome's storage.sync API
- Synchronized across your devices if you're signed into Chrome
- **Never shared with third parties**

### Data We DO NOT Collect

- Personal identification information (name, email, etc.)
- Browsing history
- Credentials or passwords
- Location data
- Device identifiers beyond what Chrome provides
- IP addresses
- Analytics or tracking data

## How We Use Information

**Local Processing Only:**
- Text extraction: To identify factual claims on web pages
- Mock fact-checking: Simple keyword matching performed entirely in your browser
- Settings storage: To remember your preferences

**No Server Communication:**
- The current version (1.0.0) performs ALL operations locally
- **No data is sent to external servers**
- **No API calls are made** (uses mock/demo fact-checking only)

## Data Storage

**Temporary Storage:**
- Extracted claims: Stored in memory only during page session
- Cleared when you close the tab or refresh the page

**Persistent Storage:**
- User settings: Stored using chrome.storage.sync
- Can be cleared by removing the extension or clearing browser data

**Data Location:**
- All data remains on your local device
- Settings may sync via Chrome if you're signed in (handled by Chrome, not us)

## Data Sharing

**We Do NOT Share Data:**
- PopFact does not transmit any data to external parties
- No analytics services
- No advertising networks
- No third-party APIs (currently uses mock data only)

**Future Versions:**
If we add real fact-checking APIs, this policy will be updated to disclose:
- Which services are used
- What data is sent
- How long data is retained

## Permissions Explanation

PopFact requests the following permissions:

1. **"Read and change all your data on websites you visit"** (`<all_urls>`)
   - **Purpose:** To inject the fact-checking overlay ticker on any web page
   - **What we do:** Extract text from `<p>`, `<h1>`, `<h2>`, `<h3>` elements
   - **What we don't do:** Modify page content, track browsing, or steal data

2. **"activeTab"**
   - **Purpose:** To access the currently active tab
   - **What we do:** Inject content script when page loads
   - **What we don't do:** Access tabs in the background

3. **"storage"**
   - **Purpose:** To save your settings preferences
   - **What we do:** Store ticker speed, confidence level, API selection
   - **What we don't do:** Store personal information or browsing data

4. **"scripting"**
   - **Purpose:** To inject the overlay UI into web pages
   - **What we do:** Add ticker bar at bottom of pages
   - **What we don't do:** Execute arbitrary code or modify page functionality

## User Rights

**You Can:**
- **Disable the extension** at any time via chrome://extensions/
- **Remove the extension** completely (deletes all stored data)
- **Clear settings** by clearing browser data
- **View source code** on GitHub: https://github.com/PetrefiedThunder/PopFact

**You Have the Right to:**
- Know what data is collected (detailed above)
- Access your data (stored locally in chrome.storage)
- Delete your data (remove extension or clear browser data)
- Opt-out entirely (disable or uninstall extension)

## Children's Privacy

PopFact does not knowingly collect information from children under 13. The extension is not directed at children. If you believe a child has used this extension, please contact us.

## Security

**Local-Only Processing:**
- All fact-checking happens in your browser
- No data transmission means no interception risk
- No server-side storage means no database breach risk

**Code Transparency:**
- Source code is publicly available
- No obfuscation or minification
- Auditable by security researchers

## Demo/Mock Functionality Notice

**IMPORTANT:** The current version (1.0.0) uses **mock fact-checking** for demonstration purposes only:

- Fact-check results are based on simple keyword matching
- **NOT real fact verification**
- Should not be relied upon for accurate information
- Intended for demonstration and educational purposes

Results displayed in the ticker are generated locally using predefined heuristics and do not represent actual fact-checking from authoritative sources.

## Changes to Privacy Policy

We may update this privacy policy from time to time. Changes will be posted:
- In this document with updated "Last Updated" date
- On the extension's store listing
- In the extension's GitHub repository

**Material changes** (e.g., adding data collection) will be highlighted in the extension update notes.

## Third-Party Services

**Current Version (1.0.0):**
- No third-party services are used
- No external APIs are called
- No analytics or tracking services

**Future Versions:**
If we integrate fact-checking APIs (OpenAI, Claude, Google Fact Check, etc.), we will:
- Update this policy before release
- Disclose which services are used
- Explain what data is sent
- Provide opt-out options

## Cookies and Tracking

**PopFact does NOT:**
- Use cookies
- Use tracking pixels
- Use analytics (Google Analytics, etc.)
- Use fingerprinting techniques
- Track your browsing across sites

## Data Retention

**Session Data:** Deleted when tab is closed or page is refreshed
**Settings:** Retained until extension is removed or browser data is cleared
**No Long-Term Storage:** We do not maintain any databases or logs

## California Privacy Rights (CCPA)

If you are a California resident:
- **Right to Know:** We collect no personal information
- **Right to Delete:** Remove extension to delete all data
- **Right to Opt-Out:** Disable or uninstall extension
- **Non-Discrimination:** Not applicable (free extension)

## GDPR Compliance (EU Users)

If you are in the European Union:
- **Legal Basis:** Consent (by installing extension)
- **Data Controller:** PopFact Extension Developer
- **Data Processor:** None (no external processing)
- **Data Transfer:** No cross-border transfer (all local)
- **Right to Access:** All data is local and accessible to you
- **Right to Erasure:** Remove extension to delete data

## Contact Information

For privacy concerns or questions:
- **GitHub Issues:** https://github.com/PetrefiedThunder/PopFact/issues
- **Email:** [Add your support email]
- **Developer:** PetrefiedThunder

## Open Source

PopFact is open source under the Apache 2.0 License:
- **Source Code:** https://github.com/PetrefiedThunder/PopFact
- **License:** Apache License 2.0
- **Transparency:** All code is publicly auditable

## Consent

By installing and using PopFact, you consent to this privacy policy. If you do not agree, please do not install or use the extension.

## Summary (TL;DR)

✅ **We collect:** Text from pages (processed locally, not sent anywhere)
✅ **We store:** Your settings (locally on your device)
❌ **We don't collect:** Personal info, browsing history, or any identifiable data
❌ **We don't share:** Anything (no third parties involved)
❌ **We don't track:** Your activity across sites
✅ **You control:** All your data (remove extension = delete everything)
✅ **Open source:** Code is public and auditable
⚠️ **Demo only:** Current fact-checking is mock/demonstration only

---

**Version:** 1.0
**Last Reviewed:** November 18, 2024
**Next Review:** [Set review date]

For the full text of this policy, visit: [Add URL where this will be hosted]
