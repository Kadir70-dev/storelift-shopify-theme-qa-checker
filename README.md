# StoreLift — Shopify Theme QA Checker (v0.3.0)

Standalone, offline-first Chrome Manifest V3 extension upgraded from the original v0.1.0 SEO Inspector. **No StoreLift server, AI, Shopify admin token, hosted database, or login.** Free core features; an optional paid **StoreLift Pro** licence (sold via Lemon Squeezy) unlocks the agency features. It never modifies storefronts, automates checkout, sends telemetry or runs background crawls. Independent tool, not affiliated with Shopify.

## Install (desktop Chrome)

1. Unzip the release ZIP.
2. Go to `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the `storelift-seo-inspector` folder containing `manifest.json`.
4. Open a public Shopify storefront, then click the extension.
5. **Scan current page** runs without extra permissions. **Audit open store tabs** asks for access to *that exact origin* before checking up to 12 already-open, fully-loaded tabs of the same origin. No navigation or website crawling.
6. Optional **Verify internal links (HEAD)** requests permission for that exact origin and checks up to 24 internal public product/collection/page/policy URLs. It excludes carts, checkout, account/admin, login, query strings and external hosts. HEAD requests omit cookies; 403, 405, redirects, timeout, rate limit = unverified; 404/410 = **potential** broken URL, verify via normal browser. Never GET/follow redirects automatically.
7. Review current-page findings, use manual handover checklist, then click **Agency report / PDF** and **Print / Save PDF**. Or export session JSON / issue CSV.

## Free and Pro

Chrome Web Store no longer sells extensions (its payments system shut down in 2021), so Pro is bought on an external Lemon Squeezy checkout and activated with a licence key on the extension's options page (popup → plan badge).

| Feature | Free | Pro |
|---|---|---|
| Scan current page: all checks, findings, evidence | ✓ | ✓ |
| Manual handover checklist, old snapshots and comparison | ✓ | ✓ |
| Pages per handover session | 3 | 20 |
| Audit open store tabs | — | ✓ |
| Verify internal links (HEAD) | — | ✓ |
| Agency report / Save PDF, client name and notes | — | ✓ |
| Export JSON / issues CSV | — | ✓ |

Limits live in one place: `PLANS` in `license.js`. Lower limits never delete existing pages; new pages just stop being added.

**Licensing (`license.js`):** activation, validation and deactivation call the public Lemon Squeezy License API (`api.lemonsqueezy.com/v1/licenses/*`; no API key, CORS-enabled, `credentials:'omit'`). Only the licence key, a random browser label and the activation ID are sent. A key is accepted only if its `store_id`/`product_id` match `license-config.js`. The licence is re-validated weekly; if the API is unreachable Pro keeps working for 30 days. Refunded/disabled/expired keys drop back to Free on the next check. The buyer's name/email are never stored.

**Seller settings (`license-config.js`):** `storeId`, `productIds`, `checkoutUrl`, `priceLabel`. While unset, the Pro page says "not on sale yet" and no network call is made. `python3 build_release.py --release` refuses to package until these and all `[OWNER: …]` placeholders in `docs/` are filled in.

Client-side gating can be patched by a determined user; the server check makes sharing or refunding keys ineffective, which is the realistic goal for a low-priced tool.

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

No accounts, background scripts, tracking, data exports to our server or cloud processing. The only outside request besides the optional HEAD checks is the StoreLift Pro licence check described above. Reports may include page URLs and user-entered client names/notes, stored locally on that user's Chrome profile. User can delete all stored audits in the extension. Uninstall also removes extension storage in standard Chrome behavior.

## Developer tests

Run `node tests/logic.test.cjs`, `node tests/license.test.cjs` (licence logic with a mocked API) and `python tests/browser_qa.py` (requires Playwright Python with compatible Chromium). Browser QA covers real DOM collection against local fixture pages; it does not claim tests on authenticated Shopify production shops.

## Chrome Web Store launch blockers

- Real-site Chrome verification across at least 3 distinct Shopify themes and a real mobile-sized viewport.
- Review Chrome Web Store privacy/permissions form; publish an accurate support contact and privacy policy URL approved by the owner.
- Genuine store screenshots and final store listing; paid licensing is implemented but needs the owner's Lemon Squeezy store, product, price and policy details (see `docs/CHROME_WEB_STORE_LISTING.md` → Paid launch).
- Final owner approval and Chrome Web Store review/approval. No timeline is guaranteed.
