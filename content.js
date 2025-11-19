// PopFact Content Script - Injects overlay and monitors page content

class PopFactOverlay {
  constructor() {
    this.overlay = null;
    this.tickerScroll = null;
    this.isVisible = true;
    this.tickerPaused = false;
    this.factCheckQueue = [];
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

    // Start monitoring page content
    this.monitorPageContent();

    // Listen for fact-check results from background
    this.setupMessageListener();

    // Check for audio/video elements
    this.monitorMediaContent();

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

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node.textContent.trim());
    }

    return textNodes;
  }

  extractSentences(textNodes) {
    const sentences = [];
    const text = textNodes.join(' ');

    // Basic sentence splitting (can be enhanced with NLP)
    const splitSentences = text.match(/[^.!?]+[.!?]+/g) || [];

    splitSentences.forEach(sentence => {
      const cleaned = sentence.trim();
      if (cleaned.length > 20) {
        sentences.push(cleaned);
      }
    });

    return sentences;
  }

  filterDeclarativeSentences(sentences) {
    // Filter for declarative statements (can be enhanced with NLP)
    return sentences.filter(sentence => {
      // Basic heuristics for declarative statements
      const lower = sentence.toLowerCase();

      // Exclude questions
      if (sentence.includes('?')) return false;

      // Exclude commands (imperative)
      const imperativeWords = ['click', 'subscribe', 'buy', 'download', 'register'];
      if (imperativeWords.some(word => lower.startsWith(word))) return false;

      // Look for factual indicators
      const factualIndicators = [
        'is', 'are', 'was', 'were', 'has', 'have', 'had',
        'will', 'can', 'could', 'would', 'should',
        'according to', 'study shows', 'research indicates',
        'percent', '%', 'million', 'billion'
      ];

      return factualIndicators.some(indicator => lower.includes(indicator));
    });
  }

  monitorMediaContent() {
    if (!document.body) return;

    // Monitor video and audio elements
    const mediaElements = document.querySelectorAll('video, audio');

    mediaElements.forEach(media => {
      // Check if element already has listener
      if (!media.dataset.popfactMonitored) {
        media.dataset.popfactMonitored = 'true';

        // Extract audio for transcription when media plays
        media.addEventListener('play', () => {
          this.handleMediaPlayback(media);
        });
      }
    });

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

  handleMediaPlayback(mediaElement) {
    console.log('PopFact: Media playback detected', mediaElement.tagName);

    // Note: Audio transcription requires Web Speech API or external service
    // This is a placeholder for the implementation
    chrome.runtime.sendMessage({
      type: 'MEDIA_DETECTED',
      mediaType: mediaElement.tagName.toLowerCase(),
      src: mediaElement.src || mediaElement.currentSrc
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

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FACT_CHECK_RESULT') {
        this.displayFactCheck(message.data);
      }
    });
  }

  displayFactCheck(result) {
    const { claim, verdict, explanation, confidence } = result;

    // Determine verdict category
    let category = 'unverified';
    if (verdict === 'TRUE' || confidence > 0.8) {
      category = 'true';
    } else if (verdict === 'FALSE' || confidence < 0.3) {
      category = 'false';
    } else if (verdict === 'MIXED') {
      category = 'mixed';
    }

    // Create fact check item using safe DOM methods to prevent XSS
    const factItem = document.createElement('div');
    factItem.className = `popfact-item ${category}`;

    const icon = document.createElement('span');
    icon.className = 'popfact-item-icon';
    icon.textContent = this.getVerdictIcon(category);

    const textContainer = document.createElement('span');
    textContainer.className = 'popfact-item-text';

    const claimSpan = document.createElement('span');
    claimSpan.className = 'popfact-claim';
    claimSpan.textContent = this.truncate(claim, 80);

    const verdictSpan = document.createElement('span');
    verdictSpan.className = 'popfact-verdict';
    verdictSpan.textContent = explanation || verdict;

    textContainer.appendChild(claimSpan);
    textContainer.appendChild(verdictSpan);

    const separator = document.createElement('span');
    separator.className = 'popfact-separator';

    factItem.appendChild(icon);
    factItem.appendChild(textContainer);
    factItem.appendChild(separator);

    // Add to ticker
    this.addToTicker(factItem);
  }

  getVerdictIcon(category) {
    const icons = {
      'true': '✓',
      'false': '✗',
      'mixed': '!',
      'unverified': '?'
    };
    return icons[category] || '?';
  }

  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopFactOverlay();
  });
} else {
  new PopFactOverlay();
}
