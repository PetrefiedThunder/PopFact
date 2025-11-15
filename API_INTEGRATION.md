# API Integration Guide

This guide explains how to integrate various fact-checking APIs with PopFact.

## Table of Contents

- [Overview](#overview)
- [OpenAI GPT-4](#openai-gpt-4)
- [Anthropic Claude](#anthropic-claude)
- [Google Fact Check Tools](#google-fact-check-tools)
- [Custom API](#custom-api)
- [Best Practices](#best-practices)

## Overview

PopFact uses a modular fact-checking service that can be configured to work with different APIs. The main integration point is the `performFactCheck()` method in `background.js`.

### Expected Response Format

All fact-checking APIs should return data in this format:

```javascript
{
  claim: string,           // The original claim being checked
  verdict: string,         // 'TRUE', 'FALSE', 'MIXED', or 'UNVERIFIED'
  explanation: string,     // Brief explanation of the verdict
  confidence: number,      // 0-1 confidence score
  sources: string[],       // Optional: URLs to source materials
  timestamp: number        // Unix timestamp
}
```

## OpenAI GPT-4

### Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Update `background.js`:

```javascript
async performFactCheck(claim) {
  const settings = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (settings.apiProvider !== 'openai' || !settings.apiKey) {
    throw new Error('OpenAI API not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a fact-checking assistant. Analyze the claim and respond ONLY with valid JSON in this exact format:
{
  "verdict": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
  "explanation": "Brief explanation (max 100 chars)",
  "confidence": 0.0 to 1.0,
  "sources": ["url1", "url2"]
}`
        },
        {
          role: 'user',
          content: `Fact-check this claim: "${claim}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    claim: claim,
    verdict: result.verdict,
    explanation: result.explanation,
    confidence: result.confidence,
    sources: result.sources || [],
    timestamp: Date.now()
  };
}
```

### Rate Limits

- GPT-4: 10,000 tokens per minute (tier 1)
- Implement exponential backoff for rate limit errors
- Cache results to minimize API calls

## Anthropic Claude

### Setup

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Update `background.js`:

```javascript
async performFactCheck(claim) {
  const settings = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (settings.apiProvider !== 'claude' || !settings.apiKey) {
    throw new Error('Claude API not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Fact-check this claim and respond with JSON: "${claim}"

Format:
{
  "verdict": "TRUE|FALSE|MIXED|UNVERIFIED",
  "explanation": "brief explanation",
  "confidence": 0.0-1.0,
  "sources": ["urls"]
}`
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.content[0].text);

  return {
    claim: claim,
    verdict: result.verdict,
    explanation: result.explanation,
    confidence: result.confidence,
    sources: result.sources || [],
    timestamp: Date.now()
  };
}
```

## Google Fact Check Tools

### Setup

1. Enable the [ClaimReview API](https://developers.google.com/fact-check/tools/api)
2. Get an API key from Google Cloud Console
3. Update `background.js`:

```javascript
async performFactCheck(claim) {
  const settings = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (settings.apiProvider !== 'google' || !settings.apiKey) {
    throw new Error('Google Fact Check API not configured');
  }

  const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
  url.searchParams.append('query', claim);
  url.searchParams.append('key', settings.apiKey);

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
      timestamp: Date.now()
    };
  }

  // Use the first claim review
  const review = data.claims[0].claimReview[0];

  // Convert textual rating to verdict
  const rating = review.textualRating.toUpperCase();
  let verdict = 'UNVERIFIED';
  let confidence = 0.5;

  if (rating.includes('TRUE') || rating.includes('CORRECT')) {
    verdict = 'TRUE';
    confidence = 0.9;
  } else if (rating.includes('FALSE') || rating.includes('INCORRECT')) {
    verdict = 'FALSE';
    confidence = 0.9;
  } else if (rating.includes('MIXED') || rating.includes('PARTLY')) {
    verdict = 'MIXED';
    confidence = 0.7;
  }

  return {
    claim: claim,
    verdict: verdict,
    explanation: review.textualRating,
    confidence: confidence,
    sources: [review.url],
    timestamp: Date.now()
  };
}
```

## Custom API

### Creating Your Own Fact-Checking API

If you want to build a custom fact-checking service:

#### 1. Backend API Structure

```python
# Example Flask API
from flask import Flask, request, jsonify
import openai  # or your ML model

app = Flask(__name__)

@app.route('/fact-check', methods=['POST'])
def fact_check():
    data = request.json
    claim = data.get('claim')

    # Your fact-checking logic here
    # This could use ML models, database lookups, etc.

    result = {
        'claim': claim,
        'verdict': 'TRUE',  # or FALSE, MIXED, UNVERIFIED
        'explanation': 'Brief explanation',
        'confidence': 0.85,
        'sources': ['https://source1.com', 'https://source2.com'],
        'timestamp': int(time.time() * 1000)
    }

    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000)
```

#### 2. Frontend Integration

Update `background.js`:

```javascript
async performFactCheck(claim) {
  const settings = await chrome.storage.sync.get(['customApiUrl']);

  const response = await fetch(settings.customApiUrl || 'http://localhost:5000/fact-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ claim })
  });

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.statusText}`);
  }

  return await response.json();
}
```

## Best Practices

### 1. Error Handling

Always implement robust error handling:

```javascript
async performFactCheck(claim) {
  try {
    // API call here
  } catch (error) {
    console.error('Fact check error:', error);

    return {
      claim: claim,
      verdict: 'ERROR',
      explanation: 'Unable to verify claim at this time',
      confidence: 0,
      sources: [],
      timestamp: Date.now()
    };
  }
}
```

### 2. Rate Limiting

Implement request throttling:

```javascript
class FactCheckService {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestDelay = 1000; // 1 second between requests
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
      // Handle result
    } catch (error) {
      // Handle error
    }

    // Wait before next request
    setTimeout(() => this.processQueue(), this.requestDelay);
  }
}
```

### 3. Caching

Cache results to reduce API costs:

```javascript
getCacheKey(claim) {
  return claim.toLowerCase().trim().replace(/\s+/g, ' ');
}

async handleFactCheckRequest(message, tabId) {
  const cacheKey = this.getCacheKey(message.claim);

  // Check cache first
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }

  // Make API call
  const result = await this.performFactCheck(message.claim);

  // Cache with expiry
  this.cache.set(cacheKey, result);
  setTimeout(() => this.cache.delete(cacheKey), 3600000); // 1 hour

  return result;
}
```

### 4. Security

- Never expose API keys in client-side code
- Use HTTPS for all API calls
- Validate and sanitize all inputs
- Implement CORS if using custom API

### 5. Performance

- Batch similar requests when possible
- Use streaming APIs for real-time processing
- Implement progressive enhancement (show partial results)
- Monitor API usage and costs

## Testing

Test your integration with various claim types:

```javascript
const testClaims = [
  "The Earth is round",
  "Water boils at 100°C at sea level",
  "The moon landing was faked",
  "Vaccines cause autism",
  "Coffee can be healthy in moderation"
];

for (const claim of testClaims) {
  const result = await performFactCheck(claim);
  console.log(`Claim: ${claim}`);
  console.log(`Verdict: ${result.verdict}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log('---');
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Use a proxy or backend service for API calls
2. **Rate Limiting**: Implement exponential backoff
3. **Timeout Errors**: Increase timeout limits or use streaming
4. **Invalid Responses**: Add response validation and fallbacks

### Debug Mode

Enable detailed logging:

```javascript
const DEBUG = true;

if (DEBUG) {
  console.log('Sending request:', claim);
  console.log('API response:', data);
  console.log('Parsed result:', result);
}
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Google Fact Check Tools](https://developers.google.com/fact-check/tools/api)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)

---

For questions or issues, please open an issue on GitHub.
