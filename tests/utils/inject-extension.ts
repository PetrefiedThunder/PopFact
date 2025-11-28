/**
 * Extension Injection Utilities for Testing
 * 
 * Since the extension requires a persistent browser context which doesn't work
 * well with headless testing, we simulate the extension by injecting the content
 * script and CSS directly into the test pages.
 */

import { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Inject the PopFact extension content script and CSS into a page
 * This simulates what would happen when the extension is loaded
 */
export async function injectExtension(page: Page): Promise<void> {
  // Read the content script
  const contentScriptPath = path.join(process.cwd(), 'content.js');
  const contentScript = readFileSync(contentScriptPath, 'utf-8');
  
  // Read the CSS
  const cssPath = path.join(process.cwd(), 'overlay.css');
  const css = readFileSync(cssPath, 'utf-8');
  
  // Mock the chrome.runtime API for message passing
  await page.addInitScript(() => {
    // Create a mock chrome.runtime API
    (window as any).chrome = {
      runtime: {
        sendMessage: (message: any, callback?: any) => {
          // Store messages for processing
          if (!(window as any).__chromeMessages) {
            (window as any).__chromeMessages = [];
          }
          (window as any).__chromeMessages.push(message);
          
          // Simulate response callback if provided
          if (callback) {
            callback({ success: true });
          }
        },
        onMessage: {
          addListener: (callback: any) => {
            // Store listeners
            if (!(window as any).__chromeMessageListeners) {
              (window as any).__chromeMessageListeners = [];
            }
            (window as any).__chromeMessageListeners.push(callback);
          },
        },
      },
    };
  });
  
  // Inject CSS
  await page.addStyleTag({ content: css });
  
  // Inject content script
  await page.addScriptTag({ content: contentScript });
  
  // Wait a moment for the script to initialize
  await page.waitForTimeout(500);
}

/**
 * Get messages sent by the content script
 */
export async function getMessages(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    return (window as any).__chromeMessages || [];
  });
}

/**
 * Send a message to the content script (simulate background response)
 */
export async function sendMessageToContent(page: Page, message: any): Promise<void> {
  await page.evaluate((msg) => {
    const listeners = (window as any).__chromeMessageListeners || [];
    listeners.forEach((listener: any) => {
      listener(msg, {}, () => {});
    });
  }, message);
}

/**
 * Clear all intercepted messages
 */
export async function clearMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__chromeMessages = [];
  });
}
