const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const popupScript = readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8');
const popupHtml = readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');

function openPopup(sync = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        checked: false, value: '', textContent: '', style: {}, listeners: {},
        addEventListener(type, callback) { this.listeners[type] = callback; }
      });
    }
    return elements.get(id);
  };
  let onReady;
  const context = vm.createContext({
    document: {
      addEventListener(type, callback) { if (type === 'DOMContentLoaded') onReady = callback; },
      getElementById: element
    },
    chrome: {
      storage: {
        sync: {
          get(defaults, callback) { callback({ ...defaults, ...sync }); },
          set(values) { Object.assign(sync, values); }
        },
        local: {
          get(defaults, callback) { callback(Array.isArray(defaults) ? {} : defaults); },
          set(_values, callback) { callback(); }
        }
      }
    },
    setInterval() {},
    setTimeout() {}
  });
  vm.runInContext(popupScript, context, { filename: 'popup.js' });
  onReady();
  return { element, save: () => element('save-settings').listeners.click() };
}

test('unsupported source controls are visibly unavailable', () => {
  assert.match(popupHtml, /Source selection and credibility filters are unavailable/);
  for (const id of ['use-multi-source', 'trusted-sources-only', 'min-source-credibility']) {
    assert.doesNotMatch(popupHtml, new RegExp(`id="${id}"`));
  }
});

test('confidence thresholds 0, 50, and 100 survive save and reopen', () => {
  for (const threshold of [0, 50, 100]) {
    const sync = {};
    const first = openPopup(sync);
    first.element('confidence-threshold').value = String(threshold);
    first.save();
    assert.equal(sync.confidenceThreshold, threshold);

    const reopened = openPopup(sync);
    assert.equal(Number(reopened.element('confidence-threshold').value), threshold);
    assert.equal(reopened.element('confidence-value').textContent, `${threshold}%`);
  }
});

test('missing and invalid confidence thresholds fall back to 50', () => {
  for (const stored of [{}, { confidenceThreshold: null }, { confidenceThreshold: '' },
    { confidenceThreshold: 'invalid' }, { confidenceThreshold: '12px' }]) {
    const popup = openPopup(stored);
    assert.equal(Number(popup.element('confidence-threshold').value), 50);
    popup.save();
    assert.equal(stored.confidenceThreshold, 50);
  }
});

test('remaining exposed settings survive save and reopen', () => {
  for (const id of ['enable-text', 'enable-audio', 'enable-video', 'ticker-speed',
    'confidence-threshold', 'api-provider', 'api-key', 'save-settings']) {
    assert.match(popupHtml, new RegExp(`id="${id}"`));
  }
  const sync = {};
  const first = openPopup(sync);
  first.element('enable-text').checked = false;
  first.element('enable-audio').checked = false;
  first.element('enable-video').checked = true;
  first.element('ticker-speed').value = 'fast';
  first.element('api-provider').value = 'mock';
  first.save();

  const reopened = openPopup(sync);
  assert.equal(reopened.element('enable-text').checked, false);
  assert.equal(reopened.element('enable-audio').checked, false);
  assert.equal(reopened.element('enable-video').checked, true);
  assert.equal(reopened.element('ticker-speed').value, 'fast');
  assert.equal(reopened.element('api-provider').value, 'mock');
});
