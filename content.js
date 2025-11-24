// PopFact Content Script - CNN-Style Bottom Ticker with Mock Fact-Checking

class PopFactOverlay {
  constructor() {
    this.overlay = null;
    this.tickerScroll = null;
    this.isVisible = true;
    this.tickerPaused = false;
    this.factCheckQueue = [];
    this.factResults = []; // Store fact check results
    this.processedClaims = new Set();
    this.maxProcessedClaims = 1000; // Prevent unbounded memory growth
    this.observer = null;
    this.mediaObserver = null;
    this.extractDebounceTimer = null;

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
    // Validate document.body exists
    if (!document.body) {
      console.error('PopFact: document.body not available');
      return;
    }

    // Create main overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'popfact-overlay';

    // Create ticker structure
    this.overlay.innerHTML = `
      <div class="popfact-ticker-container">
        <div class="popfact-ticker-label">POPFACT</div>
        <div class="popfact-ticker-content">
          <div class="popfact-ticker-scroll" id="popfact-ticker-scroll">
            <div class="popfact-loading">Scanning page for claims to verify...</div>
          </div>
        </div>
        <div class="popfact-status">
          <span class="popfact-status-dot"></span>
          <span class="popfact-status-text" id="popfact-status-text">ACTIVE</span>
          <button id="popfact-flow-toggle" class="popfact-flow-toggle" aria-pressed="false" title="Start or stop the ticker">★ Stop</button>
        </div>
      </div>
    `;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'popfact-toggle';
    toggleBtn.innerHTML = '▼';
    toggleBtn.title = 'Toggle PopFact Overlay';
    toggleBtn.addEventListener('click', () => this.toggleOverlay());

    // Bind ticker control
    const flowToggleBtn = this.overlay.querySelector('#popfact-flow-toggle');
    if (flowToggleBtn) {
      flowToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleTickerFlow();
      });
    }

    // Add to page
    document.body.appendChild(this.overlay);
    document.body.appendChild(toggleBtn);

    this.tickerScroll = document.getElementById('popfact-ticker-scroll');
  }

  toggleTickerFlow() {
    if (!this.tickerScroll) return;

    this.tickerPaused = !this.tickerPaused;
    this.tickerScroll.classList.toggle('paused', this.tickerPaused);

    const toggleBtn = document.getElementById('popfact-flow-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.tickerPaused ? '▶ Start' : '★ Stop';
      toggleBtn.setAttribute('aria-pressed', this.tickerPaused ? 'true' : 'false');
    }

    const statusText = document.getElementById('popfact-status-text');
    if (statusText) {
      statusText.textContent = this.tickerPaused ? 'PAUSED' : 'ACTIVE';
    }

    const statusDot = this.overlay?.querySelector('.popfact-status-dot');
    if (statusDot) {
      statusDot.classList.toggle('paused', this.tickerPaused);
    }
  }

  toggleOverlay() {
    if (!this.overlay) return;

    this.isVisible = !this.isVisible;
    const toggleBtn = document.getElementById('popfact-toggle');
    if (!toggleBtn) return;

    if (this.isVisible) {
      this.overlay.classList.remove('hidden');
      toggleBtn.classList.remove('overlay-hidden');
      toggleBtn.innerHTML = '▼';
    } else {
      this.overlay.classList.add('hidden');
      toggleBtn.classList.add('overlay-hidden');
      toggleBtn.innerHTML = '▲';
    }
  }

  monitorPageContent() {
    if (!document.body) return;

    // Extract initial text content
    this.extractTextClaims();

    // Watch for dynamic content changes with debouncing
    this.observer = new MutationObserver((mutations) => {
      // Debounce to prevent performance issues and infinite loops
      if (this.extractDebounceTimer) {
        clearTimeout(this.extractDebounceTimer);
      }
      this.extractDebounceTimer = setTimeout(() => {
        this.extractTextClaims();
      }, 500);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  extractTextClaims() {
    if (!document.body) return;

    // Extract declarative statements from page text
    const textNodes = this.getTextNodes(document.body);
    const sentences = this.extractSentences(textNodes);
    const declarativeSentences = this.filterDeclarativeSentences(sentences);

    // Send to background for fact-checking
    declarativeSentences.forEach(claim => {
      if (!this.processedClaims.has(claim) && claim.length > 20 && claim.length < 1000) {
        // Implement LRU eviction for processedClaims Set
        if (this.processedClaims.size >= this.maxProcessedClaims) {
          const firstClaim = this.processedClaims.values().next().value;
          this.processedClaims.delete(firstClaim);
        }
        this.processedClaims.add(claim);
        this.sendForFactCheck(claim, 'text');
      }
    });
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and popfact elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.id && parent.id.startsWith('popfact-')) {
            return NodeFilter.FILTER_REJECT;
          }

          const text = node.textContent.trim();
          if (text.length > 10) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

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

    // Split into sentences (basic split on period, question mark, exclamation)
    const sentences = allText.split(/[.!?]+/);

    // Filter to sentences > 40 chars and > 6 words
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const wordCount = trimmed.split(/\s+/).length;

      if (trimmed.length > 40 && wordCount > 6) {
        claims.push(trimmed);
      }

      // Limit to 5 claims max to avoid overwhelming the API
      if (claims.length >= 5) break;
    }

    return claims;
  }

  monitorMediaContent() {
    if (!document.body) return;

    // Monitor video and audio elements
    const mediaElements = document.querySelectorAll('video, audio');

    // Log media elements found (future: transcription support)
    if (mediaElements.length > 0) {
      console.log(`PopFact: Found ${mediaElements.length} media elements (transcription coming soon)`);
    }

    // Watch for new media elements (only create once)
    if (!this.mediaObserver) {
      this.mediaObserver = new MutationObserver(() => {
        this.monitorMediaContent();
      });

      this.mediaObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
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

  sendForFactCheck(claim, source) {
    // Sanitize URL to prevent leaking sensitive parameters
    let sanitizedUrl = '';
    try {
      const url = new URL(window.location.href);
      sanitizedUrl = url.origin + url.pathname;
    } catch (e) {
      sanitizedUrl = 'unknown';
    }

    chrome.runtime.sendMessage({
      type: 'FACT_CHECK_REQUEST',
      claim: claim,
      source: source,
      url: sanitizedUrl,
      timestamp: Date.now()
    });
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
    if (!this.tickerScroll) return;
    
    // Efficient clearing of all children
    this.tickerScroll.replaceChildren();

    // Process each fact-check result with enhanced display
    this.factResults.forEach(result => {
      const { claim, verdict, explanation, confidence, sources } = result;
      
      // Determine CSS class based on verdict
      let verdictClass = 'popfact-unverified';
      if (verdict === 'TRUE') verdictClass = 'popfact-true';
      else if (verdict === 'FALSE') verdictClass = 'popfact-false';
      else if (verdict === 'MIXED') verdictClass = 'popfact-mixed';
      else if (verdict === 'ERROR') verdictClass = 'popfact-error';

      // Create fact check item using safe DOM methods to prevent XSS
      const factItem = document.createElement('div');
      factItem.className = `popfact-item ${verdictClass}`;

      const icon = document.createElement('span');
      icon.className = 'popfact-item-icon';
      icon.textContent = this.getVerdictIcon(verdict);
      icon.title = verdict;

      const textContainer = document.createElement('span');
      textContainer.className = 'popfact-item-text';

      // Create claim header with verdict badge
      const claimHeader = document.createElement('span');
      claimHeader.className = 'popfact-claim-header';
      
      const verdictBadge = document.createElement('span');
      verdictBadge.className = 'popfact-verdict-badge';
      verdictBadge.textContent = verdict;
      
      const claimSpan = document.createElement('span');
      claimSpan.className = 'popfact-claim';
      claimSpan.textContent = this.truncate(claim, 120);
      claimSpan.title = claim; // Full claim on hover
      
      claimHeader.appendChild(verdictBadge);
      claimHeader.appendChild(document.createTextNode(' '));
      claimHeader.appendChild(claimSpan);

      // Create detailed explanation span (no truncation for full context)
      const explanationSpan = document.createElement('span');
      explanationSpan.className = 'popfact-explanation';
      explanationSpan.textContent = explanation || verdict;
      
      // Add confidence indicator if available
      if (confidence !== undefined && confidence > 0) {
        const confidenceSpan = document.createElement('span');
        confidenceSpan.className = 'popfact-confidence';
        confidenceSpan.textContent = ` [Confidence: ${Math.round(confidence * 100)}%]`;
        explanationSpan.appendChild(confidenceSpan);
      }

      textContainer.appendChild(claimHeader);
      textContainer.appendChild(document.createTextNode(' • '));
      textContainer.appendChild(explanationSpan);

      const separator = document.createElement('span');
      separator.className = 'popfact-separator';
      separator.textContent = ' ▪ ';

      factItem.appendChild(icon);
      factItem.appendChild(textContainer);
      factItem.appendChild(separator);

      // Add to ticker
      this.addToTicker(factItem);
    });
  }

  addToTicker(factItem) {
    // Remove loading message if present (with null check)
    if (this.tickerScroll) {
      const loading = this.tickerScroll.querySelector('.popfact-loading');
      if (loading) {
        loading.remove();
      }

      // Add new fact item
      this.tickerScroll.appendChild(factItem);

      // Clone items for seamless scrolling
      if (this.tickerScroll.children.length < 5) {
        const clone = factItem.cloneNode(true);
        this.tickerScroll.appendChild(clone);
      }
    }
  }

  getVerdictIcon(verdict) {
    // Return appropriate icon for each verdict type
    switch (verdict) {
      case 'TRUE':
        return '✓';
      case 'FALSE':
        return '✗';
      case 'MIXED':
        return '⚠';
      case 'UNVERIFIED':
        return '?';
      case 'ERROR':
        return '⚠';
      default:
        return '•';
    }
  }

  truncate(text, maxLength) {
    // Truncate text to maxLength and add ellipsis if needed
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  detectMediaElements() {
    // Detect video and audio elements on the page
    if (!document.body) return;

    const mediaElements = document.querySelectorAll('video, audio');
    if (mediaElements.length > 0) {
      console.log(`PopFact: Found ${mediaElements.length} media elements (transcription coming soon)`);
      
      // Send message to background for future transcription support
      chrome.runtime.sendMessage({
        type: 'MEDIA_DETECTED',
        mediaType: 'video/audio',
        count: mediaElements.length
      });
    }
  }

  extractSentences(textNodes) {
    // Extract sentences from text nodes
    const allText = textNodes.map(node => node.textContent).join(' ');
    return allText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  filterDeclarativeSentences(sentences) {
    // Filter for declarative sentences that are likely to contain factual claims
    return sentences.filter(sentence => {
      const wordCount = sentence.split(/\s+/).length;
      // Must have reasonable length and word count
      if (sentence.length < 40 || sentence.length > 1000 || wordCount < 6) {
        return false;
      }
      
      // Skip questions
      if (sentence.includes('?')) {
        return false;
      }
      
      // Skip first-person narratives (less likely to be factual claims)
      if (/^(I |We |My |Our )/i.test(sentence)) {
        return false;
      }
      
      return true;
    }).slice(0, 10); // Limit to 10 claims to avoid overwhelming the system
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
