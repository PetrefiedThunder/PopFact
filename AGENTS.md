# AGENTS.md — PopFact

PopFact is a Chrome Manifest V3 browser extension (plain JavaScript, no bundler).
Entry points: `manifest.json`, `background.js` (service worker), `content.js`,
`popup.html` / `popup.js`. Tests: Node built-in runner (`tests/*.test.cjs`) and
Playwright (`tests/*.spec.ts`). There is no Python code in this repo; the only
Python use is `python3 -m json.tool` inside `validate.sh`.

The checkout lives on a path containing a space (`/Volumes/Extreme SSD/...`).
Always quote paths. Invoke Python tools as `python3 -m <tool>` rather than via
script shebangs, which break on paths with spaces.

## Setup

```bash
node -v                       # CI uses Node 20 (.github/workflows/qa-tests.yml)
npm install                   # package-lock.json is gitignored, so installs are not pinned
npx playwright install chromium               # macOS
npx playwright install --with-deps chromium   # Linux: also installs required OS
                                              # packages (matches CI); without it
                                              # Chromium may fail to launch
```

Do not read, print, or commit `.env*` files. No `.env` is required for the
tests below.

## Lint

Mirrors the `lint` job in `.github/workflows/qa-tests.yml`:

```bash
node --check background.js
node --check content.js
node --check popup.js
jq empty manifest.json package.json tsconfig.json
python3 -m json.tool manifest.json > /dev/null
bash validate.sh              # structural checks on manifest, JS, CSS; currently
                              # exits 1 (stale: expects the removed
                              # performFactCheckMock and old @keyframes name)
npx tsc --noEmit -p tsconfig.json   # type-checks tests/ only (tsconfig include:
                              # tests/**/*); needs node_modules; currently exits 2
                              # with 34 pre-existing errors; CI does not run tsc
```

## Test

```bash
npm run test:entrypoints      # node --test on the 4 tests/*.test.cjs files; needs
                              # node_modules and Chromium (entrypoints.test.cjs
                              # launches a headless browser via playwright)
npm run test:smoke            # Playwright smoke suite (playwright test smoke.spec.ts)
npm test                      # full Playwright suite (playwright test)
RUN_EXTENSION_TESTS=1 npm test   # same as npm run test:all; loads the real extension
```

## Build

```bash
npm run package               # writes popfact-extension.zip (gitignored)
```

## Verification status (2026-10-22, branch `claude/agent-config`)

Run in this checkout on macOS with Node v26.7.0 (CI uses Node 20).

| Command | Result |
|---|---|
| `jq empty manifest.json package.json tsconfig.json` | PASSED |
| `node --check background.js content.js popup.js` | PASSED |
| `python3 -m json.tool manifest.json` | PASSED |
| `bash validate.sh` | FAILED (exit 1; 1 error, 1 warning): still expects the removed `performFactCheckMock` in `background.js` (now the `MockProvider` class) and the old `@keyframes popfact-scroll` name (now `scroll-ticker` in `overlay.css`). `validate.sh` is stale, not the extension. |
| `npm install` | PASSED |
| `npx tsc --noEmit -p tsconfig.json` | FAILED (exit 2; 34 errors): missing `chrome` types in `tests/utils/network-mocking.ts` and TS5097 `.ts` import extensions in `tests/anti-fragility.spec.ts`. Pre-existing; CI does not run tsc. |
| `npx playwright install chromium` | PASSED |
| `npm run test:entrypoints` | PASSED (31 pass, 0 fail) |
| `npm run test:smoke` | PASSED (6) |
| `npm test` | PASSED (6; extension tests are gated on `RUN_EXTENSION_TESTS`) |
| `npm run test:all` | NOT RUN: loads the unpacked extension, needs a headed Chromium |
| `npm run package` | PASSED (zip is gitignored) |

Command cross-check against `package.json` and `.github/workflows/qa-tests.yml`
(all verified by reading, not execution): `test:entrypoints` runs `node --test`
on exactly the 4 `tests/*.test.cjs` files; `test:smoke` is
`playwright test smoke.spec.ts`; `test` is `playwright test`; `test:all` is
`RUN_EXTENSION_TESTS=1 playwright test`; CI's lint job runs `node -c` over root
`*.js` and `jq empty` over root `*.json` (the same files listed above); CI
installs Playwright with `--with-deps chromium` on ubuntu-latest.

## House rules

- **Real data only.** Do not add synthetic, invented, or made-up test data,
  claims, sources, or fixtures. Use real, attributable content and record its
  source. Existing mocks (the `MockProvider` class in `background.js`,
  `tests/utils/network-mocking.ts`, `tests/fixtures/test-page.html`) predate
  this rule. Do not extend them; replace them with real data when you touch them.
- **Never commit secrets.** That covers API keys, `.env*`, `*.pem` (extension
  signing keys), and `config/secrets.json`. Scan with trufflehog and make it
  fail the run on a hit (`--fail`):
  - Pre-commit (staged work, not yet committed):
    `trufflehog git file://. --since-commit HEAD --results=verified,unknown --fail --no-update`
  - Pre-push (outgoing commits): at push time `HEAD` already contains the new
    commits, so `--since-commit HEAD` scans nothing. Use the real push base:
    `trufflehog git file://. --since-commit origin/main --branch HEAD --results=verified,unknown --fail --no-update`
- **One branch per task.** Never work directly on `main`.
- **PRs need a review** before merge (CodeRabbit is configured in
  `.coderabbit.yaml`; a human or reviewer-agent approval is still required).
- **No force push.** That includes `--force` and `--force-with-lease`. Never
  rewrite history on shared branches.
