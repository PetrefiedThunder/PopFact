// PopFact Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  updateStatus();
});

function loadSettings() {
  chrome.storage.sync.get({
    enableText: true,
    enableAudio: true,
    enableVideo: true,
    tickerSpeed: 'medium',
    confidenceThreshold: 50,
    apiProvider: 'mock',
    apiKey: '',
    useMultiSource: true,
    trustedSourcesOnly: false,
    minSourceCredibility: 70
  }, (settings) => {
    document.getElementById('enable-text').checked = settings.enableText;
    document.getElementById('enable-audio').checked = settings.enableAudio;
    document.getElementById('enable-video').checked = settings.enableVideo;
    document.getElementById('ticker-speed').value = settings.tickerSpeed;
    document.getElementById('confidence-threshold').value = settings.confidenceThreshold;
    document.getElementById('confidence-value').textContent = settings.confidenceThreshold + '%';
    document.getElementById('api-provider').value = settings.apiProvider;
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('use-multi-source').checked = settings.useMultiSource !== false;
    document.getElementById('trusted-sources-only').checked = settings.trustedSourcesOnly || false;
    document.getElementById('min-source-credibility').value = settings.minSourceCredibility || 70;
    document.getElementById('credibility-value').textContent = (settings.minSourceCredibility || 70) + '%';
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
  const settings = {
    enableText: document.getElementById('enable-text').checked,
    enableAudio: document.getElementById('enable-audio').checked,
    enableVideo: document.getElementById('enable-video').checked,
    tickerSpeed: document.getElementById('ticker-speed').value,
    confidenceThreshold: parseInt(document.getElementById('confidence-threshold').value),
    apiProvider: document.getElementById('api-provider').value,
    apiKey: document.getElementById('api-key').value,
    useMultiSource: document.getElementById('use-multi-source').checked,
    trustedSourcesOnly: document.getElementById('trusted-sources-only').checked,
    minSourceCredibility: parseInt(document.getElementById('min-source-credibility').value)
  };

  chrome.storage.sync.set(settings, () => {
    // Notify background script to update settings
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
    
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
