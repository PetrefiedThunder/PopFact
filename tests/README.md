# PopFact test suite

Playwright and Node tests for the PopFact extension. They read this repository's own files and exercise a few settings paths. No test calls a live fact-checking API.

## Real-data-only policy

This suite is real-data-only. A test may use an unedited file from this repository, or a `chrome.*` environment shim that holds no dataset.

Synthetic, made-up, and edited inputs are not allowed:

- invented claims, articles, pages, or provider responses
- edited captures of real pages or real provider responses
- canned fact-check payloads, fake API keys, or invented provider names

This repository has no recorded page capture and no recorded provider response. A test that needs page text or a provider body waits for a real, unedited capture. Authored examples do not fill that gap.

Shims and probes that remain in the suite:

- `tests/popup-settings.test.cjs` and the help-link test in `tests/entrypoints.test.cjs` install a `chrome.*` stub so the real `popup.js` or `content.js` can run. The stub is not a dataset.
- `tests/popup-settings.test.cjs` saves confidence thresholds `0`, `50`, and `100`, and treats stored `null`, `''`, `'invalid'`, and `'12px'` as invalid. Those are the setting's boundaries.
- The same file sets `api-provider` to `mock`. That value is a provider implemented in `background.js`.
- `tests/smoke.spec.ts` loads an inline `<h1>Test</h1>` document so Playwright can render and take a screenshot. That document is not a fact-check input.
- `tests/extension-validation.spec.ts` has a test named "Mock fact-checking logic is implemented". It reads `background.js` and checks that the shipped `MockProvider` source still contains its current strings. It does not send a claim.

## Files

| Path | Runner | Role |
| --- | --- | --- |
| `tests/smoke.spec.ts` | Playwright | Default suite. Two infrastructure checks. |
| `tests/extension.spec.ts` | Playwright, opt-in | Manifest, popup file, and one headed extension launch. |
| `tests/extension-validation.spec.ts` | Playwright, opt-in | Static checks of extension source, CSS, popup, icons, and README. |
| `tests/entrypoints.test.cjs` | `node --test` | Settings-load race, ticker-speed CSS, help link. |
| `tests/popup-settings.test.cjs` | `node --test` | Popup settings round-trip against `popup.js` and `popup.html`. |
| `tests/manifest-icons.test.cjs` | `node --test` | Manifest icon paths exist and match the declared PNG pixel size. |
| `tests/fixtures/extension-fixtures.ts` | unused | Persistent-context launcher. No spec imports it. The file holds no dataset. |
| `tests/README.md` | — | This file. |
| `tests/RUNNING_TESTS.md` | — | Commands and CI. |

There is no `tests/utils/` directory. The only file under `tests/fixtures/` is `extension-fixtures.ts`.

## Playwright

`playwright.config.ts` sets `testDir` to `./tests`. `testMatch` is `**/smoke.spec.ts` unless `RUN_EXTENSION_TESTS` is set, in which case it is `**/*.spec.ts`. Playwright does not collect `*.cjs` files.

`npm test` and `npm run test:smoke` run `tests/smoke.spec.ts` (2 tests):

1. **TypeScript test files compile without errors.** The body is `expect(true).toBe(true)`. The test runs only after Playwright has loaded this file. It does not run `tsc`.
2. **Playwright configuration is valid.** Sets an inline `<h1>Test</h1>` document, checks the heading text, and takes a screenshot. It does not read `playwright.config.ts`.

`npm run test:all` sets `RUN_EXTENSION_TESTS=1` and runs every `*.spec.ts` (19 tests): the smoke file plus the two files below.

`tests/extension.spec.ts` (4 tests):

- **should load extension without errors.** Launches Chromium with `headless: false` and `--load-extension` set to the repo root. The assertion is `serviceWorkers.length >= 0` or a background page. A service-worker list of length 0 still passes.
- **should have correct manifest properties.** Reads `manifest.json` for manifest version 3, a name containing `PopFact`, version `1.0.0`, and the `content.js` / `overlay.css` content script.
- **should have popup.html file.**
- **should have valid popup structure.** Reads `popup.html` for `PopFact`, `Settings`, and `popup.js`.

`tests/extension-validation.spec.ts` (13 tests). Each test reads files from disk. None of them open a browser.

- **Extension files exist and are valid.** Requires `manifest.json`, `content.js`, `background.js`, `overlay.css`, and `popup.html`, then checks manifest version, name, and one content script.
- **Content scripts are syntactically correct.** Requires `PopFactOverlay`, `createOverlay`, and `extractClaimsFromPage` in `content.js`, and `performFactCheck` and `chrome.runtime.onMessage` in `background.js`. It does not parse the files.
- **CSS contains required styles.** Requires `#popfact-overlay`, `.popfact-brand`, `.popfact-ticker`, `#popfact-ticker-scroll`, `@keyframes scroll-ticker`, `.popfact-true`, `.popfact-false`.
- **Popup HTML is well-formed.** Requires `PopFact`, `Settings`, `popup.js`, `popup.css`, `<input`, and `checkbox`.
- **Mock fact-checking logic is implemented.** Requires `background.js` to contain `MockProvider`, `earth is round`, `flat earth`, `election`, `verdict`, and `confidence`.
- **Extension manifest has all required permissions.** Requires `activeTab`, `storage`, host permission `<all_urls>`, service worker `background.js`, and popup `popup.html`.
- **Icons exist in correct sizes.** Checks that `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png` exist and are larger than 100 bytes. Pixel dimensions are checked by `tests/manifest-icons.test.cjs`, not by this test.
- **Content script initializes properly.** Requires the `document.readyState === 'loading'` branch, `DOMContentLoaded`, and `new PopFactOverlay`.
- **Message passing architecture is correct.** Requires `FACT_CHECK_REQUEST` and `chrome.runtime.sendMessage` in `content.js`, `FACT_CHECK_REQUEST` and `chrome.tabs.sendMessage` in `background.js`, and `FACT_CHECK_RESULT` plus `chrome.runtime.onMessage` in `content.js`.
- **No obvious security vulnerabilities.** Requires that `content.js` and `background.js` do not contain `eval(`, and that `content.js` contains `textContent`.
- **Proper error handling exists.** Requires `.catch` in `background.js`.
- **Console logging for debugging.** Requires `console.log` in `content.js` and `background.js`.
- **README exists and contains key information.** Requires `PopFact`, `Installation`, and `chrome://extensions` in `README.md`.

`tests/fixtures/extension-fixtures.ts` exports a Playwright `test` that launches a persistent Chromium context (`headless: false`) with `--load-extension`. The extension path is the parent of that file, which is `tests/`, and the user-data directory is `tests/test-results/user-data`. No spec imports this module.

Other settings in `playwright.config.ts`: Chromium only, `fullyParallel: true`, two retries and one worker when `CI` is set, `forbidOnly` when `CI` is set, HTML and list reporters, trace on first retry, screenshot and video kept on failure.

## Node test runner

`npm run test:entrypoints` runs these files with `node --test --test-concurrency=1` (8 tests):

`tests/entrypoints.test.cjs` (3):

- **a threshold change during settings load overrides an older settings snapshot.** Runs the repo `content.js` in `vm` with a `chrome.storage` shim. A storage change to `100` during an in-flight read of `0` must win.
- **ticker speed classes keep medium at the existing 60s duration.** Reads `overlay.css` for `#popfact-ticker-scroll` durations: slow `120s`, medium `60s`, fast `30s`.
- **help action opens the homepage declared in the manifest.** Opens the repo `popup.html` in headless Chromium, stubs `chrome`, and aborts every request that is not `file:`. Clicking `#help-link` must request a tab for `manifest.homepage_url` (`https://github.com/PetrefiedThunder/PopFact`) and must not navigate the popup.

`POPFACT_SOURCE_ROOT` selects the checkout those three tests read. The default is the repo root. `POPFACT_CHROMIUM_PATH` selects the Chromium binary for the help-link test.

`tests/popup-settings.test.cjs` (4). Runs the repo `popup.js` in `vm` against a small DOM and a `chrome.storage` shim, and reads `popup.html` directly.

- **unsupported source controls are visibly unavailable.** `popup.html` matches `Source selection and credibility filters are unavailable` and does not contain ids `use-multi-source`, `trusted-sources-only`, or `min-source-credibility`.
- **confidence thresholds 0, 50, and 100 survive save and reopen.**
- **missing and invalid confidence thresholds fall back to 50.** Stored values: missing, `null`, `''`, `'invalid'`, `'12px'`.
- **remaining exposed settings survive save and reopen.** Requires these ids in `popup.html`: `enable-text`, `enable-audio`, `enable-video`, `ticker-speed`, `confidence-threshold`, `api-provider`, `api-key`, `save-settings`. The round-trip sets text and audio off, video on, ticker speed `fast`, and provider `mock`.

`tests/manifest-icons.test.cjs` (1):

- **every manifest icon path exists at the declared pixel size.** For each entry in `manifest.icons` and `manifest.action.default_icon`, the file exists, starts with a PNG signature, is larger than 100 bytes, and its header width and height equal the manifest key.

## Counts

| Command | Tests |
| --- | --- |
| `npm test` or `npm run test:smoke` | 2 |
| `npm run test:all` | 19 |
| `npm run test:entrypoints` | 8 |

`npm test` does not run the Node files. `npm run test:all` does not run the Node files. The two full commands together are 27 tests.

## Adding a test

1. Add it to an existing file in the table above, or add a new `*.spec.ts` or `*.cjs` under `tests/`.
2. Keep the input inside the real-data-only policy.
3. A new `*.spec.ts` is outside `npm test` until `RUN_EXTENSION_TESTS` is set. A new Node file is outside `npm run test:entrypoints` until the `test:entrypoints` script in `package.json` lists it.
4. Keep each test able to run on its own.
5. Update this file and `tests/RUNNING_TESTS.md` when the file list or the commands change.

## CI

`.github/workflows/qa-tests.yml` runs `npm test` after `npm install` and `npx playwright install --with-deps chromium`. That is the smoke file only. The step sets `continue-on-error: true`. The workflow does not run `npm run test:entrypoints` or `npm run test:all`.

Commands, headed mode, and report paths are in `tests/RUNNING_TESTS.md`.
