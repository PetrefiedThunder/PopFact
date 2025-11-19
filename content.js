// PopFact Content Script - CNN-Style Bottom Ticker with Mock Fact-Checking

class PopFactOverlay {
  constructor() {
    this.overlay = null;
    this.tickerInner = null;
    this.factResults = [];

    this.init();
  }

  init() {
    // Create overlay UI
    this.createOverlay();

    // Listen for fact-check results from background
    this.setupMessageListener();

    // Detect media elements (coming soon message)
    this.detectMediaElements();

    // Extract and queue initial claims
    this.queueInitialFactChecks();

    console.log('PopFact: Overlay initialized');
  }

  createOverlay() {
    // Create main overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'popfact-overlay';

    // Create exact CNN-style ticker structure using safe DOM methods
    const bar = document.createElement('div');
    bar.id = 'popfact-bar';

    const brand = document.createElement('div');
    brand.className = 'popfact-brand';
    brand.textContent = 'PopFact';

    const ticker = document.createElement('div');
    ticker.className = 'popfact-ticker';

    this.tickerInner = document.createElement('div');
    this.tickerInner.id = 'popfact-ticker-inner';
    ticker.appendChild(this.tickerInner);

    const status = document.createElement('div');
    status.className = 'popfact-status';
    status.id = 'popfact-status';
    status.textContent = '⚠️ DEMO ONLY - MOCK DATA';

    bar.appendChild(brand);
    bar.appendChild(ticker);
    bar.appendChild(status);
    this.overlay.appendChild(bar);

    // Add to page
    document.body.appendChild(this.overlay);
  }

  // TASK 3: Simple claim extraction from page
  extractClaimsFromPage() {
    const claims = [];

    // Collect text from main content elements
    const elements = document.querySelectorAll('p, h1, h2, h3');
    let allText = '';

    elements.forEach(el => {
      // Skip popfact elements
      if (el.id && el.id.startsWith('popfact-')) return;
      allText += ' ' + el.textContent;
    });

    // Split into sentences on [.?!]
    const sentences = allText.split(/[.!?]+/);

    // Filter to sentences > 40 chars and > 6 words
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const wordCount = trimmed.split(/\s+/).length;

      if (trimmed.length > 40 && wordCount > 6) {
        claims.push(trimmed);
      }

      // Return at most 5 claims for demo
      if (claims.length >= 5) break;
    }

    return claims;
  }

  // TASK 3: Queue initial fact-checks
  queueInitialFactChecks() {
    const claims = this.extractClaimsFromPage();

    console.log(`PopFact: Extracted ${claims.length} claims for fact-checking`);

    claims.forEach(claim => {
      chrome.runtime.sendMessage({
        type: 'FACT_CHECK_REQUEST',
        claimText: claim
      });
    });
  }

  // TASK 4: Detect media elements (coming soon)
  detectMediaElements() {
    const hasVideo = document.querySelector('video') !== null;
    const hasAudio = document.querySelector('audio') !== null;

    if (hasVideo || hasAudio) {
      // Send a "coming soon" message to display in ticker
      chrome.runtime.sendMessage({
        type: 'FACT_CHECK_RESULT',
        data: {
          claim: 'Detected media: audio/video analysis and live captions are in development for this demo.',
          verdict: 'UNVERIFIED',
          confidence: 0,
          explanation: 'Roadmap feature.',
          sources: []
        }
      });
    }
  }

  // TASK 3: Message listener for fact-check results
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FACT_CHECK_RESULT') {
        this.factResults.push(message.data);
        this.updateTicker();
      }
    });
  }

  // TASK 3: Update ticker with fact-check results
  updateTicker() {
    // Clear existing ticker content safely
    while (this.tickerInner.firstChild) {
      this.tickerInner.removeChild(this.tickerInner.firstChild);
    }

    // Create items for each fact result
    this.factResults.forEach(result => {
      const { claim, verdict, explanation } = result;

      // Determine CSS class based on verdict
      let verdictClass = 'popfact-unverified';
      if (verdict === 'TRUE') verdictClass = 'popfact-true';
      else if (verdict === 'FALSE') verdictClass = 'popfact-false';
      else if (verdict === 'MIXED') verdictClass = 'popfact-mixed';

      // Truncate claim to max 120 chars
      const truncatedClaim = claim.length > 120
        ? claim.substring(0, 117) + '…'
        : claim;

      // Create ticker item
      const item = document.createElement('span');
      item.className = `popfact-item ${verdictClass}`;
      item.textContent = `${truncatedClaim} — ${explanation || verdict}`;

      this.tickerInner.appendChild(item);
    });

    // Duplicate items for seamless loop scrolling
    const clone = this.tickerInner.cloneNode(true);
    this.tickerInner.appendChild(clone);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopFactOverlay();
  });
} else {
  new PopFactOverlay();
}
