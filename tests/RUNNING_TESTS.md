# Running PopFact tests

## Policy

Real data only. A test may read an unedited file from this repository, or use a `chrome.*` shim that holds no dataset. Synthetic, made-up, and edited inputs are not allowed: invented claims or articles, canned fact-check responses, fake API keys, invented provider names, and edited captures. The file list and the per-test behavior are in `tests/README.md`.

## Install

```bash
npm install
npx playwright install chromium
```

The help-link test in `tests/entrypoints.test.cjs` launches Playwright's Chromium. The same browser install covers it.

## Commands

`playwright.config.ts` collects `tests/smoke.spec.ts` only, unless `RUN_EXTENSION_TESTS` is set. Node tests are a separate script. `npm test` does not run them.

```bash
# Smoke only: tests/smoke.spec.ts (2 tests)
npm test
npm run test:smoke

# Every *.spec.ts (19 tests)
npm run test:all

# Node tests (8 tests)
npm run test:entrypoints

# Smoke file, other Playwright modes. These do not set RUN_EXTENSION_TESTS.
npm run test:headed
npm run test:ui
npm run test:debug

# Open the last Playwright HTML report
npm run test:report
```

One Playwright file:

```bash
npx playwright test tests/smoke.spec.ts
RUN_EXTENSION_TESTS=1 npx playwright test tests/extension-validation.spec.ts
RUN_EXTENSION_TESTS=1 npx playwright test tests/extension.spec.ts
```

Without `RUN_EXTENSION_TESTS`, asking Playwright for `tests/extension.spec.ts` or `tests/extension-validation.spec.ts` matches nothing, because `testMatch` is still `**/smoke.spec.ts`.

`npm run test:headed`, `npm run test:ui`, and `npm run test:debug` match the smoke file only. To use those modes on the opt-in specs:

```bash
RUN_EXTENSION_TESTS=1 npx playwright test --headed
RUN_EXTENSION_TESTS=1 npx playwright test --ui
RUN_EXTENSION_TESTS=1 npx playwright test --debug
```

A name filter still applies on top of `testMatch`:

```bash
npx playwright test -g "Playwright configuration is valid"
```

## What each command runs

### `npm test` and `npm run test:smoke`

`tests/smoke.spec.ts`:

- TypeScript test files compile without errors. Body asserts `true` after Playwright loads the file. It does not run `tsc`.
- Playwright configuration is valid. Sets an inline `<h1>Test</h1>` document, checks the text, and takes a screenshot.

### `npm run test:all`

Sets `RUN_EXTENSION_TESTS=1`. Runs the smoke file plus:

`tests/extension.spec.ts` (4 tests). Three tests read `manifest.json` or `popup.html`. **should load extension without errors** launches Chromium with `headless: false` and `--load-extension` pointed at the repo root. That test needs a display. Its assertion passes when the service-worker list is empty.

`tests/extension-validation.spec.ts` (13 tests). All are disk reads of repo files: manifest, scripts, CSS, popup, three icon files, and `README.md`. One test checks that `background.js` still contains the shipped `MockProvider` strings. It does not mock a response.

`tests/fixtures/extension-fixtures.ts` is not imported by any spec. `npm run test:all` does not load it.

### `npm run test:entrypoints`

The `package.json` script is:

```bash
node --test --test-concurrency=1 \
  tests/entrypoints.test.cjs \
  tests/popup-settings.test.cjs \
  tests/manifest-icons.test.cjs
```

- `tests/entrypoints.test.cjs` (3). Settings-load race in `content.js`, `overlay.css` durations (slow `120s`, medium `60s`, fast `30s`), and the popup help control. The help test opens `popup.html` on `file:`, aborts every other request, and expects a tab for `manifest.homepage_url`. It does not contact GitHub. `POPFACT_SOURCE_ROOT` selects the checkout (default: repo root). `POPFACT_CHROMIUM_PATH` selects the browser binary.
- `tests/popup-settings.test.cjs` (4). Runs `popup.js` in `vm` against `popup.html`. Requires the text `Source selection and credibility filters are unavailable`, and requires that `popup.html` has no `use-multi-source`, `trusted-sources-only`, or `min-source-credibility` id. Also covers thresholds `0` / `50` / `100`, fallback to `50` for missing and invalid stored values, and the save/reopen path for the other exposed settings (including provider `mock`).
- `tests/manifest-icons.test.cjs` (1). Every path in `manifest.icons` and `action.default_icon` is a PNG whose header width and height equal the manifest key.

## CI

`.github/workflows/qa-tests.yml` runs on push to `main`, `develop`, and `copilot/**`, on pull requests into `main` and `develop`, and on `workflow_dispatch`.

The test job:

- `ubuntu-latest`, Node 20
- `npm install`
- `npx playwright install --with-deps chromium`
- `npm test` with `continue-on-error: true` (smoke file only)
- uploads `playwright-report/` and `test-results/` (30-day retention)

The workflow does not run `npm run test:entrypoints` or `npm run test:all`.

A second job syntax-checks root `*.js` with `node -c` and root `*.json` with `jq empty`.

## Reports

Playwright writes `playwright-report/` and `test-results/`. `playwright.config.ts` keeps a trace on the first retry, and a screenshot and video on failure. Open the report with `npm run test:report`.

When `CI` is set, retries are 2 and workers are 1. Locally, retries are 0 and workers stay at the Playwright default. `forbidOnly` is on when `CI` is set.

If Chromium fails to start:

```bash
npm list @playwright/test
npx playwright --version
npx playwright install chromium
```

Two Playwright tests open a browser. **should load extension without errors** in `tests/extension.spec.ts` sets `headless: false` and needs a display. **Playwright configuration is valid** in `tests/smoke.spec.ts` uses the `page` fixture, which launches Chromium headless unless `--headed` is passed. The other 17 Playwright tests do not open a browser: 16 read repository files, and the compile smoke test only asserts `true`. The Node help-link test launches headless Chromium and sends non-file traffic to a closed proxy (`127.0.0.1:9`) before aborting it.

## Coverage this suite leaves out

No test calls a live fact-checking API. No test supplies fact-check page text or a provider payload. The inline `<h1>Test</h1>` document in the smoke test is only a browser probe. Cache identity, content-script scanning, and ticker rendering of fact-check results have no test here. Adding that coverage requires a real, unedited capture, under the policy in `tests/README.md`.
