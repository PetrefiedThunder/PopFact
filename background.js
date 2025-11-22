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
    this.queue = [];
    this.processing = false;
    this.trustedSources = TRUSTED_SOURCES;
    this.sourceCache = new Map(); // Cache source credibility lookups

    this.setupMessageListener();
    this.loadUserSettings();
    console.log('PopFact Background Service: Initialized with multi-source verification');
  }

  async loadUserSettings() {
    const settings = await chrome.storage.sync.get(['trustedSourcesOnly', 'minSourceCredibility']);
    this.trustedSourcesOnly = settings.trustedSourcesOnly || false;
    // Convert from 0-100 range (popup slider) to 0.0-1.0 range (credibility scores)
    const rawThreshold = settings.minSourceCredibility || 70;
    this.minSourceCredibility = typeof rawThreshold === 'number' ? rawThreshold / 100 : 0.7;
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      return true;
    });
  }

  async handleFactCheckRequest(message, tabId) {
    const { claim, source, url, timestamp } = message;

    // Check cache first
    const cacheKey = this.getCacheKey(claim);
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);
      this.sendResultToTab(tabId, cachedResult);
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
      const result = await this.performFactCheck(request.claim);

      // Cache result
      const cacheKey = this.getCacheKey(request.claim);
      this.cache.set(cacheKey, result);

      // Send to tab
      this.sendResultToTab(request.tabId, result);

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

  async performFactCheck(claim) {
    const settings = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'useMultiSource']);
    const useMultiSource = settings.useMultiSource !== false; // Default to true

    try {
      if (useMultiSource) {
        // Multi-source verification for higher accuracy
        return await this.performMultiSourceCheck(claim, settings);
      } else {
        // Single source check
        return await this.performSingleSourceCheck(claim, settings);
      }
    } catch (error) {
      console.error('PopFact: Fact check error:', error);
      throw new Error(`Fact check failed: ${error.message}`);
    }
  }

  async performMultiSourceCheck(claim, settings) {
    const results = [];
    const errors = [];

    // Try Google Fact Check API first (most reliable for fact-checking)
    if (settings.apiProvider === 'google' && settings.apiKey) {
      try {
        const googleResult = await this.checkGoogleFactCheck(claim, settings.apiKey);
        if (googleResult && googleResult.verdict !== 'UNVERIFIED') {
          results.push(googleResult);
        }
      } catch (error) {
        errors.push({ source: 'Google Fact Check', error: error.message });
      }
    }

    // Try LLM-based fact-checking with enhanced prompts
    if (settings.apiProvider === 'openai' && settings.apiKey) {
      try {
        const llmResult = await this.checkWithLLM(claim, 'openai', settings.apiKey);
        if (llmResult) {
          results.push(llmResult);
        }
      } catch (error) {
        errors.push({ source: 'OpenAI', error: error.message });
      }
    } else if (settings.apiProvider === 'claude' && settings.apiKey) {
      try {
        const llmResult = await this.checkWithLLM(claim, 'claude', settings.apiKey);
        if (llmResult) {
          results.push(llmResult);
        }
      } catch (error) {
        errors.push({ source: 'Claude', error: error.message });
      }
    }

    // Aggregate results
    return this.aggregateResults(claim, results, errors);
  }

  async performSingleSourceCheck(claim, settings) {
    if (settings.apiProvider === 'google' && settings.apiKey) {
      return await this.checkGoogleFactCheck(claim, settings.apiKey);
    } else if (settings.apiProvider === 'openai' && settings.apiKey) {
      return await this.checkWithLLM(claim, 'openai', settings.apiKey);
    } else if (settings.apiProvider === 'claude' && settings.apiKey) {
      return await this.checkWithLLM(claim, 'claude', settings.apiKey);
    } else {
      // Fallback to mock for demo
      return await this.mockFactCheck(claim);
    }
  }

  async checkGoogleFactCheck(claim, apiKey) {
    const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
    url.searchParams.append('query', claim);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('languageCode', 'en');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.claims || data.claims.length === 0) {
      return {
        claim: claim,
        verdict: 'UNVERIFIED',
        explanation: 'No fact-checks found for this claim',
        confidence: 0,
        sources: [],
        sourceDetails: [],
        timestamp: Date.now()
      };
    }

    // Process multiple claim reviews and aggregate
    const reviews = [];
    for (const claimData of data.claims.slice(0, 5)) { // Limit to top 5
      if (claimData.claimReview && claimData.claimReview.length > 0) {
        for (const review of claimData.claimReview) {
          const sourceUrl = review.url || '';
          const sourceCredibility = this.getSourceCredibility(sourceUrl);
          
          reviews.push({
            verdict: this.parseTextualRating(review.textualRating),
            explanation: review.textualRating,
            sourceUrl: sourceUrl,
            sourceName: review.publisher?.name || this.extractDomainName(sourceUrl),
            sourceCredibility: sourceCredibility.credibility,
            publisher: review.publisher
          });
        }
      }
    }

    // Aggregate reviews
    return this.aggregateGoogleReviews(claim, reviews);
  }

  async checkWithLLM(claim, provider, apiKey) {
    const enhancedPrompt = this.buildEnhancedFactCheckPrompt(claim);
    
    if (provider === 'openai') {
      return await this.checkWithOpenAI(claim, enhancedPrompt, apiKey);
    } else if (provider === 'claude') {
      return await this.checkWithClaude(claim, enhancedPrompt, apiKey);
    }
  }

  buildEnhancedFactCheckPrompt(claim) {
    return `You are an expert fact-checker. Analyze the following claim and provide a fact-check with citations from reputable sources.

CRITICAL REQUIREMENTS:
1. Only cite sources from reputable fact-checking organizations (PolitiFact, FactCheck.org, Snopes, Full Fact), established news organizations (AP, Reuters, BBC, NYT, WaPo), peer-reviewed academic sources, or government agencies (CDC, NIH, WHO, NASA, NOAA)
2. If you cannot find reputable sources, respond with UNVERIFIED
3. Provide specific URLs or citations when possible
4. Base your verdict on evidence from these trusted sources only

Claim to fact-check: "${claim}"

Respond with ONLY valid JSON in this exact format:
{
  "verdict": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
  "explanation": "Brief explanation (max 150 chars) with source attribution",
  "confidence": 0.0 to 1.0,
  "sources": [
    {
      "url": "source URL",
      "name": "source name",
      "type": "fact-checker" | "news" | "academic" | "government"
    }
  ],
  "reasoning": "Brief explanation of why this verdict was reached based on the sources"
}`;
  }

  async checkWithOpenAI(claim, prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `Fact-check this claim: "${claim}"`
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent, factual responses
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let result;
    
    try {
      const content = data.choices[0].message.content;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', data.choices[0].message.content);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate and enhance sources
    const validatedSources = this.validateAndEnhanceSources(result.sources || []);

    return {
      claim: claim,
      verdict: result.verdict || 'UNVERIFIED',
      explanation: result.explanation || result.reasoning || 'Analysis completed',
      confidence: result.confidence || 0.5,
      sources: validatedSources.map(s => s.url),
      sourceDetails: validatedSources,
      timestamp: Date.now()
    };
  }

  async checkWithClaude(claim, prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 500,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let result;
    
    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', data.content[0].text);
      throw new Error('Invalid response format from Claude');
    }

    const validatedSources = this.validateAndEnhanceSources(result.sources || []);

    return {
      claim: claim,
      verdict: result.verdict || 'UNVERIFIED',
      explanation: result.explanation || result.reasoning || 'Analysis completed',
      confidence: result.confidence || 0.5,
      sources: validatedSources.map(s => s.url),
      sourceDetails: validatedSources,
      timestamp: Date.now()
    };
  }

  validateAndEnhanceSources(sources) {
    return sources.map(source => {
      const url = typeof source === 'string' ? source : (source.url || '');
      const sourceInfo = this.getSourceCredibility(url);
      
      return {
        url: url,
        name: typeof source === 'object' ? (source.name || sourceInfo.name) : sourceInfo.name,
        type: typeof source === 'object' ? (source.type || sourceInfo.type) : sourceInfo.type,
        credibility: sourceInfo.credibility
      };
    }).filter(source => {
      // Filter sources based on minimum credibility if enabled
      if (this.trustedSourcesOnly && source.credibility < this.minSourceCredibility) {
        return false;
      }
      return source.url && source.url.length > 0;
    });
  }

  getSourceCredibility(url) {
    if (!url) {
      return { name: 'Unknown', credibility: 0.5, type: 'unknown' };
    }

    // Check cache first
    if (this.sourceCache.has(url)) {
      return this.sourceCache.get(url);
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check exact matches
      for (const [domain, info] of Object.entries(this.trustedSources)) {
        if (hostname.includes(domain)) {
          this.sourceCache.set(url, info);
          return info;
        }
      }

      // Check academic domains
      const isAcademic = ACADEMIC_DOMAINS.some(domain => hostname.includes(domain));
      if (isAcademic) {
        const academicInfo = { name: this.extractDomainName(hostname), credibility: 0.85, type: 'academic' };
        this.sourceCache.set(url, academicInfo);
        return academicInfo;
      }

      // Check for .gov domains
      if (hostname.endsWith('.gov') || hostname.endsWith('.gov.uk')) {
        const govInfo = { name: this.extractDomainName(hostname), credibility: 0.90, type: 'government' };
        this.sourceCache.set(url, govInfo);
        return govInfo;
      }

      // Default for unknown sources
      const defaultInfo = { name: this.extractDomainName(hostname), credibility: 0.5, type: 'unknown' };
      this.sourceCache.set(url, defaultInfo);
      return defaultInfo;
    } catch (error) {
      return { name: 'Unknown', credibility: 0.5, type: 'unknown' };
    }
  }

  extractDomainName(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
    return hostname;
  }

  parseTextualRating(rating) {
    // Handle null, undefined, or empty rating
    if (!rating || typeof rating !== 'string') {
      return 'UNVERIFIED';
    }
    
    const upper = rating.toUpperCase();
    if (upper.includes('TRUE') || upper.includes('CORRECT') || upper.includes('ACCURATE')) {
      return 'TRUE';
    } else if (upper.includes('FALSE') || upper.includes('INCORRECT') || upper.includes('INACCURATE')) {
      return 'FALSE';
    } else if (upper.includes('MIXED') || upper.includes('PARTLY') || upper.includes('MISLEADING')) {
      return 'MIXED';
    }
    return 'UNVERIFIED';
  }

  aggregateGoogleReviews(claim, reviews) {
    if (reviews.length === 0) {
      return {
        claim: claim,
        verdict: 'UNVERIFIED',
        explanation: 'No fact-checks found',
        confidence: 0,
        sources: [],
        sourceDetails: [],
        timestamp: Date.now()
      };
    }

    // Count verdicts, weighted by source credibility
    const verdictScores = { TRUE: 0, FALSE: 0, MIXED: 0, UNVERIFIED: 0 };
    let totalWeight = 0;
    const allSources = [];

    reviews.forEach(review => {
      const weight = review.sourceCredibility || 0.5;
      verdictScores[review.verdict] += weight;
      totalWeight += weight;
      allSources.push({
        url: review.sourceUrl,
        name: review.sourceName,
        type: 'fact-checker',
        credibility: review.sourceCredibility,
        verdict: review.verdict,
        explanation: review.explanation
      });
    });

    // Determine consensus verdict
    let verdict = 'UNVERIFIED';
    let confidence = 0.5;
    
    const trueScore = verdictScores.TRUE / totalWeight;
    const falseScore = verdictScores.FALSE / totalWeight;
    const mixedScore = verdictScores.MIXED / totalWeight;

    if (trueScore > 0.6) {
      verdict = 'TRUE';
      confidence = Math.min(0.95, trueScore);
    } else if (falseScore > 0.6) {
      verdict = 'FALSE';
      confidence = Math.min(0.95, falseScore);
    } else if (mixedScore > 0.4 || (trueScore > 0.3 && falseScore > 0.3)) {
      verdict = 'MIXED';
      confidence = 0.7;
    } else {
      verdict = 'UNVERIFIED';
      confidence = Math.max(trueScore, falseScore, mixedScore);
    }

    // Get most common explanation
    const explanations = reviews
      .filter(r => r.verdict === verdict)
      .map(r => r.explanation);
    const explanation = explanations[0] || 'Multiple sources reviewed';

    return {
      claim: claim,
      verdict: verdict,
      explanation: explanation,
      confidence: confidence,
      sources: [...new Set(allSources.map(s => s.url))],
      sourceDetails: allSources,
      consensus: {
        trueScore: trueScore,
        falseScore: falseScore,
        mixedScore: mixedScore,
        reviewCount: reviews.length
      },
      timestamp: Date.now()
    };
  }

  aggregateResults(claim, results, errors) {
    if (results.length === 0) {
      return {
        claim: claim,
        verdict: 'UNVERIFIED',
        explanation: 'Unable to verify from available sources',
        confidence: 0,
        sources: [],
        sourceDetails: [],
        errors: errors,
        timestamp: Date.now()
      };
    }

    // If we have Google Fact Check results, prioritize them
    const googleResult = results.find(r => r.sourceDetails && r.sourceDetails.some(s => s.type === 'fact-checker'));
    if (googleResult) {
      return googleResult;
    }

    // Otherwise, aggregate LLM results
    const verdictCounts = { TRUE: 0, FALSE: 0, MIXED: 0, UNVERIFIED: 0 };
    const allSources = [];
    let totalConfidence = 0;

    results.forEach(result => {
      verdictCounts[result.verdict] = (verdictCounts[result.verdict] || 0) + 1;
      totalConfidence += result.confidence || 0;
      if (result.sourceDetails) {
        allSources.push(...result.sourceDetails);
      } else if (result.sources) {
        result.sources.forEach(url => {
          const sourceInfo = this.getSourceCredibility(url);
          allSources.push({
            url: url,
            name: sourceInfo.name,
            type: sourceInfo.type,
            credibility: sourceInfo.credibility
          });
        });
      }
    });

    // Determine consensus
    const maxCount = Math.max(...Object.values(verdictCounts));
    const consensusVerdict = Object.keys(verdictCounts).find(v => verdictCounts[v] === maxCount);
    const avgConfidence = totalConfidence / results.length;

    // Get explanation from highest confidence result
    const bestResult = results.reduce((best, current) => 
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );

    return {
      claim: claim,
      verdict: consensusVerdict || 'UNVERIFIED',
      explanation: bestResult.explanation || 'Verified by multiple sources',
      confidence: avgConfidence,
      sources: [...new Set(allSources.map(s => s.url))],
      sourceDetails: allSources,
      consensus: {
        reviewCount: results.length,
        verdictDistribution: verdictCounts
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    };
  }

  async mockFactCheck(claim) {
    // Mock implementation for demonstration only
    // In production, use real API integrations

    const lowerClaim = claim.toLowerCase();

    const patterns = {
      'true': ['sky is blue', 'earth is round', 'water boils at 100'],
      'false': ['earth is flat', 'vaccines cause autism', 'moon landing was fake'],
      'mixed': ['coffee is healthy', 'carbs are bad']
    };

    let verdict = 'UNVERIFIED';
    let confidence = 0.5;

    for (const [category, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (lowerClaim.includes(keyword)) {
          verdict = category.toUpperCase();
          confidence = category === 'true' ? 0.9 : category === 'false' ? 0.1 : 0.5;
          break;
        }
      }
    }

    return {
      claim: claim,
      verdict: verdict,
      explanation: this.generateExplanation(claim, verdict),
      confidence: confidence,
      sources: [],
      sourceDetails: [],
      timestamp: Date.now()
    };
  }

  generateExplanation(claim, verdict) {
    const explanations = {
      'TRUE': 'This claim is supported by reliable sources',
      'FALSE': 'This claim contradicts established facts',
      'MIXED': 'This claim contains both accurate and inaccurate elements',
      'UNVERIFIED': 'Insufficient evidence to verify this claim'
    };

    return explanations[verdict] || 'Verification pending';
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

// Initialize service
const factCheckService = new FactCheckService();

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('PopFact: Extension icon clicked');
});

// Clean up cache periodically (every 30 minutes)
setInterval(() => {
  factCheckService.clearCache();
  console.log('PopFact: Cache cleared');
}, 30 * 60 * 1000);
