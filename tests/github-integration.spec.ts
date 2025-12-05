/**
 * GitHub Integration Tests
 * 
 * Tests for the repository scanning and issue creation functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('GitHub Integration Tests', () => {
  
  test('Can detect GitHub repository page pattern', async ({ page }) => {
    // Create a test page that simulates GitHub repo URL parsing
    await page.setContent(`
      <html>
        <body>
          <div id="result"></div>
          <script>
            function parseGitHubUrl(url) {
              const match = url.match(/^https:\\/\\/github\\.com\\/([^/]+)\\/([^/]+)/);
              if (!match) return null;
              const owner = match[1];
              const repo = match[2].replace(/\\.git$/, '').split('#')[0].split('?')[0];
              if (['settings', 'orgs', 'notifications', 'marketplace', 'explore'].includes(owner)) {
                return null;
              }
              return { owner, repo };
            }
            
            // Test cases
            const tests = [
              { url: 'https://github.com/owner/repo', expected: { owner: 'owner', repo: 'repo' } },
              { url: 'https://github.com/owner/repo/issues', expected: { owner: 'owner', repo: 'repo' } },
              { url: 'https://github.com/owner/repo.git', expected: { owner: 'owner', repo: 'repo' } },
              { url: 'https://github.com/explore', expected: null },
              { url: 'https://google.com', expected: null }
            ];
            
            const results = tests.map(t => {
              const result = parseGitHubUrl(t.url);
              return JSON.stringify(result) === JSON.stringify(t.expected);
            });
            
            document.getElementById('result').textContent = results.every(r => r) ? 'PASS' : 'FAIL';
          </script>
        </body>
      </html>
    `);
    
    const result = await page.locator('#result').textContent();
    expect(result).toBe('PASS');
  });
  
  test('Can scan repository content for claims', async ({ page }) => {
    // Create a mock GitHub README-like page
    await page.setContent(`
      <html>
        <body>
          <article class="markdown-body">
            <h1>Test Project</h1>
            <p>This is a demonstration project that showcases advanced machine learning techniques for natural language processing.</p>
            <p>The project uses state-of-the-art algorithms to achieve high accuracy in text classification tasks.</p>
            <p>Installation requires npm install command.</p>
            <p>I think this is cool.</p>
            <h2>Features</h2>
            <ul>
              <li>Real-time processing capabilities enable instant analysis of large text datasets with minimal latency overhead.</li>
              <li>Short item</li>
            </ul>
          </article>
          <div id="claims"></div>
          <script>
            function scanRepositoryContent() {
              const claims = [];
              const readmeContent = document.querySelector('.markdown-body');
              
              if (readmeContent) {
                const elements = readmeContent.querySelectorAll('p, h1, h2, h3, li');
                let allText = '';
                
                elements.forEach(el => {
                  if (el.closest('pre') || el.closest('code') || el.closest('nav')) return;
                  allText += ' ' + el.textContent;
                });
                
                const sentences = allText.split(/[.!?]+/);
                
                for (const sentence of sentences) {
                  const trimmed = sentence.trim();
                  const wordCount = trimmed.split(/\\s+/).length;
                  
                  if (trimmed.length > 40 && trimmed.length < 500 && wordCount > 6) {
                    if (trimmed.includes('?')) continue;
                    if (/^(I |We |My |Our |You |Please |Note:|Warning:|Tip:)/i.test(trimmed)) continue;
                    if (trimmed.includes('npm ') || trimmed.includes('git ')) continue;
                    
                    claims.push(trimmed);
                  }
                  
                  if (claims.length >= 20) break;
                }
              }
              
              return claims;
            }
            
            const claims = scanRepositoryContent();
            document.getElementById('claims').textContent = JSON.stringify(claims);
          </script>
        </body>
      </html>
    `);
    
    const claimsJson = await page.locator('#claims').textContent();
    const claims = JSON.parse(claimsJson || '[]');
    
    // Should find some claims
    expect(claims.length).toBeGreaterThan(0);
    
    // Should not include short items
    claims.forEach((claim: string) => {
      expect(claim.length).toBeGreaterThan(40);
    });
    
    // Should not include "I think" statements
    const hasIStatements = claims.some((c: string) => /^I /i.test(c));
    expect(hasIStatements).toBe(false);
  });
  
  test('Generates proper issue template structure', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="result"></div>
          <script>
            const repoData = { owner: 'test-owner', repo: 'test-repo' };
            const scanResults = [
              'This project provides high-performance data processing capabilities.',
              'The algorithm achieves 95% accuracy on benchmark datasets.'
            ];
            
            const issueTitle = 'PopFact: Fact-Check Findings for Repository Content';
            
            let issueBody = '## PopFact Automated Fact-Check Report\\n\\n';
            issueBody += '**Repository:** ' + repoData.owner + '/' + repoData.repo + '\\n';
            issueBody += '### Claims Found\\n\\n';
            scanResults.forEach((claim, i) => {
              issueBody += (i + 1) + '. ' + claim + '\\n';
            });
            
            document.getElementById('result').innerHTML = 
              '<div id="title">' + issueTitle + '</div>' +
              '<div id="body">' + issueBody + '</div>';
          </script>
        </body>
      </html>
    `);
    
    const title = await page.locator('#title').textContent();
    const body = await page.locator('#body').textContent();
    
    expect(title).toContain('PopFact');
    expect(title).toContain('Fact-Check');
    expect(body).toContain('test-owner/test-repo');
    expect(body).toContain('95% accuracy');
    expect(body).toContain('Claims Found');
  });
  
  test('HTML escaping prevents XSS in repo names', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="output"></div>
          <script>
            function escapeHtml(text) {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            }
            
            const maliciousInput = '<script>alert("xss")<\\/script>';
            const escaped = escapeHtml(maliciousInput);
            
            document.getElementById('output').textContent = escaped;
          </script>
        </body>
      </html>
    `);
    
    // Wait for the script to execute
    await page.waitForFunction(() => document.getElementById('output')?.textContent !== '');
    
    const escaped = await page.locator('#output').textContent();
    
    // Should escape HTML entities
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
  });
  
  test('Popup GitHub section is hidden by default', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/popup.html`);
    
    const githubSection = page.locator('#github-section');
    
    // Should exist but be hidden
    await expect(githubSection).toBeAttached();
    
    // Check display style
    const display = await githubSection.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });
  
  test('Scan repo button exists in popup', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/popup.html`);
    
    const scanButton = page.locator('#scan-repo');
    await expect(scanButton).toBeAttached();
    await expect(scanButton).toHaveText('Scan Repository Content');
  });
  
  test('Create issue button exists but hidden initially', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/popup.html`);
    
    const createButton = page.locator('#create-issue');
    await expect(createButton).toBeAttached();
    
    // Should be hidden initially
    const display = await createButton.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });
});
