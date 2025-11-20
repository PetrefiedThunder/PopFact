// PopFact Background Service Worker
// Handles fact-checking requests and API integration


class FactCheckService {
  constructor() {
    this.apiEndpoint = 'https://api.example.com/factcheck'; // Replace with actual fact-checking API
    this.cache = new Map();
    this.cacheMaxSize = 1000; // Prevent unbounded cache growth
    this.queue = [];
    this.processing = false;

    // Rate limiting: token bucket algorithm
    this.rateLimitTokens = 60; // 60 requests
    this.rateLimitMax = 60;
    this.rateLimitRefillRate = 1; // 1 token per second (60 req/min)
    this.lastRefill = Date.now();

    this.settings = {
      apiProvider: 'open-knowledge',
      apiKey: '',
      confidenceThreshold: 50
    };

    this.providers = {
      'open-knowledge': new OpenKnowledgeProvider(),
      'mock': new MockProvider()
    };

    this.setupMessageListener();
    this.setupRateLimitRefill();
    this.loadSettings();
    console.log('PopFact Background Service: Initialized');
  }

  loadSettings() {
    chrome.storage.sync.get({
      apiProvider: 'open-knowledge',
      confidenceThreshold: 50
    }, (data) => {
      if (data && typeof data === 'object') {
        this.settings.apiProvider = data.apiProvider || 'open-knowledge';
        this.settings.confidenceThreshold = Number.isFinite(data.confidenceThreshold)
          ? data.confidenceThreshold
          : 50;
      }
    });

    chrome.storage.local.get({ apiKey: '' }, (data) => {
      if (data && typeof data.apiKey === 'string') {
        this.settings.apiKey = data.apiKey;
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.apiProvider) {
          this.settings.apiProvider = changes.apiProvider.newValue || 'open-knowledge';
        }
        if (changes.confidenceThreshold) {
          this.settings.confidenceThreshold = changes.confidenceThreshold.newValue;
        }
      }
      if (areaName === 'local' && changes.apiKey) {
        this.settings.apiKey = changes.apiKey.newValue;
      }
    });
  }

  setupRateLimitRefill() {
    // Refill tokens every second
    setInterval(() => {
      const now = Date.now();
      const timePassed = (now - this.lastRefill) / 1000;
      this.rateLimitTokens = Math.min(
        this.rateLimitMax,
        this.rateLimitTokens + timePassed * this.rateLimitRefillRate
      );
      this.lastRefill = now;
    }, 1000);
  }

  checkRateLimit() {
    if (this.rateLimitTokens >= 1) {
      this.rateLimitTokens -= 1;
      return true;
    }
    return false;
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle CLEAR_CACHE from popup (no tab context needed)
      if (message.type === 'CLEAR_CACHE') {
        this.clearCache();
        sendResponse({ success: true });
        return true;
      }

      // Validate sender has a valid tab for other message types
      if (!sender.tab || !sender.tab.id) {
        console.warn('PopFact: Message received without valid tab context');
        return false;
      }

      if (message.type === 'FACT_CHECK_REQUEST') {
        this.handleFactCheckRequest(message, sender.tab.id);
      } else if (message.type === 'MEDIA_DETECTED') {
        this.handleMediaDetection(message, sender.tab.id);
      }
      return true; // Keep message channel open for async responses
    });
  }

  async handleFactCheckRequest(message, tabId) {
    const { claim, source, url, timestamp } = message;

    // Validate inputs to prevent DoS
    if (!claim || typeof claim !== 'string' || claim.length < 10 || claim.length > 1000) {
      console.warn('PopFact: Invalid claim length');
      return;
    }
    if (!source || typeof source !== 'string' || source.length > 50) {
      console.warn('PopFact: Invalid source');
      return;
    }
    if (!url || typeof url !== 'string' || url.length > 500) {
      console.warn('PopFact: Invalid URL');
      return;
    }
    if (!Number.isInteger(tabId) || tabId < 0) {
      console.warn('PopFact: Invalid tabId');
      return;
    }

    // Validate timestamp to prevent replay attacks
    if (!timestamp || timestamp > Date.now() + 1000 || timestamp < Date.now() - 86400000) {
      console.warn('PopFact: Invalid timestamp in request');
      return;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(claim);
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);
      const enrichedResult = {
        ...cachedResult,
        claim,
        sourceType: source,
        url,
        provider: this.settings.apiProvider,
        timestamp: Date.now()
      };
      this.recordFactCheck(enrichedResult);
      this.sendResultToTab(tabId, enrichedResult);
      return;
    }

    // Check rate limit before adding to queue
    if (!this.checkRateLimit()) {
      console.warn('PopFact: Rate limit exceeded, rejecting request');
      this.sendResultToTab(tabId, {
        claim: claim,
        verdict: 'ERROR',
        explanation: 'Rate limit exceeded. Please try again later.',
        confidence: 0
      });
      return;
    }

    // Limit queue size to prevent DoS
    if (this.queue.length >= 100) {
      console.warn('PopFact: Queue full, rejecting request');
      return;
    }

    // Add to queue
    this.queue.push({ claim, source, url, timestamp, tabId });

    // Process queue
    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.queue.shift();

    try {
      const result = await this.performFactCheck(request.claim, {
        source: request.source,
        url: request.url
      });

      // Cache result with LRU eviction
      const cacheKey = this.getCacheKey(request.claim);
      if (this.cache.size >= this.cacheMaxSize) {
        // Remove oldest entry (first key in Map)
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, enrichedResult);

      // Enrich result with request metadata and active provider
      const enrichedResult = {
        ...result,
        claim: request.claim,
        sourceType: request.source,
        url: request.url,
        provider: this.settings.apiProvider,
        timestamp: Date.now()
      };

      // Persist log and send to tab
      this.recordFactCheck(enrichedResult);
      this.sendResultToTab(request.tabId, enrichedResult);

      // Continue processing with delay to avoid rate limiting
      setTimeout(() => this.processQueue(), 1000);
    } catch (error) {
      console.error('PopFact: Fact check error:', error);

      // Send error result
      this.sendResultToTab(request.tabId, {
        claim: request.claim,
        verdict: 'ERROR',
        explanation: 'Unable to verify claim at this time',
        confidence: 0
      });

      setTimeout(() => this.processQueue(), 1000);
    }
  }

  async performFactCheck(claim, context = {}) {
    const providerKey = this.settings.apiProvider || 'open-knowledge';
    const provider = this.providers[providerKey] || this.providers['open-knowledge'];

    try {
      const result = await provider.check(claim, {
        apiKey: this.settings.apiKey,
        confidenceThreshold: this.settings.confidenceThreshold,
        source: context.source,
        url: context.url
      });

      return {
        claim,
        verdict: result.verdict,
        explanation: result.explanation,
        confidence: result.confidence,
        sources: result.sources || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('PopFact: Provider failure', error);
      return {
        claim,
        verdict: 'ERROR',
        explanation: 'Unable to verify claim at this time',
        confidence: 0,
        sources: [],
        timestamp: Date.now()
      };
    }
  }

  handleMediaDetection(message, tabId) {
    const { mediaType, src } = message;
    console.log(`PopFact: ${mediaType} detected:`, src);

    // In production, implement audio transcription
    // Options:
    // 1. Web Speech API (client-side)
    // 2. Google Cloud Speech-to-Text
    // 3. AWS Transcribe
    // 4. Azure Speech Services

    // For video, extract audio and transcribe
    // Then send transcribed text for fact-checking
  }

  getCacheKey(claim) {
    // Simple hash function for cache key
    return claim.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  recordFactCheck(result) {
    chrome.storage.local.get({ factCheckLog: [], claimsChecked: 0 }, (data) => {
      const newEntry = {
        claim: result.claim,
        verdict: result.verdict,
        explanation: result.explanation,
        confidence: result.confidence,
        sources: result.sources || [],
        provider: result.provider,
        url: result.url,
        sourceType: result.sourceType,
        timestamp: result.timestamp
      };

      const updatedLog = [newEntry, ...(data.factCheckLog || [])].slice(0, 200);
      const updatedCount = (data.claimsChecked || 0) + 1;

      chrome.storage.local.set({
        factCheckLog: updatedLog,
        claimsChecked: updatedCount,
        lastUpdated: Date.now()
      });
    });
  }

  sendResultToTab(tabId, result) {
    chrome.tabs.sendMessage(tabId, {
      type: 'FACT_CHECK_RESULT',
      data: result
    }).catch(error => {
      console.error('PopFact: Error sending result to tab:', error);
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

class MockProvider {
  async check(claim) {
    const lowerClaim = claim.toLowerCase();
    const patterns = {
      'TRUE': ['sky is blue', 'earth is round', 'water is wet'],
      'FALSE': ['earth is flat', 'vaccines cause autism', 'moon landing was fake'],
      'MIXED': ['coffee is healthy', 'carbs are bad']
    };

    let verdict = 'UNVERIFIED';
    let confidence = 0.5;

    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerClaim.includes(keyword))) {
        verdict = category;
        confidence = category === 'TRUE' ? 0.9 : category === 'FALSE' ? 0.1 : 0.55;
        break;
      }
    }

    return {
      verdict,
      explanation: this.generateExplanation(verdict),
      confidence,
      sources: []
    };
  }

  generateExplanation(verdict) {
    const explanations = {
      'TRUE': 'This claim is supported by reliable sources',
      'FALSE': 'This claim contradicts established facts',
      'MIXED': 'This claim contains both accurate and inaccurate elements',
      'UNVERIFIED': 'Insufficient evidence to verify this claim'
    };
    return explanations[verdict] || 'Verification pending';
  }
}

class OpenKnowledgeProvider {
  async check(claim, context = {}) {
    const [wikiResult, twitterResult] = await Promise.all([
      this.queryWikipedia(claim),
      this.queryTwitterContext(claim)
    ]);

    const sources = [];
    if (wikiResult?.url) sources.push(wikiResult.url);
    if (twitterResult?.url) sources.push(twitterResult.url);

    const verdict = this.deriveVerdict(wikiResult, twitterResult);
    const explanation = this.buildExplanation(wikiResult, twitterResult, verdict);
    const confidence = this.estimateConfidence(wikiResult, twitterResult, context.confidenceThreshold);

    return {
      verdict,
      explanation,
      confidence,
      sources
    };
  }

  async queryWikipedia(claim) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(claim)}&srlimit=1`;
    const response = await fetch(searchUrl);
    if (!response.ok) return null;

    const data = await response.json();
    const hit = data?.query?.search?.[0];
    if (!hit) return null;

    const cleanSnippet = hit.snippet ? hit.snippet.replace(/<[^>]+>/g, '') : '';
    const pageTitle = hit.title.replace(/\s+/g, '_');
    return {
      title: hit.title,
      snippet: cleanSnippet,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
    };
  }

  async queryTwitterContext(claim) {
    const searchUrl = `https://r.jina.ai/https://twitter.com/search?q=${encodeURIComponent(claim)}&src=typed_query&f=live`;
    const response = await fetch(searchUrl);
    if (!response.ok) return null;

    const body = await response.text();
    const tweetMatch = body.match(/data-testid="tweet"[\s\S]*?<span[^>]*>([^<]{20,280})/i);
    const snippet = tweetMatch ? tweetMatch[1].replace(/\s+/g, ' ').trim() : null;

    return {
      snippet,
      url: `https://twitter.com/search?q=${encodeURIComponent(claim)}`
    };
  }

  deriveVerdict(wikiResult, twitterResult) {
    if (wikiResult?.snippet && /hoax|false|misinformation|debunked/i.test(wikiResult.snippet)) {
      return 'FALSE';
    }
    if (wikiResult?.snippet && /is a|was a|are the|known for/i.test(wikiResult.snippet)) {
      return 'TRUE';
    }
    if (twitterResult?.snippet && /disputed|mixed|questionable/i.test(twitterResult.snippet)) {
      return 'MIXED';
    }
    return 'UNVERIFIED';
  }

  buildExplanation(wikiResult, twitterResult, verdict) {
    const parts = [];
    if (wikiResult?.title) {
      parts.push(`Wikipedia context: ${wikiResult.title}${wikiResult.snippet ? ' — ' + wikiResult.snippet : ''}`);
    }
    if (twitterResult?.snippet) {
      parts.push(`Twitter chatter: ${twitterResult.snippet}`);
    }
    if (parts.length === 0) {
      return 'No open sources found yet; monitoring for updates.';
    }
    return `${verdict === 'TRUE' ? 'Supported by public knowledge.' : 'Open source context gathered.'} ${parts.join(' | ')}`;
  }

  estimateConfidence(wikiResult, twitterResult, threshold = 50) {
    let base = 0.45;
    if (wikiResult) base += 0.25;
    if (twitterResult?.snippet) base += 0.1;
    return Math.min(1, Math.max(0, base + threshold / 500));
  }
}

console.log('PopFact Background Service: Initialized (Mock Mode)');
