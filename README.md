# StoreLift — Shopify Theme QA Checker (v0.2.0)

Standalone, offline-first Chrome Manifest V3 extension upgraded from the original v0.1.0 SEO Inspector. **No VPS, backend, AI, API keys, Shopify admin token, hosted database, or login.** It never modifies storefronts, automates checkout, sends telemetry or runs background crawls. Independent tool, not affiliated with Shopify.

## Install (desktop Chrome)

1. Unzip the release ZIP.
2. Go to `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the `storelift-seo-inspector` folder containing `manifest.json`.
4. Open a public Shopify storefront, then click the extension.
5. **Scan current page** runs without extra permissions. **Audit open store tabs** asks for access to *that exact origin* before checking up to 12 already-open, fully-loaded tabs of the same origin. No navigation or website crawling.
6. Optional **Verify internal links (HEAD)** requests permission for that exact origin and checks up to 24 internal public product/collection/page/policy URLs. It excludes carts, checkout, account/admin, login, query strings and external hosts. HEAD requests omit cookies; 403, 405, redirects, timeout, rate limit = unverified; 404/410 = **potential** broken URL, verify via normal browser. Never GET/follow redirects automatically.
7. Review current-page findings, use manual handover checklist, then click **Agency report / PDF** and **Print / Save PDF**. Or export session JSON / issue CSV.

## Checks

- Title, description, canonical, robots, H1 count, image alt attribute and product JSON-LD, cart-control indicators.
- Already-loaded image failures (`complete && naturalWidth===0`), excluding deferred lazy-load as broken.
- Empty or `#` anchor tags; some deliberately implement buttons, so results require review.
- Likely placeholder/demo phrases: always flagged for **human review**, not automatic production failures.
- Actual current viewport width and horizontal overflow, with examples; only calls it mobile-sized when the browser viewport is <=600px. It does **not** emulate different devices.
- Optional same-origin internal HEAD checks with false-positive caveats.
- Multi-page session dashboard (up to 20 distinct page URLs/session, 24 sessions) and manual checklist (cart, checkout test, policies, forms, mobile, keyboard, PageSpeed separately).
- Printable client handover report with local client label, notes, findings, per-page evidence and checklist; spreadsheet-safe CSV export.
- Original v0.1 old-style snapshots and same-host comparison preserved in `storeliftReports`. New sessions use `storeliftSessions`. Both in `chrome.storage.local`, user deletion supported.

## Accuracy & limitations

The score is a **local DOM quality heuristic**, NOT a Google Search ranking, Lighthouse result, actual conversion metric, revenue estimate, WCAG certificate, true broken-link crawler or exhaustive mobile test. JavaScript-rendered, shadow DOM and off-screen lazy content may be missed. 404/410 from HEAD do not prove browser GET is broken. Review all findings before client delivery. Shopify signals are heuristic and not proof of ownership. Checkout and mobile flows are always manual.

## Privacy & permissions

Required: `activeTab` (user click gives current-tab access), `scripting` (read the open tab DOM after click), `storage` (saved audit sessions). Optional host permissions: HTTP/HTTPS origins (pattern declaration supports user-approved **specific store origins only**); not granted until user selects open-tab audit or link HEAD verification and approves a Chrome origin permission prompt. Requests are limited to same-site HEAD checks when explicitly requested, with `credentials:'omit'`.

No accounts, background scripts, tracking, data exports to our server or cloud processing. Reports may include page URLs and user-entered client names/notes, stored locally on that user's Chrome profile. User can delete all stored audits in the extension. Uninstall also removes extension storage in standard Chrome behavior.

## Developer tests

Run `node tests/logic.test.cjs` and `python tests/browser_qa.py` (requires Playwright Python with compatible Chromium). Browser QA covers real DOM collection against local fixture pages; it does not claim tests on authenticated Shopify production shops.

## Chrome Web Store launch blockers

- Real-site Chrome verification across at least 3 distinct Shopify themes and a real mobile-sized viewport.
- Review Chrome Web Store privacy/permissions form; publish an accurate support contact and privacy policy URL approved by the owner.
- Genuine store screenshots and final store listing; optional paid licensing is *not implemented* and needs a separately verified provider/workflow.
- Final owner approval and Chrome Web Store review/approval. No timeline is guaranteed.
