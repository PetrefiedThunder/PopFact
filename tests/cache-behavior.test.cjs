const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Regression tests for SEL-203 (PF-006, PF-007): cache identity must account
// for the active provider and result-affecting settings, cached metadata must
// preserve the producing provider, and transient ERROR results must not be
// cached. Pure node:test + vm; no browser or live provider calls.

const root = path.resolve(__dirname, '..');
const workerSource = readFileSync(path.join(root, 'background.js'), 'utf8');

function serviceHarness() {
  const timeouts = [];
  const results = [];
  const local = {};
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    setInterval() {},
    setTimeout(callback) { timeouts.push(callback); },
    fetch: async () => { throw new Error('no live fetch in cache tests'); },
    chrome: {
      runtime: { onMessage: { addListener() {} } },
      storage: {
        sync: { get(defaults, callback) { callback(defaults); } },
        local: {
          get(defaults, callback) { callback({ ...defaults, ...local }); },
          set(values) { Object.assign(local, values); }
        },
        onChanged: { addListener() {} }
      },
      tabs: { async sendMessage(tabId, message) { results.push({ tabId, message }); } }
    }
  });
  // Same-script scoping exposes the service classes; grab a dedicated instance.
  vm.runInContext(`${workerSource}\n;globalThis.__svc = new FactCheckService();`, context, { filename: 'background.js' });
  return { svc: context.__svc, timeouts, results };
}

async function flush() {
  for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
}

async function drain(harness) {
  for (let i = 0; i < 10; i++) {
    await flush();
    if (harness.timeouts.length === 0) break;
    const pending = harness.timeouts.splice(0);
    for (const callback of pending) callback();
  }
  await flush();
}

function request(claim) {
  return {
    claim, source: 'text',
    url: 'https://popfact.invalid/fixture', timestamp: Date.now()
  };
}

test('switching providers invokes the new provider and returns its result', async () => {
  const harness = serviceHarness();
  const { svc } = harness;
  const claim = 'The synthetic sky is blue over the observatory every clear winter night';

  let mockCalls = 0;
  const mockCheck = svc.providers.mock.check.bind(svc.providers.mock);
  svc.providers.mock.check = async (...args) => { mockCalls += 1; return mockCheck(...args); };

  let altCalls = 0;
  svc.providers['alt-synth'] = {
    async check() {
      altCalls += 1;
      return { verdict: 'FALSE', explanation: 'alt says false', confidence: 0.9, sources: [] };
    }
  };

  svc.settings.apiProvider = 'mock';
  await svc.handleFactCheckRequest(request(claim), 7);
  await drain(harness);
  assert.equal(harness.results.length, 1);
  assert.equal(harness.results[0].message.data.verdict, 'TRUE');
  assert.equal(harness.results[0].message.data.provider, 'mock');

  svc.settings.apiProvider = 'alt-synth';
  await svc.handleFactCheckRequest(request(claim), 7);
  await drain(harness);
  assert.equal(altCalls, 1, 'provider change must invoke the new provider');
  assert.equal(harness.results[1].message.data.verdict, 'FALSE');
  assert.equal(harness.results[1].message.data.provider, 'alt-synth');

  // Switching back serves the original provider's own cached result.
  svc.settings.apiProvider = 'mock';
  await svc.handleFactCheckRequest(request(claim), 7);
  await drain(harness);
  assert.equal(mockCalls, 1, 'same provider and claim must still hit the cache');
  assert.equal(harness.results[2].message.data.verdict, 'TRUE');
  assert.equal(harness.results[2].message.data.provider, 'mock');
});

test('transient provider errors are not cached and retry succeeds after recovery', async () => {
  const harness = serviceHarness();
  const { svc } = harness;
  const claim = 'The synthetic laboratory records twenty water samples during every spring season';

  let calls = 0;
  svc.providers.flaky = {
    async check() {
      calls += 1;
      if (calls === 1) throw new Error('synthetic outage');
      return { verdict: 'TRUE', explanation: 'recovered', confidence: 0.9, sources: [] };
    }
  };
  svc.settings.apiProvider = 'flaky';

  await svc.handleFactCheckRequest(request(claim), 7);
  await drain(harness);
  await svc.handleFactCheckRequest(request(claim), 7);
  await drain(harness);

  assert.equal(calls, 2, 'retry after a transient failure must invoke the provider again');
  assert.deepEqual(
    harness.results.map(result => result.message.data.verdict),
    ['ERROR', 'TRUE']
  );
});
