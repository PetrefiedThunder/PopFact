const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { after, test } = require('node:test');
const { chromium } = require('playwright');

// Source can point at an untouched checkout for RED/provenance comparisons.
const sourceRoot = process.env.POPFACT_SOURCE_ROOT || path.resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const contentSource = manifest.content_scripts[0].js
  .map(file => readFileSync(path.join(sourceRoot, file), 'utf8')).join('\n');

let browser;
after(async () => { await browser?.close(); });

test('a threshold change during settings load overrides an older settings snapshot', () => {
  let finishSettingsRead;
  let onStorageChange;
  const context = vm.createContext({
    document: { readyState: 'loading', addEventListener() {} },
    chrome: { storage: {
      sync: { get(_defaults, callback) { finishSettingsRead = callback; } },
      onChanged: { addListener(callback) { onStorageChange = callback; } }
    } }
  });
  vm.runInContext(`${contentSource}\nglobalThis.Overlay = PopFactOverlay;`, context);
  const overlay = Object.create(context.Overlay.prototype);
  overlay.factResults = [];
  overlay.preferencesApplied = false;
  overlay.hasThresholdUpdate = false;
  overlay.applyTickerSpeed = () => {};
  overlay.updateTextCheckingMessage = () => {};
  overlay.detectMediaElements = () => {};
  overlay.monitorPageContent = () => {};
  overlay.watchDisplayPreferences();
  overlay.loadDisplayPreferences();

  onStorageChange({ confidenceThreshold: { newValue: 100 } }, 'sync');
  finishSettingsRead({ enableText: true, tickerSpeed: 'medium', confidenceThreshold: 0 });
  assert.equal(overlay.confidenceThreshold, 100);
  assert.equal(overlay.preferencesApplied, true);
});

test('ticker speed classes keep medium at the existing 60s duration', () => {
  const css = readFileSync(path.join(sourceRoot, 'overlay.css'), 'utf8');
  assert.match(css, /#popfact-ticker-scroll\.speed-slow\s*\{[^}]*animation-duration:\s*120s/);
  assert.match(css, /#popfact-ticker-scroll\.speed-medium\s*\{[^}]*animation-duration:\s*60s/);
  assert.match(css, /#popfact-ticker-scroll\.speed-fast\s*\{[^}]*animation-duration:\s*30s/);
});

test('help action opens the homepage declared in the manifest', async t => {
  assert.equal(manifest.homepage_url, 'https://github.com/PetrefiedThunder/PopFact');
  assert.doesNotMatch(manifest.homepage_url, /yourusername/i);
  browser ||= await chromium.launch({
    headless: true,
    env: { HOME: process.env.HOME, PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
    args: [
      '--disable-background-networking', '--disable-component-update', '--no-default-browser-check',
      '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>'
    ],
    ...(process.env.POPFACT_CHROMIUM_PATH ? { executablePath: process.env.POPFACT_CHROMIUM_PATH } : {})
  });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  t.after(() => context.close());
  const unexpectedRequests = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('file://')) return route.continue();
    unexpectedRequests.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(homepage => {
    window.chrome = {
      runtime: { getManifest: () => ({ homepage_url: homepage }) },
      storage: {
        sync: { get(defaults, callback) { callback(defaults); } },
        local: { get(defaults, callback) { callback(defaults); } }
      },
      tabs: { create(options) { window.__helpTabs = (window.__helpTabs || []).concat(options); } }
    };
  }, manifest.homepage_url);
  await page.goto(`file://${path.join(sourceRoot, 'popup.html')}`);
  await page.locator('#help-link').click();
  const requested = await page.evaluate(() => window.__helpTabs || []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, [], 'help must not navigate away from the popup');
  assert.deepEqual(requested, [{ url: manifest.homepage_url }]);
});
