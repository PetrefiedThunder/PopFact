# Bugbot review rules — PopFact

PopFact is a Chrome Manifest V3 extension that reads page content and sends
claims to fact-checking providers. Review every PR against the four areas below.
Flag issues as blocking unless marked otherwise.

## 1. Security

- `content.js` runs on arbitrary web pages. Flag any `innerHTML`,
  `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or string
  `setTimeout` that touches page text or provider responses. Use
  `textContent` / DOM APIs instead.
- Flag `manifest.json` changes that widen `permissions`, `host_permissions`,
  `content_scripts.matches`, or `web_accessible_resources`, or that loosen
  `content_security_policy`. Each widening needs a stated reason in the PR.
- Messages between `content.js`, `popup.js`, and `background.js` must check
  the message `type` and sender. Flag handlers that act on unvalidated input.
- Provider calls must use HTTPS. Flag any `http://` endpoint.
- Flag logging of page content, user settings, or API responses that could
  contain personal data.

## 2. Secrets

- Block any API key, token, password, or private key in source, tests,
  fixtures, docs, or `manifest.json`. Extension code ships to users, so a
  key in the bundle is public.
- Block committed `.env*`, `*.pem`, `*.key`, `*.crx`, `config/secrets.json`,
  or any credentials file.
- Keys must come from user input in the popup and be stored in
  `chrome.storage`, never hardcoded defaults.

## 3. Tests

- Behavior changes in `background.js`, `content.js`, or `popup.js` need a
  test in `tests/` (`*.test.cjs` for logic, `*.spec.ts` for browser
  behavior). Flag PRs that change behavior without one.
- Flag tests that were weakened, skipped (`.skip`, `test.fixme`), or deleted
  to make CI pass.
- Note: the Playwright job in `.github/workflows/qa-tests.yml` uses
  `continue-on-error: true`, so a green check does not prove tests passed.
  Read the test output.

## 4. Real data only

- Block new synthetic, invented, or placeholder claims, sources, verdicts,
  or fixtures. Test inputs must be real, attributable content with the
  source recorded.
- Block code that shows mock or fabricated fact-check results to users as
  if they were real. Existing mocks (`performFactCheckMock`,
  `tests/utils/network-mocking.ts`) must not be extended.
- Flag confidence scores or verdicts that are hardcoded or inflated rather
  than taken from a provider response.
