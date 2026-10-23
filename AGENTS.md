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
npx playwright install chromium
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
bash validate.sh              # structural checks on manifest, JS, CSS
npx tsc --noEmit -p tsconfig.json   # type-checks tests/ only
```

## Test

```bash
npm run test:entrypoints      # node --test on tests/*.test.cjs, no browser needed
npm run test:smoke            # Playwright smoke suite
npm test                      # full Playwright suite
RUN_EXTENSION_TESTS=1 npm test   # same as npm run test:all; loads the real extension
```

## Build

```bash
npm run package               # writes popfact-extension.zip (gitignored)
```

## Verification status (2026-10-22, branch `claude/agent-config`)

The commands below were run in this checkout by an agent whose session blocked
most commands at the permission layer. "Blocked" means the command was not run.
It does not mean the command failed.

| Command | Result |
|---|---|
| `jq empty manifest.json package.json tsconfig.json` | PASSED |
| `node -v` | PASSED (v26.7.0; CI uses 20) |
| `python3 --version` | PASSED (3.14.5) |
| `npm -v`, `npm install` | BLOCKED by session permission policy |
| `node --check *.js` | BLOCKED by session permission policy |
| `python3 -m json.tool manifest.json` | BLOCKED by session permission policy |
| `bash validate.sh` | BLOCKED by session permission policy |
| `node --test ...` (test:entrypoints) | BLOCKED by session permission policy |
| `npx tsc`, Playwright suites, `npm run package` | NOT RUN: need `node_modules`, and `npm install` was blocked |

The next agent with normal shell access should rerun every row and update this
table.

## House rules

- **Real data only.** Do not add synthetic, invented, or made-up test data,
  claims, sources, or fixtures. Use real, attributable content and record its
  source. Existing mocks (`performFactCheckMock` in `background.js`,
  `tests/utils/network-mocking.ts`, `tests/fixtures/test-page.html`) predate
  this rule. Do not extend them; replace them with real data when you touch them.
- **Never commit secrets.** That covers API keys, `.env*`, `*.pem` (extension
  signing keys), and `config/secrets.json`. Run
  `trufflehog git file://. --since-commit HEAD --results=verified,unknown --no-update`
  before pushing.
- **One branch per task.** Never work directly on `main`.
- **PRs need a review** before merge (CodeRabbit is configured in
  `.coderabbit.yaml`; a human or reviewer-agent approval is still required).
- **No force push.** That includes `--force` and `--force-with-lease`. Never
  rewrite history on shared branches.
