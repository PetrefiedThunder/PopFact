const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { after, test } = require('node:test');
const { chromium } = require('playwright');

// Source can point at an untouched checkout for RED/provenance comparisons.
const sourceRoot = process.env.POPFACT_SOURCE_ROOT || path.resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const workerSource = readFileSync(path.join(sourceRoot, manifest.background.service_worker), 'utf8');
const contentSource = manifest.content_scripts[0].js
  .map(file => readFileSync(path.join(sourceRoot, file), 'utf8')).join('\n');
const initialClaim = 'The synthetic observatory measures forty bright stars during every winter season';
const dynamicClaim = 'The synthetic laboratory records twenty water samples during every spring season';
const excludedClaim = 'This synthetic excluded sentence contains enough words to qualify as a claim';
const fixtureUrl = 'https://popfact.invalid/fixture?synthetic=value#fragment';

function workerHarness() {
  const listeners = [];
  const storageListeners = [];
  const intervals = [];
  const timeouts = [];
  const results = [];
  const fetches = [];
  const local = {};
  const storageReads = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    setInterval(callback, delay) { intervals.push({ callback, delay }); },
    setTimeout(callback) { timeouts.push(callback); },
    fetch: async url => {
      // The VM has no real fetch; both provider calls resolve only synthetic data.
      fetches.push(url);
      assert.match(url, /^https:\/\/(en\.wikipedia\.org\/w\/api\.php|r\.jina\.ai\/https:\/\/twitter\.com\/search)/);
      return {
        ok: true,
        json: async () => ({ query: { search: [{ title: 'Synthetic result', snippet: 'This is a synthetic fixture.' }] } }),
        text: async () => ''
      };
    },
    chrome: {
      runtime: { onMessage: { addListener: listener => listeners.push(listener) } },
      storage: {
        sync: { get(defaults, callback) { storageReads.push('sync'); callback(defaults); } },
        local: {
          get(defaults, callback) { storageReads.push('local'); callback({ ...defaults, ...local }); },
          set(values) { Object.assign(local, values); }
        },
        onChanged: { addListener: listener => storageListeners.push(listener) }
      },
      tabs: { async sendMessage(tabId, message) { results.push({ tabId, message }); } }
    }
  });
  vm.runInContext(workerSource, context, { filename: manifest.background.service_worker });
  return { listeners, storageListeners, intervals, timeouts, results, fetches, storageReads };
}

async function flushPromises() {
  await new Promise(resolve => setImmediate(resolve));
}

test('worker entrypoint starts one service and handles requests/cache clear after fresh starts', async () => {
  for (let restart = 0; restart < 2; restart += 1) {
    const worker = workerHarness();
    assert.equal(worker.listeners.length, 1, 'shipped worker must register its message handler');
    assert.equal(worker.storageListeners.length, 1);
    assert.equal(worker.intervals.length, 1);
    assert.equal(worker.intervals[0].delay, 1000);
    assert.deepEqual(worker.storageReads, ['sync', 'local']);
    const request = {
      type: 'FACT_CHECK_REQUEST', claim: initialClaim, source: 'text',
      url: 'https://popfact.invalid/fixture', timestamp: Date.now()
    };
    const dispatch = message => worker.listeners[0](message, { tab: { id: 7 } }, () => {});
    dispatch(request);
    await flushPromises();
    assert.equal(worker.fetches.length, 2);
    assert.equal(worker.results.length, 1);
    assert.equal(worker.results[0].tabId, 7);
    assert.equal(worker.results[0].message.type, 'FACT_CHECK_RESULT');
    assert.equal(worker.results[0].message.data.claim, initialClaim);
    assert.equal(worker.results[0].message.data.verdict, 'TRUE');
    worker.timeouts.shift()(); // Complete this queue cycle without a real timer.
    dispatch(request);
    await flushPromises();
    assert.equal(worker.results.length, 2);
    assert.equal(worker.fetches.length, 2, 'cached request must avoid another provider call');
    let clearResponse;
    worker.listeners[0]({ type: 'CLEAR_CACHE' }, {}, value => { clearResponse = value; });
    assert.equal(clearResponse.success, true);
    dispatch(request);
    await flushPromises();
    assert.equal(worker.fetches.length, 4, 'clear cache must force a fresh synthetic provider call');
    assert.equal(worker.results.length, 3);
    assert.equal(worker.listeners.length, 1);
    assert.equal(worker.storageListeners.length, 1);
    assert.equal(worker.intervals.length, 1);
  }
});

let browser;
after(async () => { await browser?.close(); });

function installChromeAndClockMocks() {
  const state = window.__fixture = {
    messages: [], listeners: new Set(), observers: new Set(), timers: new Map(), now: 0, nextTimer: 1
  };
  window.chrome = {
    runtime: {
      sendMessage(message) { state.messages.push(message); return Promise.resolve(); },
      onMessage: {
        addListener(listener) { state.listeners.add(listener); },
        removeListener(listener) { state.listeners.delete(listener); }
      }
    }
  };
  const NativeObserver = window.MutationObserver;
  window.MutationObserver = class extends NativeObserver {
    observe(...args) {
      // Playwright also observes the document while injecting scripts.
      if (args[0] === document.body) state.observers.add(this);
      return super.observe(...args);
    }
    disconnect() { state.observers.delete(this); return super.disconnect(); }
  };
  window.setTimeout = (callback, delay) => {
    const id = state.nextTimer++;
    state.timers.set(id, { callback, at: state.now + delay });
    return id;
  };
  window.clearTimeout = id => state.timers.delete(id);
  state.tick = milliseconds => {
    state.now += milliseconds;
    for (const [id, timer] of [...state.timers]) {
      if (timer.at <= state.now) {
        state.timers.delete(id);
        timer.callback();
      }
    }
  };
}

async function contentHarness(t, { startup = 'ready', claims = [initialClaim] } = {}) {
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
  const page = await context.newPage();
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    if (route.request().url().split('#')[0] !== fixtureUrl.split('#')[0]) {
      unexpectedRequests.push(route.request().url());
      return route.abort();
    }
    const script = startup === 'loading' ? `<script>${contentSource}</script>` : '';
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${script}</head>
      <body>${claims.map(claim => `<p>${claim}.</p>`).join('')}
      <script type="application/json">${excludedClaim}.</script>
      <style>/* ${excludedClaim}. */</style><noscript>${excludedClaim}.</noscript></body></html>` });
  });
  await page.addInitScript(installChromeAndClockMocks);
  await page.goto(fixtureUrl);
  if (startup === 'manual') {
    // Defer the automatic path solely for the supplemental method-idempotency test.
    await page.evaluate(() => Object.defineProperty(document, 'readyState', { value: 'loading' }));
  }
  if (startup !== 'loading') await page.addScriptTag({ content: contentSource });
  t.after(() => assert.deepEqual(unexpectedRequests, [], 'fixture must make no external requests'));
  return { page, errors };
}

async function snapshot(page) {
  return page.evaluate(() => ({
    claims: __fixture.messages.filter(message => message.type === 'FACT_CHECK_REQUEST').map(message => message.claim),
    listeners: __fixture.listeners.size,
    observers: __fixture.observers.size,
    timers: __fixture.timers.size,
    overlays: document.querySelectorAll('#popfact-overlay').length,
    toggles: document.querySelectorAll('#popfact-toggle').length
  }));
}

async function appendClaim(page, claim) {
  await page.evaluate(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = `${text}.`;
    document.body.appendChild(paragraph);
  }, claim);
}

for (const startup of ['ready', 'loading']) {
  test(`content ${startup} entrypoint scans initial/dynamic text and excludes overlay content`, async t => {
    const { page, errors } = await contentHarness(t, { startup });
    assert.deepEqual(errors, [], 'shipped content startup must not throw');
    assert.deepEqual(await snapshot(page), {
      claims: [initialClaim], listeners: 1, observers: 1, timers: 0, overlays: 1, toggles: 1
    });
    await appendClaim(page, dynamicClaim);
    await page.evaluate(() => __fixture.tick(500));
    assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim]);
    await page.evaluate(claim => {
      for (const listener of __fixture.listeners) listener({ type: 'FACT_CHECK_RESULT', data: {
        claim, verdict: 'TRUE', explanation: claim, confidence: 0.8
      } });
    }, excludedClaim);
    await page.evaluate(() => __fixture.tick(500));
    assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim]);
    assert.equal(await page.locator('.popfact-item').count(), 2, 'one result plus its scrolling clone');
    assert.deepEqual(errors, []);
  });
}

test('repeated DOMContentLoaded does not duplicate content initialization', async t => {
  const { page, errors } = await contentHarness(t, { startup: 'loading' });
  await page.evaluate(() => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });
  assert.deepEqual(errors, []);
  const state = await snapshot(page);
  assert.equal(state.overlays, 1);
  assert.equal(state.toggles, 1);
  assert.equal(state.listeners, 1);
  assert.equal(state.observers, 1);
  assert.deepEqual(state.claims, [initialClaim]);
});

test('repeated init, monitor, and listener setup on one overlay remain idempotent', async t => {
  const { page, errors } = await contentHarness(t, { startup: 'manual' });
  await page.evaluate(() => {
    const overlay = new PopFactOverlay();
    overlay.init();
    overlay.init();
    overlay.monitorPageContent();
    overlay.setupMessageListener();
  });
  assert.deepEqual(errors, []);
  const state = await snapshot(page);
  assert.equal(state.overlays, 1);
  assert.equal(state.toggles, 1);
  assert.equal(state.listeners, 1);
  assert.equal(state.observers, 1);
  await appendClaim(page, dynamicClaim);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim]);
});

test('a new mutation cancels the previous pending scan and only scans latest text', async t => {
  const { page, errors } = await contentHarness(t);
  await appendClaim(page, 'The transient synthetic paragraph disappears before its claim can be scanned');
  await page.evaluate(() => __fixture.tick(400));
  await page.evaluate(claim => { document.querySelector('p:last-of-type').textContent = `${claim}.`; }, dynamicClaim);
  assert.equal((await snapshot(page)).timers, 1);
  await page.evaluate(() => __fixture.tick(100));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim], 'superseded timer must not scan early');
  await page.evaluate(() => __fixture.tick(400));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim]);
  assert.equal((await snapshot(page)).timers, 0);
  assert.deepEqual(errors, []);
});

test('dynamic claims beyond the first ten are scanned without exceeding the per-scan cap', async t => {
  const claims = Array.from({ length: 10 }, (_, index) => `${initialClaim} number ${index}`);
  const { page, errors } = await contentHarness(t, { claims });
  assert.deepEqual((await snapshot(page)).claims, claims);
  await appendClaim(page, dynamicClaim);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [...claims, dynamicClaim]);
  const batch = Array.from({ length: 12 }, (_, index) => `${dynamicClaim} number ${index}`);
  for (const claim of batch) await appendClaim(page, claim);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [...claims, dynamicClaim, ...batch.slice(0, 10)]);
  assert.deepEqual(errors, []);
});

async function deliverResult(page, claim = initialClaim) {
  await page.evaluate(text => {
    for (const listener of __fixture.listeners) listener({ type: 'FACT_CHECK_RESULT', data: {
      claim: text, verdict: 'TRUE', explanation: text, confidence: 0.8
    } });
  }, claim);
}

test('overlay and toggle mutations do not schedule page scans', async t => {
  const { page, errors } = await contentHarness(t);
  await deliverResult(page);
  await page.evaluate(() => {
    document.getElementById('popfact-toggle').click();
    document.getElementById('popfact-flow-toggle').click();
    document.querySelector('.popfact-claim').firstChild.data = 'Synthetic ticker text changed';
  });
  assert.equal((await snapshot(page)).timers, 0);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim]);
  assert.deepEqual(errors, []);
});

test('overlay updates preserve pending host debounce and mixed host mutations still scan', async t => {
  const { page, errors } = await contentHarness(t);
  await appendClaim(page, dynamicClaim);
  await page.evaluate(() => __fixture.tick(400));
  await deliverResult(page);
  await page.evaluate(() => __fixture.tick(100));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim],
    'ticker updates must not postpone a valid page scan');
  const editedClaim = 'The synthetic museum catalogs thirty ancient artifacts during every summer season';
  await page.evaluate(text => {
    document.querySelector('p').firstChild.data = `${text}.`;
    document.getElementById('popfact-status-text').textContent = 'Synthetic status';
  }, editedClaim);
  assert.equal((await snapshot(page)).timers, 1);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [initialClaim, dynamicClaim, editedClaim]);
  assert.deepEqual(errors, []);
});

test('ticker results cannot restart scanning after the retained-claim capacity is reached', async t => {
  const claims = Array.from({ length: 1000 }, (_, index) => `${initialClaim} number ${index}`);
  const { page, errors } = await contentHarness(t, { claims });
  // Each genuine host mutation requests another capped batch from the shipped scanner.
  await page.evaluate(async () => {
    for (let batch = 1; batch < 100; batch += 1) {
      document.body.appendChild(document.createTextNode(' '));
      await Promise.resolve();
      __fixture.tick(500);
    }
  });
  assert.deepEqual((await snapshot(page)).claims, claims);
  await appendClaim(page, dynamicClaim);
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [...claims, dynamicClaim]);
  for (let result = 0; result < 6; result += 1) {
    await deliverResult(page, dynamicClaim);
    await page.evaluate(() => __fixture.tick(500));
  }
  assert.equal((await snapshot(page)).claims.length, 1001,
    'result rendering must not cause old evicted claims to be dispatched again');
  assert.equal((await snapshot(page)).timers, 0);
  const newHostClaim = 'The synthetic university tracks fifty research projects during every autumn season';
  await appendClaim(page, newHostClaim);
  await page.evaluate(() => __fixture.tick(500));
  assert.ok((await snapshot(page)).claims.includes(newHostClaim), 'real host mutations must still scan');
  assert.deepEqual(errors, []);
});

async function scanInitialThousandClaims(page) {
  await page.evaluate(async () => {
    for (let batch = 1; batch < 100; batch += 1) {
      document.body.appendChild(document.createTextNode(' '));
      await Promise.resolve();
      __fixture.tick(500);
    }
  });
}

async function appendClaimBatch(page, claims) {
  await page.evaluate(texts => {
    for (const text of texts) {
      const paragraph = document.createElement('p');
      paragraph.textContent = `${text}.`;
      document.body.appendChild(paragraph);
    }
  }, claims);
  await page.evaluate(() => __fixture.tick(500));
}

test('visible old claims cannot starve appended, prepended, or edited claims after history eviction', async t => {
  const initial = Array.from({ length: 1000 }, (_, index) => `${initialClaim} number ${index}`);
  const { page, errors } = await contentHarness(t, { claims: initial });
  await scanInitialThousandClaims(page);
  const extra = Array.from({ length: 10 }, (_, index) => `${dynamicClaim} number ${index}`);
  await appendClaimBatch(page, extra);
  const expected = [...initial, ...extra];
  assert.deepEqual((await snapshot(page)).claims, expected);
  for (let index = 0; index < 3; index += 1) {
    const claim = `${dynamicClaim} appended after retention capacity ${index}`;
    await appendClaimBatch(page, [claim]);
    expected.push(claim);
    assert.deepEqual((await snapshot(page)).claims, expected,
      'old visible claims must not consume the capped scan or block a new appended claim');
  }
  const prepended = `${dynamicClaim} prepended after retention capacity`;
  const edited = `${dynamicClaim} edited after retention capacity`;
  await page.evaluate(({ prepended, edited }) => {
    document.querySelector('p').firstChild.data = `${edited}.`;
    const paragraph = document.createElement('p');
    paragraph.textContent = `${prepended}.`;
    document.body.prepend(paragraph);
  }, { prepended, edited });
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual((await snapshot(page)).claims, [...expected, prepended, edited]);
  assert.deepEqual(errors, []);
});

test('live claim markers follow current page content while historical retention stays capped', async t => {
  const initial = Array.from({ length: 1000 }, (_, index) => `${initialClaim} number ${index}`);
  const { page, errors } = await contentHarness(t, { startup: 'manual', claims: initial });
  await page.evaluate(() => { __fixture.overlay = new PopFactOverlay(); });
  await scanInitialThousandClaims(page);
  const extra = Array.from({ length: 10 }, (_, index) => `${dynamicClaim} number ${index}`);
  await appendClaimBatch(page, extra);
  const removeClaim = async claim => {
    await page.evaluate(text => {
      [...document.querySelectorAll('p')].find(paragraph => paragraph.textContent === `${text}.`).remove();
    }, claim);
    await page.evaluate(() => __fixture.tick(500));
  };
  // A removed, already evicted claim is eligible again when reintroduced.
  await removeClaim(initial[0]);
  await appendClaimBatch(page, [initial[0]]);
  assert.equal((await snapshot(page)).claims.filter(claim => claim === initial[0]).length, 2);
  // A retained-history hit must regain its live marker without a new dispatch.
  await removeClaim(initial[11]);
  await appendClaimBatch(page, [initial[11]]);
  const churn = Array.from({ length: 10 }, (_, index) => `${dynamicClaim} churn number ${index}`);
  await appendClaimBatch(page, churn);
  await appendClaimBatch(page, [`${dynamicClaim} after retained reinsertion`]);
  assert.equal((await snapshot(page)).claims.filter(claim => claim === initial[11]).length, 1,
    'reintroduced historical claim must remain known while present after history eviction');
  assert.deepEqual(await page.evaluate(() => ({
    live: __fixture.overlay.pageProcessedClaims.size,
    history: __fixture.overlay.processedClaims.size
  })), { live: 1021, history: 1000 });
  await page.evaluate(() => document.querySelectorAll('p').forEach(paragraph => paragraph.remove()));
  await page.evaluate(() => __fixture.tick(500));
  assert.deepEqual(await page.evaluate(() => ({
    live: __fixture.overlay.pageProcessedClaims.size,
    history: __fixture.overlay.processedClaims.size
  })), { live: 0, history: 1000 }, 'removed page claims must not accumulate in live markers');
  assert.deepEqual(errors, []);
});
