// PopFact Content Script - Injects overlay and monitors page content

class PopFactOverlay {
  constructor() {
    this.overlay = null;
    this.tickerScroll = null;
    this.isVisible = true;
    this.factCheckQueue = [];
    this.processedClaims = new Set();
    this.observer = null;

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
          <span>ACTIVE</span>
        </div>
      </div>
    `;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'popfact-toggle';
    toggleBtn.innerHTML = '▼';
    toggleBtn.title = 'Toggle PopFact Overlay';
    toggleBtn.addEventListener('click', () => this.toggleOverlay());

    // Add to page
    document.body.appendChild(this.overlay);
    document.body.appendChild(toggleBtn);

    this.tickerScroll = document.getElementById('popfact-ticker-scroll');
  }

  toggleOverlay() {
    this.isVisible = !this.isVisible;
    const toggleBtn = document.getElementById('popfact-toggle');

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
    // Extract initial text content
    this.extractTextClaims();

    // Watch for dynamic content changes
    this.observer = new MutationObserver((mutations) => {
      this.extractTextClaims();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  extractTextClaims() {
    // Extract declarative statements from page text
    const textNodes = this.getTextNodes(document.body);
    const sentences = this.extractSentences(textNodes);
    const declarativeSentences = this.filterDeclarativeSentences(sentences);

    // Send to background for fact-checking
    declarativeSentences.forEach(claim => {
      if (!this.processedClaims.has(claim) && claim.length > 20) {
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

    // Watch for new media elements
    const mediaObserver = new MutationObserver(() => {
      this.monitorMediaContent();
    });

    mediaObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
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
    chrome.runtime.sendMessage({
      type: 'FACT_CHECK_REQUEST',
      claim: claim,
      source: source,
      url: window.location.href,
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
    const { claim, verdict, explanation, confidence, sourceDetails, sources, consensus } = result;

    // Determine verdict category
    let category = 'unverified';
    if (verdict === 'TRUE' || confidence > 0.8) {
      category = 'true';
    } else if (verdict === 'FALSE' || confidence < 0.3) {
      category = 'false';
    } else if (verdict === 'MIXED') {
      category = 'mixed';
    }

    // Get source information
    const sourceInfo = this.formatSourceInfo(sourceDetails || [], sources || [], consensus);

    // Escape user-provided content to prevent XSS
    const escapedClaim = this.escapeHtml(this.truncate(claim || '', 70));
    const escapedExplanation = this.escapeHtml(explanation || verdict || '');
    const escapedSourceInfo = sourceInfo ? this.escapeHtml(sourceInfo) : '';

    // Create fact check item
    const factItem = document.createElement('div');
    factItem.className = `popfact-item ${category}`;
    factItem.innerHTML = `
      <span class="popfact-item-icon">${this.getVerdictIcon(category)}</span>
      <span class="popfact-item-text">
        <span class="popfact-claim">${escapedClaim}</span>
        <span class="popfact-verdict">${escapedExplanation}</span>
        ${escapedSourceInfo ? `<span class="popfact-sources">${escapedSourceInfo}</span>` : ''}
      </span>
      <span class="popfact-separator"></span>
    `;

    // Add click handler to show source details
    if (sourceDetails && sourceDetails.length > 0) {
      factItem.style.cursor = 'pointer';
      factItem.title = 'Click to view sources';
      factItem.addEventListener('click', () => this.showSourceDetails(result));
    }

    // Add to ticker
    this.addToTicker(factItem);
  }

  formatSourceInfo(sourceDetails, sources, consensus) {
    if (!sourceDetails || sourceDetails.length === 0) {
      if (sources && sources.length > 0) {
        return `[${sources.length} source${sources.length > 1 ? 's' : ''}]`;
      }
      return '';
    }

    // Get unique source names
    const uniqueSources = [];
    const seen = new Set();
    sourceDetails.forEach(source => {
      if (source.name && !seen.has(source.name)) {
        seen.add(source.name);
        uniqueSources.push(source);
      }
    });

    // Sort by credibility
    uniqueSources.sort((a, b) => (b.credibility || 0) - (a.credibility || 0));

    // Show top sources (max 3)
    const topSources = uniqueSources.slice(0, 3);
    const sourceNames = topSources.map(s => s.name).join(', ');
    const moreCount = uniqueSources.length > 3 ? ` +${uniqueSources.length - 3}` : '';
    
    // Add consensus indicator if multiple sources
    const consensusIndicator = consensus && consensus.reviewCount > 1 
      ? ` [${consensus.reviewCount} reviews]` 
      : '';

    return sourceNames ? `Sources: ${sourceNames}${moreCount}${consensusIndicator}` : '';
  }

  showSourceDetails(result) {
    // Create modal or expandable section to show detailed source information
    const modal = document.createElement('div');
    modal.className = 'popfact-source-modal';
    
    // Escape all user-provided content to prevent XSS
    const escapedClaim = this.escapeHtml(result.claim || '');
    const escapedExplanation = this.escapeHtml(result.explanation || '');
    const escapedVerdict = this.escapeHtml(result.verdict || 'UNVERIFIED');
    const verdictClass = this.escapeHtml((result.verdict || 'UNVERIFIED').toLowerCase());
    const confidence = Math.round((result.confidence || 0) * 100);
    
    // Build sources HTML with proper escaping
    let sourcesHtml = '';
    if (result.sourceDetails && result.sourceDetails.length > 0) {
      sourcesHtml = `
        <div class="popfact-sources-detail">
          <strong>Sources (${result.sourceDetails.length}):</strong>
          <ul>
            ${result.sourceDetails.map(source => {
              const validatedUrl = this.validateUrl(source.url || '');
              // Don't HTML-escape URLs - they break query parameters. Use validated URL directly.
              // The URL is already validated for safe protocols, so it's safe to use in href.
              const escapedName = this.escapeHtml(source.name || 'Unknown Source');
              const escapedType = this.escapeHtml(source.type || 'unknown');
              const sourceCredibility = Math.round((source.credibility || 0.5) * 100);
              return `
                <li>
                  <a href="${validatedUrl}" target="_blank" rel="noopener noreferrer">
                    ${escapedName}
                  </a>
                  <span class="source-type">${escapedType}</span>
                  <span class="source-credibility">Credibility: ${sourceCredibility}%</span>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    }
    
    // Build consensus HTML with proper escaping
    let consensusHtml = '';
    if (result.consensus) {
      const reviewCount = result.consensus.reviewCount || 0;
      let distributionHtml = '';
      if (result.consensus.verdictDistribution) {
        const distribution = Object.entries(result.consensus.verdictDistribution)
          .filter(([v, c]) => c > 0)
          .map(([v, c]) => `${this.escapeHtml(v)}: ${c}`)
          .join(', ');
        distributionHtml = distribution ? `<div class="verdict-distribution">${distribution}</div>` : '';
      }
      consensusHtml = `
        <div class="popfact-consensus-detail">
          <strong>Consensus:</strong> Based on ${reviewCount} review${reviewCount !== 1 ? 's' : ''}
          ${distributionHtml}
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="popfact-modal-content">
        <div class="popfact-modal-header">
          <h3>Fact-Check Sources</h3>
          <button class="popfact-modal-close">×</button>
        </div>
        <div class="popfact-modal-body">
          <div class="popfact-claim-detail">
            <strong>Claim:</strong> ${escapedClaim}
          </div>
          <div class="popfact-verdict-detail">
            <strong>Verdict:</strong> <span class="verdict-${verdictClass}">${escapedVerdict}</span>
            <span class="confidence">Confidence: ${confidence}%</span>
          </div>
          <div class="popfact-explanation-detail">
            <strong>Explanation:</strong> ${escapedExplanation}
          </div>
          ${sourcesHtml}
          ${consensusHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.popfact-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return '#';
    }
    
    // Trim whitespace
    url = url.trim();
    
    // Check for safe protocols
    const safeProtocols = ['http:', 'https:', 'mailto:'];
    const urlLower = url.toLowerCase();
    
    // Check if URL starts with a protocol
    const hasProtocol = /^[a-z][a-z0-9+.-]*:/.test(urlLower);
    
    if (hasProtocol) {
      // Extract protocol
      const protocol = urlLower.split(':')[0] + ':';
      
      // Only allow safe protocols
      if (!safeProtocols.includes(protocol)) {
        // Block dangerous protocols (javascript:, data:, vbscript:, etc.)
        console.warn('PopFact: Blocked unsafe URL protocol:', protocol);
        return '#';
      }
    } else {
      // If no protocol, assume relative URL or add https://
      // For external links, we should have a protocol, so treat as invalid
      // For relative URLs, they're safe, but we'll be conservative
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        // Relative URLs are generally safe
        return url;
      } else {
        // No protocol and not relative - could be malicious, block it
        console.warn('PopFact: Blocked URL without safe protocol:', url);
        return '#';
      }
    }
    
    return url;
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
    // Remove loading message if present
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopFactOverlay();
  });
} else {
  new PopFactOverlay();
}
