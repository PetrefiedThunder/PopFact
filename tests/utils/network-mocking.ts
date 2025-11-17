/**
 * Network Mocking Utilities for PopFact Tests
 * 
 * These utilities help mock API responses to avoid live API calls during testing
 */

import { Page, Route } from '@playwright/test';

export interface MockFactCheckResponse {
  claim: string;
  verdict: 'TRUE' | 'FALSE' | 'MIXED' | 'UNVERIFIED';
  explanation: string;
  confidence: number;
  sources?: string[];
  timestamp?: number;
}

/**
 * Mock the background fact-checking service to return predefined responses
 * This intercepts the Chrome runtime message passing
 */
export async function mockFactCheckResponse(
  page: Page, 
  response: MockFactCheckResponse
) {
  // Inject a mock response handler into the page
  await page.addInitScript((mockResponse) => {
    // Store original chrome.runtime.sendMessage
    const originalSendMessage = chrome?.runtime?.sendMessage;
    
    if (originalSendMessage) {
      // Override sendMessage to intercept FACT_CHECK_REQUEST messages
      chrome.runtime.sendMessage = function(message: any, responseCallback?: any) {
        if (message.type === 'FACT_CHECK_REQUEST') {
          // Simulate async response
          setTimeout(() => {
            // Trigger the message listener with our mock response
            const event = new CustomEvent('popfact-mock-response', {
              detail: {
                type: 'FACT_CHECK_RESULT',
                data: {
                  ...mockResponse,
                  claim: message.claim,
                }
              }
            });
            window.dispatchEvent(event);
          }, 100);
          return;
        }
        
        // Pass through other messages
        return originalSendMessage.call(this, message, responseCallback);
      };
      
      // Listen for mock responses and forward to content script
      window.addEventListener('popfact-mock-response', ((e: CustomEvent) => {
        const listeners = (chrome.runtime as any)._messageListeners || [];
        listeners.forEach((listener: any) => {
          listener(e.detail);
        });
      }) as EventListener);
      
      // Track message listeners
      const originalAddListener = chrome.runtime.onMessage?.addListener;
      if (originalAddListener) {
        (chrome.runtime as any)._messageListeners = [];
        chrome.runtime.onMessage.addListener = function(callback: any) {
          (chrome.runtime as any)._messageListeners.push(callback);
          return originalAddListener.call(this, callback);
        };
      }
    }
  }, response);
}

/**
 * Mock multiple fact-check responses based on claim patterns
 */
export async function mockFactCheckResponses(
  page: Page,
  responseMap: Map<string | RegExp, MockFactCheckResponse>
) {
  await page.addInitScript((mockMap: Array<[string, MockFactCheckResponse]>) => {
    const originalSendMessage = chrome?.runtime?.sendMessage;
    
    if (originalSendMessage) {
      chrome.runtime.sendMessage = function(message: any, responseCallback?: any) {
        if (message.type === 'FACT_CHECK_REQUEST') {
          // Find matching response
          let matchedResponse: MockFactCheckResponse | null = null;
          
          for (const [pattern, response] of mockMap) {
            if (message.claim.includes(pattern)) {
              matchedResponse = response;
              break;
            }
          }
          
          if (matchedResponse) {
            setTimeout(() => {
              const event = new CustomEvent('popfact-mock-response', {
                detail: {
                  type: 'FACT_CHECK_RESULT',
                  data: {
                    ...matchedResponse,
                    claim: message.claim,
                  }
                }
              });
              window.dispatchEvent(event);
            }, 100);
          }
          return;
        }
        
        return originalSendMessage.call(this, message, responseCallback);
      };
      
      window.addEventListener('popfact-mock-response', ((e: CustomEvent) => {
        const listeners = (chrome.runtime as any)._messageListeners || [];
        listeners.forEach((listener: any) => {
          listener(e.detail);
        });
      }) as EventListener);
      
      const originalAddListener = chrome.runtime.onMessage?.addListener;
      if (originalAddListener) {
        (chrome.runtime as any)._messageListeners = [];
        chrome.runtime.onMessage.addListener = function(callback: any) {
          (chrome.runtime as any)._messageListeners.push(callback);
          return originalAddListener.call(this, callback);
        };
      }
    }
  }, Array.from(responseMap.entries()));
}

/**
 * Mock API endpoint responses (for external fact-checking APIs)
 */
export async function mockApiEndpoint(
  page: Page,
  url: string | RegExp,
  response: any,
  statusCode: number = 200
) {
  await page.route(url, async (route: Route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}
