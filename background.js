// PopFact Background Service Worker - Pure Mock Fact-Checking for Demo

// TASK 2: Mock fact-check engine with simple heuristics
function performFactCheckMock(claimText) {
  const normalized = claimText.toLowerCase();

  let verdict = 'UNVERIFIED';
  let confidence = 0.5;
  let explanation = 'Insufficient evidence to verify this claim';
  const sources = ['Demo Source A', 'Demo Source B'];

  // Simple heuristic pattern matching
  if (normalized.includes('covid')) {
    verdict = 'MIXED';
    confidence = 0.6;
    explanation = 'Contains both accurate and contextual information';
  } else if (normalized.includes('2020 election')) {
    verdict = 'FALSE';
    confidence = 0.9;
    explanation = 'This claim contradicts established facts';
  } else if (normalized.includes('earth is round') || normalized.includes('vaccines work')) {
    verdict = 'TRUE';
    confidence = 0.95;
    explanation = 'This claim is supported by reliable sources';
  } else if (normalized.includes('climate') || normalized.includes('warming')) {
    verdict = 'TRUE';
    confidence = 0.92;
    explanation = 'Supported by scientific consensus';
  } else if (normalized.includes('flat earth')) {
    verdict = 'FALSE';
    confidence = 0.99;
    explanation = 'Contradicts overwhelming scientific evidence';
  }

  return {
    claim: claimText,
    verdict: verdict,
    confidence: confidence,
    explanation: explanation,
    sources: sources,
    checkedAt: Date.now()
  };
}

// TASK 2: Wrapper that always calls mock (ignores provider for now)
function performFactCheck(claimText, provider) {
  // Always use mock for demo - provider parameter ignored
  return performFactCheckMock(claimText);
}

// TASK 2: Handle FACT_CHECK_REQUEST messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FACT_CHECK_REQUEST') {
    const { claimText } = message;

    console.log('PopFact: Processing fact-check request:', claimText);

    // Perform mock fact-check
    const result = performFactCheck(claimText, 'mock');

    // Send result back to content script
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'FACT_CHECK_RESULT',
      data: result
    }).catch(error => {
      console.error('PopFact: Error sending result:', error);
    });
  }
});

console.log('PopFact Background Service: Initialized (Mock Mode)');
