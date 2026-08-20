// PopFact Popup Script

const VALID_TICKER_SPEEDS = ['slow', 'medium', 'fast'];
const VALID_API_PROVIDERS = ['open-knowledge', 'mock', 'openai', 'claude', 'google', 'custom'];
const MAX_API_KEY_LENGTH = 500;
const STATUS_REFRESH_MS = 5000;

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  updateStatus();
});

function validateSettings(settings) {
  return {
    enableText: Boolean(settings.enableText),
    enableAudio: Boolean(settings.enableAudio),
    enableVideo: Boolean(settings.enableVideo),
    tickerSpeed: VALID_TICKER_SPEEDS.includes(settings.tickerSpeed) ? settings.tickerSpeed : 'medium',
    confidenceThreshold: Math.max(0, Math.min(100, parseInt(settings.confidenceThreshold) || 50)),
    apiProvider: VALID_API_PROVIDERS.includes(settings.apiProvider) ? settings.apiProvider : 'open-knowledge'
  };
}

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
    const validatedSettings = validateSettings(settings);

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
    chrome.tabs.create({ url: 'https://github.com/PetrefiedThunder/PopFact' });
  });
}

function saveSettings() {
  // Validate all inputs to prevent DOM manipulation
  const validatedSyncSettings = validateSettings({
    enableText: document.getElementById('enable-text').checked,
    enableAudio: document.getElementById('enable-audio').checked,
    enableVideo: document.getElementById('enable-video').checked,
    tickerSpeed: document.getElementById('ticker-speed').value,
    confidenceThreshold: document.getElementById('confidence-threshold').value,
    apiProvider: document.getElementById('api-provider').value
  });

  const apiKey = document.getElementById('api-key').value;
  const validatedLocalSettings = {
    apiKey: typeof apiKey === 'string' && apiKey.length <= MAX_API_KEY_LENGTH ? apiKey : ''
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

function refreshClaimsCount() {
  chrome.storage.local.get(['claimsChecked'], (data) => {
    document.getElementById('claims-count').textContent = data.claimsChecked || 0;
  });
}

function updateStatus() {
  refreshClaimsCount();
  setInterval(refreshClaimsCount, STATUS_REFRESH_MS);
}
