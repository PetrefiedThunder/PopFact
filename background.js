// PopFact Background Service Worker
// Handles fact-checking requests and API integration

class FactCheckService {
  constructor() {
    this.apiEndpoint = 'https://api.example.com/factcheck'; // Replace with actual fact-checking API
    this.cache = new Map();
    this.queue = [];
    this.processing = false;

    this.setupMessageListener();
    console.log('PopFact Background Service: Initialized');
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FACT_CHECK_REQUEST') {
        this.handleFactCheckRequest(message, sender.tab.id);
      } else if (message.type === 'MEDIA_DETECTED') {
        this.handleMediaDetection(message, sender.tab.id);
      }
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
    // This is a placeholder implementation
    // In production, this should call a real fact-checking API

    // Option 1: Use a fact-checking API service
    // Examples: Google Fact Check Tools API, ClaimBuster API, etc.

    // Option 2: Use an LLM API (OpenAI, Anthropic Claude, etc.)
    // This example shows a mock implementation

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock fact-checking logic
      const result = await this.mockFactCheck(claim);

      return result;
    } catch (error) {
      throw new Error(`Fact check failed: ${error.message}`);
    }
  }

  async mockFactCheck(claim) {
    // Mock implementation for demonstration
    // Replace with actual API integration

    const lowerClaim = claim.toLowerCase();

    // Simple pattern matching for demo purposes
    const patterns = {
      'true': ['sky is blue', 'earth is round', 'water is wet'],
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

    // Use external API in production
    // Example with OpenAI:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checking assistant. Analyze the claim and respond with TRUE, FALSE, MIXED, or UNVERIFIED along with a brief explanation.'
          },
          {
            role: 'user',
            content: `Fact-check this claim: "${claim}"`
          }
        ]
      })
    });
    */

    return {
      claim: claim,
      verdict: verdict,
      explanation: this.generateExplanation(claim, verdict),
      confidence: confidence,
      sources: [],
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
