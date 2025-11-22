// PopFact Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  updateStatus();
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
