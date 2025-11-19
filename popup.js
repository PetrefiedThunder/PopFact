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
    apiProvider: 'mock'
  }, (settings) => {
    // Validate and sanitize settings
    const validatedSettings = {
      enableText: Boolean(settings.enableText),
      enableAudio: Boolean(settings.enableAudio),
      enableVideo: Boolean(settings.enableVideo),
      tickerSpeed: ['slow', 'medium', 'fast'].includes(settings.tickerSpeed) ? settings.tickerSpeed : 'medium',
      confidenceThreshold: Math.max(0, Math.min(100, parseInt(settings.confidenceThreshold) || 50)),
      apiProvider: ['mock', 'openai', 'claude', 'google', 'custom'].includes(settings.apiProvider) ? settings.apiProvider : 'mock'
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

  // Confidence threshold slider
  document.getElementById('confidence-threshold').addEventListener('input', (e) => {
    document.getElementById('confidence-value').textContent = e.target.value + '%';
  });

  // Help link
  document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/popfact' });
  });
}

function saveSettings() {
  // Non-sensitive settings for sync storage
  const syncSettings = {
    enableText: document.getElementById('enable-text').checked,
    enableAudio: document.getElementById('enable-audio').checked,
    enableVideo: document.getElementById('enable-video').checked,
    tickerSpeed: document.getElementById('ticker-speed').value,
    confidenceThreshold: parseInt(document.getElementById('confidence-threshold').value),
    apiProvider: document.getElementById('api-provider').value
  };

  // Sensitive API key for local storage only (not synced)
  const localSettings = {
    apiKey: document.getElementById('api-key').value
  };

  // Save both
  chrome.storage.sync.set(syncSettings);
  chrome.storage.local.set(localSettings, () => {
    // Show success feedback
    const btn = document.getElementById('save-settings');
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
