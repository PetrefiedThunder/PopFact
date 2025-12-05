// PopFact Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  updateStatus();
  checkGitHubPage();
});

function loadSettings() {
  // Load non-sensitive settings from sync storage
  chrome.storage.sync.get({
    enableText: true,
    enableAudio: true,
    enableVideo: true,
    tickerSpeed: 'medium',
    confidenceThreshold: 50,
    apiProvider: 'open-knowledge'
  }, (settings) => {
    // Validate and sanitize settings
    const validatedSettings = {
      enableText: Boolean(settings.enableText),
      enableAudio: Boolean(settings.enableAudio),
      enableVideo: Boolean(settings.enableVideo),
      tickerSpeed: ['slow', 'medium', 'fast'].includes(settings.tickerSpeed) ? settings.tickerSpeed : 'medium',
      confidenceThreshold: Math.max(0, Math.min(100, parseInt(settings.confidenceThreshold) || 50)),
      apiProvider: ['open-knowledge', 'mock', 'openai', 'claude', 'google', 'custom'].includes(settings.apiProvider) ? settings.apiProvider : 'open-knowledge'
    };

    document.getElementById('enable-text').checked = validatedSettings.enableText;
    document.getElementById('enable-audio').checked = validatedSettings.enableAudio;
    document.getElementById('enable-video').checked = validatedSettings.enableVideo;
    document.getElementById('ticker-speed').value = validatedSettings.tickerSpeed;
    document.getElementById('confidence-threshold').value = validatedSettings.confidenceThreshold;
    document.getElementById('confidence-value').textContent = validatedSettings.confidenceThreshold + '%';
    document.getElementById('api-provider').value = validatedSettings.apiProvider;
  });

  // Load sensitive API key from local storage (not synced)
  chrome.storage.local.get({
    apiKey: ''
  }, (data) => {
    document.getElementById('api-key').value = data.apiKey || '';
  });
}

function setupEventListeners() {
  // Save settings button
  document.getElementById('save-settings').addEventListener('click', saveSettings);

  // Clear cache button
  document.getElementById('clear-cache').addEventListener('click', clearCache);

  // View stats button
  document.getElementById('view-stats').addEventListener('click', viewStats);

  // Send wrap-up email button
  document.getElementById('send-wrapup').addEventListener('click', sendWrapUpEmail);

  // GitHub integration buttons
  document.getElementById('scan-repo').addEventListener('click', scanRepository);
  document.getElementById('create-issue').addEventListener('click', createGitHubIssue);

  // Confidence threshold slider
  document.getElementById('confidence-threshold').addEventListener('input', (e) => {
    document.getElementById('confidence-value').textContent = e.target.value + '%';
  });

  // Source credibility slider
  document.getElementById('min-source-credibility').addEventListener('input', (e) => {
    document.getElementById('credibility-value').textContent = e.target.value + '%';
  });

  // Help link
  document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/popfact' });
  });
}

function saveSettings() {
  // Get and validate all inputs to prevent DOM manipulation
  const enableText = document.getElementById('enable-text').checked;
  const enableAudio = document.getElementById('enable-audio').checked;
  const enableVideo = document.getElementById('enable-video').checked;
  const tickerSpeed = document.getElementById('ticker-speed').value;
  const confidenceThreshold = parseInt(document.getElementById('confidence-threshold').value);
  const apiProvider = document.getElementById('api-provider').value;
  const apiKey = document.getElementById('api-key').value;

  // Validate all values
  const validatedSyncSettings = {
    enableText: Boolean(enableText),
    enableAudio: Boolean(enableAudio),
    enableVideo: Boolean(enableVideo),
    tickerSpeed: ['slow', 'medium', 'fast'].includes(tickerSpeed) ? tickerSpeed : 'medium',
    confidenceThreshold: Math.max(0, Math.min(100, confidenceThreshold || 50)),
    apiProvider: ['open-knowledge', 'mock', 'openai', 'claude', 'google', 'custom'].includes(apiProvider) ? apiProvider : 'open-knowledge'
  };

  // Validate API key (max length)
  const validatedLocalSettings = {
    apiKey: typeof apiKey === 'string' && apiKey.length <= 500 ? apiKey : ''
  };

  // Save both
  chrome.storage.sync.set(validatedSyncSettings);
  chrome.storage.local.set(validatedLocalSettings, () => {
    // Show success feedback
    const btn = document.getElementById('save-settings');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#28a745';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  });
}

function clearCache() {
  chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => {
    const btn = document.getElementById('clear-cache');
    const originalText = btn.textContent;
    btn.textContent = '✓ Cache Cleared';

    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

function viewStats() {
  chrome.storage.local.get(['claimsChecked', 'lastUpdated'], (data) => {
    const stats = `
Claims Checked: ${data.claimsChecked || 0}
Last Updated: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
    `.trim();

    alert(stats);
  });
}

function sendWrapUpEmail() {
  chrome.storage.local.get({ factCheckLog: [] }, (data) => {
    const log = Array.isArray(data.factCheckLog) ? data.factCheckLog.slice(0, 25) : [];

    if (!log.length) {
      alert('No fact checks recorded yet. Browse a page to generate some results first.');
      return;
    }

    const header = ['Timestamp', 'Claim', 'Verdict', 'Provider', 'Source Type', 'Page URL', 'Sources'].join(',');
    const rows = log.map((entry) => {
      const timestamp = entry.timestamp ? new Date(entry.timestamp).toISOString() : '';
      const claim = (entry.claim || '').replace(/"/g, '""');
      const sources = (entry.sources || []).join(' | ');

      return [
        timestamp,
        `"${claim}"`,
        entry.verdict || 'UNVERIFIED',
        entry.provider || 'open-knowledge',
        entry.sourceType || 'text',
        entry.url || 'unknown',
        `"${sources}"`
      ].join(',');
    });

    const bodyLines = [
      'PopFact wrap-up of recently fact-checked content:',
      header,
      ...rows
    ];

    const mailtoLink = `mailto:?subject=${encodeURIComponent('PopFact fact-check wrap-up')}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = mailtoLink;
  });
}

function updateStatus() {
  chrome.storage.local.get(['claimsChecked'], (data) => {
    document.getElementById('claims-count').textContent = data.claimsChecked || 0;
  });

  // Update status periodically
  setInterval(() => {
    chrome.storage.local.get(['claimsChecked'], (data) => {
      document.getElementById('claims-count').textContent = data.claimsChecked || 0;
    });
  }, 5000);
}

// GitHub Integration Functions

// Store current repo data and scan results
let currentRepoData = null;
let scanResults = [];

function checkGitHubPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;

    const url = tabs[0].url;
    const repoInfo = parseGitHubUrl(url);

    if (repoInfo) {
      currentRepoData = repoInfo;
      showGitHubSection(repoInfo);
    }
  });
}

function parseGitHubUrl(url) {
  // Match GitHub repository URLs
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '').split('#')[0].split('?')[0];

  // Skip non-repo pages
  if (['settings', 'orgs', 'notifications', 'marketplace', 'explore', 'topics', 'trending', 'collections', 'sponsors', 'login', 'signup'].includes(owner)) {
    return null;
  }

  return { owner, repo, url };
}

function showGitHubSection(repoInfo) {
  const githubSection = document.getElementById('github-section');
  const repoInfoDiv = document.getElementById('github-repo-info');

  if (githubSection && repoInfoDiv) {
    githubSection.style.display = 'block';
    repoInfoDiv.innerHTML = `
      <div class="repo-name">${escapeHtml(repoInfo.owner)}/${escapeHtml(repoInfo.repo)}</div>
      <div class="repo-description">Ready to scan repository content for fact-checkable claims</div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scanRepository() {
  if (!currentRepoData) {
    alert('No GitHub repository detected.');
    return;
  }

  const scanBtn = document.getElementById('scan-repo');
  const originalText = scanBtn.textContent;
  scanBtn.textContent = 'Scanning...';
  scanBtn.disabled = true;

  // Send message to content script to scan the page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_REPOSITORY' }, (response) => {
      scanBtn.textContent = originalText;
      scanBtn.disabled = false;

      if (chrome.runtime.lastError) {
        alert('Error scanning repository. Make sure the page is fully loaded.');
        return;
      }

      if (response && response.claims && response.claims.length > 0) {
        scanResults = response.claims;
        showScanResults(response.claims);
        document.getElementById('create-issue').style.display = 'block';
      } else {
        alert('No fact-checkable claims found in this repository.');
        scanResults = [];
        document.getElementById('create-issue').style.display = 'none';
      }
    });
  });
}

function showScanResults(claims) {
  const repoInfoDiv = document.getElementById('github-repo-info');
  if (!repoInfoDiv || !currentRepoData) return;

  const claimsHtml = claims.slice(0, 5).map((claim, i) => {
    const truncated = claim.length > 100 ? claim.substring(0, 100) + '...' : claim;
    return `<div style="font-size: 11px; color: #555; margin: 4px 0; padding: 4px; background: #f9f9f9; border-radius: 3px;">${i + 1}. ${escapeHtml(truncated)}</div>`;
  }).join('');

  repoInfoDiv.innerHTML = `
    <div class="repo-name">${escapeHtml(currentRepoData.owner)}/${escapeHtml(currentRepoData.repo)}</div>
    <div class="repo-description">Found ${claims.length} potential claims:</div>
    ${claimsHtml}
    ${claims.length > 5 ? `<div style="font-size: 11px; color: #888;">...and ${claims.length - 5} more</div>` : ''}
  `;
}

function createGitHubIssue() {
  if (!currentRepoData || scanResults.length === 0) {
    alert('No scan results available. Please scan the repository first.');
    return;
  }

  // Get fact-check results from storage
  chrome.storage.local.get({ factCheckLog: [] }, (data) => {
    const recentChecks = (data.factCheckLog || []).slice(0, 10);
    
    // Build issue body
    const issueTitle = 'PopFact: Fact-Check Findings for Repository Content';
    
    let issueBody = `## PopFact Automated Fact-Check Report\n\n`;
    issueBody += `**Repository:** ${currentRepoData.owner}/${currentRepoData.repo}\n`;
    issueBody += `**Scanned:** ${new Date().toISOString()}\n\n`;
    issueBody += `---\n\n`;
    issueBody += `### Summary\n\n`;
    issueBody += `PopFact identified **${scanResults.length}** potential factual claims in this repository's content.\n\n`;

    if (recentChecks.length > 0) {
      issueBody += `### Recent Fact-Check Results\n\n`;
      issueBody += `| Claim | Verdict | Confidence |\n`;
      issueBody += `|-------|---------|------------|\n`;
      
      recentChecks.forEach((check) => {
        // Escape both backslashes and pipes for Markdown table safety
        const claimText = (check.claim || '').substring(0, 60).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
        const verdict = check.verdict || 'UNVERIFIED';
        const confidence = check.confidence ? `${Math.round(check.confidence * 100)}%` : 'N/A';
        issueBody += `| ${claimText}... | ${verdict} | ${confidence} |\n`;
      });
      
      issueBody += `\n`;
    }

    issueBody += `### Claims Found\n\n`;
    scanResults.slice(0, 10).forEach((claim, i) => {
      const truncated = claim.length > 200 ? claim.substring(0, 200) + '...' : claim;
      issueBody += `${i + 1}. ${truncated}\n`;
    });

    if (scanResults.length > 10) {
      issueBody += `\n*...and ${scanResults.length - 10} more claims*\n`;
    }

    issueBody += `\n---\n\n`;
    issueBody += `> ⚠️ **Note:** This is an automated report from PopFact browser extension. `;
    issueBody += `Results are based on heuristic analysis and should be verified manually. `;
    issueBody += `PopFact is a demonstration tool and does not provide authoritative fact-checking.\n`;

    // Open GitHub new issue page with pre-filled content
    const newIssueUrl = `https://github.com/${encodeURIComponent(currentRepoData.owner)}/${encodeURIComponent(currentRepoData.repo)}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
    
    chrome.tabs.create({ url: newIssueUrl });
  });
}
