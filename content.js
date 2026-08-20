// PopFact Content Script - CNN-Style Bottom Ticker with Mock Fact-Checking

const MAX_FACT_RESULTS = 50;
const MAX_PROCESSED_CLAIMS = 1000;
const MIN_CLAIM_LENGTH = 40;
const MAX_CLAIM_LENGTH = 1000;
const MIN_CLAIM_WORDS = 6;
const MAX_CLAIMS_PER_SCAN = 10;
const MUTATION_DEBOUNCE_MS = 500;

const VERDICT_CLASSES = {
  TRUE: 'popfact-true',
  FALSE: 'popfact-false',
  MIXED: 'popfact-mixed',
  ERROR: 'popfact-error'
};

const VERDICT_ICONS = {
  TRUE: '✓',
  FALSE: '✗',
  MIXED: '⚠',
  UNVERIFIED: '?',
  ERROR: '⚠'
};

class PopFactOverlay {
  constructor() {
    this.overlay = null;
    this.tickerScroll = null;
    this.isVisible = true;
    this.tickerPaused = false;
    this.factResults = [];
    this.processedClaims = new Set();
    this.observer = null;
    this.extractDebounceTimer = null;

    this.init();
  }

  init() {
    this.createOverlay();
    this.setupMessageListener();
    this.detectMediaElements();
    this.monitorPageContent();

    console.log('PopFact: Overlay initialized');
  }

  createOverlay() {
    if (!document.body) {
      console.error('PopFact: document.body not available');
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'popfact-overlay';
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

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'popfact-toggle';
    toggleBtn.innerHTML = '▼';
    toggleBtn.title = 'Toggle PopFact Overlay';
    toggleBtn.addEventListener('click', () => this.toggleOverlay());

    const flowToggleBtn = this.overlay.querySelector('#popfact-flow-toggle');
    if (flowToggleBtn) {
      flowToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleTickerFlow();
      });
    }

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

    this.scanForClaims();

    this.observer = new MutationObserver(() => {
      // Debounce to prevent performance issues and infinite loops
      if (this.extractDebounceTimer) {
        clearTimeout(this.extractDebounceTimer);
      }
      this.extractDebounceTimer = setTimeout(() => {
        this.scanForClaims();
      }, MUTATION_DEBOUNCE_MS);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  scanForClaims() {
    const claims = this.extractClaimsFromPage();

    claims.forEach((claim) => {
      if (this.processedClaims.has(claim)) return;

      // LRU-style eviction to bound memory usage
      if (this.processedClaims.size >= MAX_PROCESSED_CLAIMS) {
        const oldestClaim = this.processedClaims.values().next().value;
        this.processedClaims.delete(oldestClaim);
      }
      this.processedClaims.add(claim);
      this.sendForFactCheck(claim, 'text');
    });
  }

  extractClaimsFromPage() {
    if (!document.body) return [];

    const textNodes = this.getTextNodes(document.body);
    const allText = textNodes.map((node) => node.textContent).join(' ');
    const sentences = allText
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);

    return this.filterDeclarativeSentences(sentences);
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('#popfact-overlay, #popfact-toggle')) {
          return NodeFilter.FILTER_REJECT;
        }

        return node.textContent.trim().length > 10
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    return textNodes;
  }

  filterDeclarativeSentences(sentences) {
    return sentences
      .filter((sentence) => {
        const wordCount = sentence.split(/\s+/).length;
        if (
          sentence.length < MIN_CLAIM_LENGTH ||
          sentence.length > MAX_CLAIM_LENGTH ||
          wordCount < MIN_CLAIM_WORDS
        ) {
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
      })
      .slice(0, MAX_CLAIMS_PER_SCAN);
  }

  sendForFactCheck(claim, source) {
    // Strip query string and fragment to avoid leaking sensitive parameters
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

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'FACT_CHECK_RESULT') {
        if (this.factResults.length >= MAX_FACT_RESULTS) {
          this.factResults.shift();
        }
        this.factResults.push(message.data);
        this.updateTicker();
      }
    });
  }

  updateTicker() {
    if (!this.tickerScroll) return;

    this.tickerScroll.replaceChildren();

    this.factResults.forEach((result) => {
      this.addToTicker(this.buildFactItem(result));
    });
  }

  buildFactItem(result) {
    const { claim, verdict, explanation, confidence } = result;
    const verdictClass = VERDICT_CLASSES[verdict] || 'popfact-unverified';

    // Built with safe DOM methods (textContent) to prevent XSS
    const factItem = document.createElement('div');
    factItem.className = `popfact-item ${verdictClass}`;

    const icon = document.createElement('span');
    icon.className = 'popfact-item-icon';
    icon.textContent = this.getVerdictIcon(verdict);
    icon.title = verdict;

    const textContainer = document.createElement('span');
    textContainer.className = 'popfact-item-text';

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

    const explanationSpan = document.createElement('span');
    explanationSpan.className = 'popfact-explanation';
    explanationSpan.textContent = explanation || verdict;

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

    return factItem;
  }

  addToTicker(factItem) {
    if (!this.tickerScroll) return;

    const loading = this.tickerScroll.querySelector('.popfact-loading');
    if (loading) {
      loading.remove();
    }

    this.tickerScroll.appendChild(factItem);

    // Clone items for seamless scrolling
    if (this.tickerScroll.children.length < 5) {
      const clone = factItem.cloneNode(true);
      this.tickerScroll.appendChild(clone);
    }
  }

  getVerdictIcon(verdict) {
    return VERDICT_ICONS[verdict] || '•';
  }

  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  detectMediaElements() {
    if (!document.body) return;

    const mediaElements = document.querySelectorAll('video, audio');
    if (mediaElements.length > 0) {
      console.log(`PopFact: Found ${mediaElements.length} media elements (transcription coming soon)`);

      chrome.runtime.sendMessage({
        type: 'MEDIA_DETECTED',
        mediaType: 'video/audio',
        count: mediaElements.length
      });
    }
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
