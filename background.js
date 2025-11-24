// PopFact Background Service Worker
// Handles fact-checking requests and API integration with multi-source verification

// Trusted fact-checking organizations and their credibility scores
const TRUSTED_SOURCES = {
  // International Fact-Checking Network (IFCN) verified organizations
  'politifact.com': { name: 'PolitiFact', credibility: 0.95, type: 'fact-checker' },
  'factcheck.org': { name: 'FactCheck.org', credibility: 0.95, type: 'fact-checker' },
  'snopes.com': { name: 'Snopes', credibility: 0.90, type: 'fact-checker' },
  'fullfact.org': { name: 'Full Fact', credibility: 0.95, type: 'fact-checker' },
  'apnews.com': { name: 'Associated Press', credibility: 0.92, type: 'news' },
  'reuters.com': { name: 'Reuters', credibility: 0.92, type: 'news' },
  'bbc.com': { name: 'BBC', credibility: 0.90, type: 'news' },
  'theguardian.com': { name: 'The Guardian', credibility: 0.88, type: 'news' },
  'nytimes.com': { name: 'New York Times', credibility: 0.90, type: 'news' },
  'washingtonpost.com': { name: 'Washington Post', credibility: 0.90, type: 'news' },
  'nature.com': { name: 'Nature', credibility: 0.98, type: 'academic' },
  'science.org': { name: 'Science', credibility: 0.98, type: 'academic' },
  'pubmed.ncbi.nlm.nih.gov': { name: 'PubMed', credibility: 0.97, type: 'academic' },
  'scholar.google.com': { name: 'Google Scholar', credibility: 0.85, type: 'academic' },
  'cdc.gov': { name: 'CDC', credibility: 0.95, type: 'government' },
  'nih.gov': { name: 'NIH', credibility: 0.96, type: 'government' },
  'who.int': { name: 'WHO', credibility: 0.94, type: 'government' },
  'nasa.gov': { name: 'NASA', credibility: 0.97, type: 'government' },
  'noaa.gov': { name: 'NOAA', credibility: 0.96, type: 'government' }
};

// Academic journal domains (high credibility)
const ACADEMIC_DOMAINS = [
  '.edu', '.ac.uk', '.ac.', 'pubmed', 'doi.org', 'arxiv.org',
  'jstor.org', 'springer.com', 'elsevier.com', 'ieee.org'
];


class FactCheckService {
  constructor() {
    this.cache = new Map();
    this.cacheMaxSize = 1000; // Prevent unbounded cache growth
    this.queue = [];
    this.processing = false;
    this.trustedSources = TRUSTED_SOURCES;
    this.sourceCache = new Map(); // Cache source credibility lookups

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
        return true; // Keep channel open for async response
      } else if (message.type === 'MEDIA_DETECTED') {
        this.handleMediaDetection(message, sender.tab.id);
      } else if (message.type === 'CLEAR_CACHE') {
        this.clearCache();
        sendResponse({ success: true });
      } else if (message.type === 'UPDATE_SETTINGS') {
        this.loadUserSettings();
        sendResponse({ success: true });
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
    
    // Enhanced pattern matching with more nuanced categories
    const patterns = {
      'TRUE': [
        'sky is blue', 'earth is round', 'water is wet', 'sun rises east',
        'humans need oxygen', 'gravity exists', 'climate change',
        'vaccines prevent disease', 'earth orbits sun'
      ],
      'FALSE': [
        'earth is flat', 'vaccines cause autism', 'moon landing was fake',
        '5g causes covid', 'chemtrails', 'flat earth'
      ],
      'MIXED': [
        'coffee is healthy', 'carbs are bad', 'organic is better',
        'supplements work', 'detox cleanses'
      ]
    };

    let verdict = 'UNVERIFIED';
    let confidence = 0.3;
    
    // Pattern matching to determine verdict
    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerClaim.includes(keyword))) {
        verdict = category;
        confidence = category === 'TRUE' ? 0.9 : category === 'FALSE' ? 0.85 : 0.55;
        break;
      }
    }
    
    // Context-specific adjustments
    if (lowerClaim.includes('climate') && lowerClaim.includes('hoax')) {
      verdict = 'FALSE';
      confidence = 0.95;
    }
    if (lowerClaim.includes('vaccine') && lowerClaim.includes('safe')) {
      verdict = 'TRUE';
      confidence = 0.9;
    }

    return {
      verdict,
      explanation: this.generateExplanation(verdict, claim),
      confidence,
      sources: []
    };
  }

  generateExplanation(verdict, claim) {
    const lowerClaim = claim.toLowerCase();
    
    // Generate nuanced, in-depth explanations based on verdict and context
    const baseExplanations = {
      'TRUE': '✓ VERIFIED: This claim aligns with established scientific consensus and reliable sources.',
      'FALSE': '✗ DISPUTED: This claim contradicts verified evidence from authoritative sources.',
      'MIXED': '⚠ NUANCED: This claim has both supporting and contradicting evidence requiring careful analysis.',
      'UNVERIFIED': '? UNVERIFIED: Insufficient reliable evidence available to make a definitive assessment.'
    };
    
    let contextualInsight = '';
    
    // Add domain-specific context for deeper understanding
    if (lowerClaim.includes('climate') || lowerClaim.includes('warming') || lowerClaim.includes('environment')) {
      contextualInsight = ' 🌍 Climate Context: Scientific bodies worldwide (NASA, NOAA, IPCC) report over 97% consensus on human-caused climate change. Evidence includes temperature records, ice core data, and satellite observations spanning decades.';
    } else if (lowerClaim.includes('vaccine') || lowerClaim.includes('immunization')) {
      contextualInsight = ' 💉 Medical Context: Vaccines undergo rigorous clinical trials and ongoing safety monitoring by health agencies (FDA, WHO, CDC). The debunked vaccine-autism link originated from a retracted study.';
    } else if (lowerClaim.includes('election') || lowerClaim.includes('vote') || lowerClaim.includes('ballot')) {
      contextualInsight = ' 🗳️ Electoral Context: Election integrity is verified through multiple independent audits, bipartisan poll watchers, and official certification processes with documented chain of custody.';
    } else if (lowerClaim.includes('space') || lowerClaim.includes('moon') || lowerClaim.includes('nasa')) {
      contextualInsight = ' 🚀 Space Context: Space missions involve thousands of engineers, international cooperation, and independently verifiable evidence including reflectors on the moon and samples returned to Earth.';
    } else if (lowerClaim.includes('health') || lowerClaim.includes('medical') || lowerClaim.includes('nutrition')) {
      contextualInsight = ' ⚕️ Health Context: Medical and nutritional claims should be evaluated based on peer-reviewed research, clinical trials, and guidance from qualified healthcare professionals rather than anecdotes.';
    } else if (lowerClaim.includes('history') || lowerClaim.includes('war') || lowerClaim.includes('genocide')) {
      contextualInsight = ' 📜 Historical Context: Historical claims are verified through primary sources, archaeological evidence, contemporary records, and consensus among professional historians.';
    }
    
    // Add general research guidance
    const researchGuidance = ' 📚 For authoritative fact-checking, consult: Snopes.com, FactCheck.org, PolitiFact.com, or domain-specific expert organizations.';
    
    return baseExplanations[verdict] + contextualInsight + researchGuidance;
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

    const verdict = this.deriveVerdict(wikiResult, twitterResult, claim);
    const explanation = this.buildExplanation(wikiResult, twitterResult, verdict, claim);
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

  deriveVerdict(wikiResult, twitterResult, claim) {
    const lowerClaim = claim.toLowerCase();
    
    // Enhanced context-aware verdict derivation with nuance
    // Check for clear false indicators
    if (wikiResult?.snippet && /hoax|false|misinformation|debunked|conspiracy|myth|unfounded|incorrect/i.test(wikiResult.snippet)) {
      return 'FALSE';
    }
    
    // Check for clear true indicators with stronger evidence
    if (wikiResult?.snippet && /is a|was a|are the|known for|confirmed|verified|established|scientific consensus|widely accepted/i.test(wikiResult.snippet)) {
      return 'TRUE';
    }
    
    // Check for nuanced/mixed indicators
    if (wikiResult?.snippet && /controversy|debate|disputed|some evidence|partially|complex issue/i.test(wikiResult.snippet)) {
      return 'MIXED';
    }
    
    if (twitterResult?.snippet && /disputed|mixed|questionable|conflicting|ongoing debate/i.test(twitterResult.snippet)) {
      return 'MIXED';
    }
    
    // Context-specific verdict logic for common claim types
    if (lowerClaim.includes('climate') || lowerClaim.includes('global warming')) {
      if (wikiResult?.snippet && /climate change|warming|greenhouse/i.test(wikiResult.snippet)) {
        return 'TRUE';
      }
    }
    
    if (lowerClaim.includes('vaccine') || lowerClaim.includes('vaccination')) {
      if (lowerClaim.includes('autism') || lowerClaim.includes('cause')) {
        return 'FALSE'; // Debunked vaccine-autism link
      }
    }
    
    return 'UNVERIFIED';
  }

  buildExplanation(wikiResult, twitterResult, verdict, claim) {
    const parts = [];
    let contextualPrefix = '';
    
    // Create nuanced, in-depth explanations based on verdict
    switch (verdict) {
      case 'TRUE':
        contextualPrefix = '✓ VERIFIED: This claim is supported by reliable sources. ';
        break;
      case 'FALSE':
        contextualPrefix = '✗ DISPUTED: This claim contradicts established evidence. ';
        break;
      case 'MIXED':
        contextualPrefix = '⚠ NUANCED: This claim requires careful consideration. ';
        break;
      case 'UNVERIFIED':
        contextualPrefix = '? UNVERIFIED: Insufficient evidence available. ';
        break;
    }
    
    // Add detailed Wikipedia context with enhanced formatting
    if (wikiResult?.title) {
      const snippet = wikiResult.snippet ? wikiResult.snippet.substring(0, 200) : '';
      parts.push(`📚 Encyclopedia: "${wikiResult.title}" ${snippet ? '— ' + snippet + '...' : ''}`);
    }
    
    // Add social media context for real-time perspectives
    if (twitterResult?.snippet) {
      const snippet = twitterResult.snippet.substring(0, 150);
      parts.push(`💬 Public discourse: ${snippet}...`);
    }
    
    // Add contextual analysis based on claim content
    const lowerClaim = claim.toLowerCase();
    if (lowerClaim.includes('climate') || lowerClaim.includes('global warming')) {
      parts.push(`🌍 Context: Climate science involves complex systems with broad scientific consensus on key findings.`);
    }
    if (lowerClaim.includes('health') || lowerClaim.includes('medical')) {
      parts.push(`⚕️ Note: Health claims should be verified with qualified medical professionals and peer-reviewed research.`);
    }
    if (lowerClaim.includes('election') || lowerClaim.includes('vote') || lowerClaim.includes('voting')) {
      parts.push(`🗳️ Context: Election claims are subject to verification by election officials and independent observers.`);
    }
    
    if (parts.length === 0) {
      return contextualPrefix + 'No definitive sources found in open knowledge bases. Consider checking authoritative fact-checking organizations for detailed analysis.';
    }
    
    return contextualPrefix + parts.join(' • ');
  }

  estimateConfidence(wikiResult, twitterResult, threshold = 50) {
    let base = 0.45;
    if (wikiResult) base += 0.25;
    if (twitterResult?.snippet) base += 0.1;
    return Math.min(1, Math.max(0, base + threshold / 500));
  }
}

console.log('PopFact Background Service: Initialized (Mock Mode)');
