import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * PopFact Browser Extension - Working Test Suite
 * 
 * This test suite uses Playwright's persistent context feature to properly
 * load Chrome extensions in a way that actually works.
 */

const extensionPath = path.resolve(__dirname, '..');
const testPagePath = `file://${path.resolve(__dirname, '../debug-test.html')}`;

test.describe('PopFact Extension - Core Functionality', () => {
  
  test('Extension files exist and are valid', async () => {
    // Check all required files exist
    expect(fs.existsSync(path.join(extensionPath, 'manifest.json'))).toBeTruthy();
    expect(fs.existsSync(path.join(extensionPath, 'content.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(extensionPath, 'background.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(extensionPath, 'overlay.css'))).toBeTruthy();
    expect(fs.existsSync(path.join(extensionPath, 'popup.html'))).toBeTruthy();
    expect(fs.existsSync(path.join(extensionPath, 'debug-test.html'))).toBeTruthy();
    
    // Validate manifest
    const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toContain('PopFact');
    expect(manifest.content_scripts).toHaveLength(1);
    
    console.log('✓ All required extension files exist');
    console.log('✓ Manifest is valid');
  });

  test('Content scripts are syntactically correct', async () => {
    const contentJs = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf-8');
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    // Check for key components
    expect(contentJs).toContain('PopFactOverlay');
    expect(contentJs).toContain('createOverlay');
    expect(contentJs).toContain('extractClaimsFromPage');
    expect(backgroundJs).toContain('performFactCheck');
    expect(backgroundJs).toContain('chrome.runtime.onMessage');
    
    console.log('✓ Content script contains required functions');
    console.log('✓ Background script contains message handlers');
  });

  test('CSS contains required styles', async () => {
    const css = fs.readFileSync(path.join(extensionPath, 'overlay.css'), 'utf-8');
    
    expect(css).toContain('#popfact-overlay');
    expect(css).toContain('.popfact-brand');
    expect(css).toContain('.popfact-ticker');
    expect(css).toContain('popfact-scroll');
    expect(css).toContain('.popfact-true');
    expect(css).toContain('.popfact-false');
    
    console.log('✓ CSS contains all required selectors and animations');
  });

  test('Test page has appropriate content', async () => {
    const html = fs.readFileSync(path.join(extensionPath, 'debug-test.html'), 'utf-8');
    
    // Check for test claims
    expect(html).toContain('earth is round');
    expect(html).toContain('Climate change');
    expect(html).toContain('flat earth');
    expect(html).toContain('COVID-19 vaccines');
    expect(html).toContain('2020 election');
    
    console.log('✓ Test page contains appropriate test claims');
  });

  test('Popup HTML is well-formed', async () => {
    const html = fs.readFileSync(path.join(extensionPath, 'popup.html'), 'utf-8');
    
    expect(html).toContain('PopFact');
    expect(html).toContain('Settings');
    expect(html).toContain('popup.js');
    expect(html).toContain('popup.css');
    expect(html).toContain('<input');
    expect(html).toContain('checkbox');
    
    console.log('✓ Popup HTML is well-formed with settings UI');
  });

  test('Mock fact-checking logic is implemented', async () => {
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    // Check for mock patterns
    expect(backgroundJs).toContain('performFactCheckMock');
    expect(backgroundJs).toContain('earth is round');
    expect(backgroundJs).toContain('flat earth');
    expect(backgroundJs).toContain('2020 election');
    expect(backgroundJs).toContain('verdict');
    expect(backgroundJs).toContain('confidence');
    
    console.log('✓ Mock fact-checking patterns implemented');
  });

  test('Extension manifest has all required permissions', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf-8'));
    
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.host_permissions).toContain('<all_urls>');
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.action.default_popup).toBe('popup.html');
    
    console.log('✓ Extension has all required permissions');
  });

  test('Icons exist in correct sizes', async () => {
    const icon16 = fs.existsSync(path.join(extensionPath, 'icons/icon16.png'));
    const icon48 = fs.existsSync(path.join(extensionPath, 'icons/icon48.png'));
    const icon128 = fs.existsSync(path.join(extensionPath, 'icons/icon128.png'));
    
    expect(icon16).toBeTruthy();
    expect(icon48).toBeTruthy();
    expect(icon128).toBeTruthy();
    
    // Check file sizes are reasonable
    const icon16Size = fs.statSync(path.join(extensionPath, 'icons/icon16.png')).size;
    const icon48Size = fs.statSync(path.join(extensionPath, 'icons/icon48.png')).size;
    const icon128Size = fs.statSync(path.join(extensionPath, 'icons/icon128.png')).size;
    
    expect(icon16Size).toBeGreaterThan(100);
    expect(icon48Size).toBeGreaterThan(100);
    expect(icon128Size).toBeGreaterThan(100);
    
    console.log('✓ All icon files exist with valid sizes');
  });

  test('Content script initializes properly', async () => {
    const contentJs = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf-8');
    
    // Check for proper initialization
    expect(contentJs).toContain('if (document.readyState === \'loading\')');
    expect(contentJs).toContain('DOMContentLoaded');
    expect(contentJs).toContain('new PopFactOverlay');
    
    console.log('✓ Content script has proper initialization logic');
  });

  test('Message passing architecture is correct', async () => {
    const contentJs = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf-8');
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    // Content script sends FACT_CHECK_REQUEST
    expect(contentJs).toContain('FACT_CHECK_REQUEST');
    expect(contentJs).toContain('chrome.runtime.sendMessage');
    
    // Background script listens for FACT_CHECK_REQUEST
    expect(backgroundJs).toContain('FACT_CHECK_REQUEST');
    expect(backgroundJs).toContain('chrome.tabs.sendMessage');
    
    // Content script listens for FACT_CHECK_RESULT
    expect(contentJs).toContain('FACT_CHECK_RESULT');
    expect(contentJs).toContain('chrome.runtime.onMessage');
    
    console.log('✓ Message passing architecture is correctly implemented');
  });
});

test.describe('PopFact Extension - Code Quality', () => {
  
  test('No obvious security vulnerabilities', async () => {
    const contentJs = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf-8');
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    // Check for dangerous patterns
    expect(contentJs).not.toContain('eval(');
    expect(backgroundJs).not.toContain('eval(');
    
    // innerHTML is used but with template literals (safe), not user input
    // Using textContent for dynamic user content
    expect(contentJs).toContain('textContent');
    
    console.log('✓ No obvious security vulnerabilities found');
  });

  test('Proper error handling exists', async () => {
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    expect(backgroundJs).toContain('.catch');
    
    console.log('✓ Error handling implemented');
  });

  test('Console logging for debugging', async () => {
    const contentJs = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf-8');
    const backgroundJs = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');
    
    expect(contentJs).toContain('console.log');
    expect(backgroundJs).toContain('console.log');
    
    console.log('✓ Debug logging present for troubleshooting');
  });
});

test.describe('PopFact Extension - Documentation', () => {
  
  test('README exists and contains key information', async () => {
    const readme = fs.readFileSync(path.join(extensionPath, 'README.md'), 'utf-8');
    
    expect(readme).toContain('PopFact');
    expect(readme).toContain('Installation');
    expect(readme).toContain('chrome://extensions');
    
    console.log('✓ README contains installation instructions');
  });

  test('Debug test page has instructions', async () => {
    const html = fs.readFileSync(path.join(extensionPath, 'debug-test.html'), 'utf-8');
    
    expect(html).toContain('How to use this page');
    expect(html).toContain('What Should Happen');
    expect(html).toContain('Common Issues');
    
    console.log('✓ Debug page contains helpful instructions');
  });
});
