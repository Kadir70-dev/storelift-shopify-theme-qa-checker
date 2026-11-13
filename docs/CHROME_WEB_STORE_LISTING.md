# Chrome Web Store — StoreLift Theme QA Checker listing draft

**Owner approval required before submission.**

---

## Store listing

### Name (≤ 45 chars)
```
StoreLift — Shopify Theme QA Checker
```

### Short description (≤ 132 chars)
```
Shopify storefront QA: check pages, build a client handover report. Free core; Pro licence unlocks agency features.
```

### Detailed description (≤ 16,383 chars)

```
StoreLift — Shopify Theme QA Checker is a standalone browser-only quality-control tool for Shopify theme developers and digital agencies. No StoreLift server, AI, Shopify admin token, or login required.

FREE AND PRO
StoreLift is free to install and use. The free plan includes every page check, findings with evidence, the manual handover checklist and up to 3 pages per handover session.

StoreLift Pro is an optional paid licence, bought outside the Chrome Web Store on a Lemon Squeezy checkout (one-time payment of US$29, lifetime licence, up to 3 browsers). Pro unlocks: Audit open store tabs, Verify internal links, the agency handover report with Save as PDF, JSON/CSV export and 20 pages per session. These features are marked "PRO" in the extension and open the plan page instead of running on the free plan.

HOW IT WORKS
Open a public Shopify storefront in Chrome, then click the extension. Everything runs locally in your browser.

• Scan current page — reads the visible DOM (title, meta description, canonical, H1, images, links, structured data, viewport) and returns a scored findings list with specific evidence and improvement suggestions.

• Audit open store tabs — with your explicit permission for that exact origin, checks up to 12 already-open, fully-loaded tabs of the same store. No new navigation, no background crawling.

• Verify internal links (HEAD) — optionally sends HEAD requests to up to 24 same-origin product, collection, page and policy URLs to flag potential 404s. Results include caveats: 403/405/timeout = unverified, never automatic broken-link confirmation. Never follows redirects or accesses cart/checkout/account.

• Agency handover report — printable client handover PDF with client name, notes, per-page findings, evidence and a manual QA checklist. Export as JSON or spreadsheet-safe CSV.

• Session history — stores up to 24 audit sessions and 20 pages per session, all locally in Chrome storage. User can delete all data at any time.

WHAT IT CHECKS
✓ Page title and meta description presence and length
✓ Canonical tag presence, same-host verification
✓ Robots noindex detection
✓ H1 heading count
✓ Images loaded but broken (naturalWidth=0)
✓ Images missing alt attribute
✓ Empty or non-navigating anchor tags
✓ Possible placeholder/demo text (Lorem ipsum, etc.)
✓ Horizontal layout overflow at current viewport width
✓ Product JSON-LD structured data presence
✓ Add-to-cart control detection
✓ Shipping and returns link presence
✓ Optional same-origin HEAD link verification

WHAT IT CANNOT DO
The local heuristic score is NOT a Google Search ranking, Lighthouse score, Core Web Vitals result, revenue metric, WCAG accessibility certificate or guaranteed broken-link crawler. JavaScript-rendered, shadow DOM and lazy-loaded content may be missed. Always manually verify findings before client delivery.

PERMISSIONS
• activeTab — gives access to the tab you clicked the extension on
• scripting — reads the already-loaded DOM of that tab (read-only)
• storage — saves audit sessions locally in your browser
• Optional https://* origin — only requested when you choose "Audit open store tabs" or "Verify internal links"; grants access to that specific store origin only

No background scripts. No cross-origin data collection. No tracking or telemetry. Reports stay on your device. If you activate Pro, only your licence key is sent to Lemon Squeezy to confirm it (about weekly).

INDEPENDENT TOOL. NOT AFFILIATED WITH SHOPIFY.
```

---

## Screenshots (1280×800, desktop — REQUIRED)

Capture these in desktop Chrome with the extension loaded unpacked:

1. **Extension popup — scan results** — healthy product page showing score, 0 findings
2. **Extension popup — findings list** — page with several issues flagged with evidence and severity
3. **Session dashboard** — multi-page session with checklist items
4. **Agency report page** — printable report with client name and findings
5. **Mobile-sized viewport** — extension showing "375px · mobile-sized" in the viewport metric

**Instructions:**
1. `chrome://extensions` → Load unpacked → select `dist/storelift-theme-qa-checker-v0.2.0/` (unzipped)
2. Open a live Shopify storefront or use a local server serving fixtures/product-page.html
3. Click the extension, run a scan, take screenshots at exactly 1280×800
4. File naming: `screenshot-01-results.png`, `screenshot-02-findings.png`, etc.

---

## Promotional tile

- 440×280 small promo tile: required for store listing
- 1400×560 marquee: optional
- Use brand colors: #1A1A2E (dark navy), #0077B5 or #2563EB (blue), white text

---

## Category

**Developer Tools**

## Language

English

---

## Privacy tab — single purpose and permission justifications

**Single purpose:** Run user-initiated, read-only quality checks on the Shopify storefront page(s) the user has open and produce a local handover report.

| Permission | Justification |
|---|---|
| `activeTab` | Reads the storefront tab only after the user clicks the extension and presses "Scan current page". |
| `scripting` | Injects the bundled `collector.js` into that tab to read the already-loaded DOM (images, links, headings, meta). Nothing is modified. |
| `storage` | Saves audit sessions, checklist choices and notes locally (`chrome.storage.local`) so the user can build and reopen a handover report. |
| Optional host permissions (`https://*/*`, `http://*/*`) | Requested at runtime for one store origin only, when the user chooses "Audit open store tabs" (to read other already-open tabs of the same store) or "Verify internal links" (HEAD requests to that store's own URLs). Never requested at install. |

**Remote code:** No. All JavaScript is packaged in the extension; no eval, no remotely hosted scripts.

## Privacy practices questionnaire (answer honestly)

| Question | Answer | Notes |
|---|---|---|
| Data categories to tick | **Authentication information** (licence key) | Only when the user activates Pro. Nothing else: no PII, web history, website content or user activity is sent. Payment details are entered on Lemon Squeezy's checkout page, not in the extension. |
| Purpose of that data | Core functionality (licence verification) | Sent to api.lemonsqueezy.com on activate/check/deactivate and weekly while Pro is active |
| Does the extension collect user data? | Only the licence key above | Audit data never leaves the browser |
| Does it transmit personal data? | No | — |
| Does it use the data for purposes other than the core function? | No | — |
| Is data encrypted in transit? | N/A | No data transmitted |
| Does it sell data to third parties? | No | — |
| Does it use the data for personalisation or advertising? | No | — |

---

## Support URL

```
https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/support.html
```

(GitHub Issues also acceptable: https://github.com/Kadir70-dev/storelift-shopify-theme-qa-checker/issues)

---

## Privacy policy URL

```
https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html
```

Hosted via GitHub Pages from `docs/privacy.html` on the main branch.
*(Allow 1–5 minutes after first deploy for GitHub Pages to go live.)*

---

## CI / Test evidence (automated — verified 2026-11-09)

| Test suite | Result | Environment |
|---|---|---|
| Node.js unit tests | 77/77 PASS | local + ubuntu-latest CI |
| ZIP packaging regression | 21/21 PASS | local + ubuntu-latest CI |
| Chromium fixture tests (Playwright) | 19/19 PASS | ubuntu-latest CI (real Chromium, NOT skipped) |
| Broken-image detection (404 routing) | PASS | ubuntu-latest CI |
| Security: no external requests from collector | PASS | ubuntu-latest CI |
| All 14 ZIP files byte-identical between CI artifact and local build | PASS | verified |

CI run: https://github.com/Kadir70-dev/storelift-shopify-theme-qa-checker/actions/runs/42703662483
Commit SHA: `9f94bed` (PR #3, merged as `ad68778`)

## Live-store test evidence (installed extension — 2026-11-10)

Release ZIP `storelift-theme-qa-checker-v0.2.0.zip` (SHA-256 `2bcf3bd2b7cd60e2a1812e1af9949f2c39f7b2997688fd6b2131ff9c9a3b7bae`) unpacked and loaded in Chromium 156 (headless). Toolbar clicks were simulated with the DevTools `Extensions.triggerAction` command, which grants `activeTab` like a real click; the popup's own "Scan current page" button ran the scan.

| Check | Store | Result |
|---|---|---|
| Scan current page | www.allbirds.com (home) | Shopify detected, score 92, 2 findings (lazy images, empty policy links) |
| Scan current page | www.gymshark.com (home) | Shopify detected, score 92, 2 findings (missing alt 44/233, lazy images) |
| Handover report page | both | Rendered with live data |
| Report → PDF | allbirds | Printed via Chromium's print-to-PDF (same engine as "Save as PDF") |
| Audit open store tabs — no access yet | allbirds | Popup no longer requests permission itself (Chrome closes the popup when the prompt opens, which dropped the request). It opens `permission.html` for `https://www.allbirds.com`; the user grants access there, then presses the button again. Verified that the page opens with the right store. |
| Audit open store tabs — access granted | allbirds (3 open tabs) | "3 open tabs audited; 0 skipped" (/, /collections/mens, /pages/our-story). Tested with a test-only copy whose manifest pre-grants allbirds access. |
| Chrome's own permission prompt on `permission.html` | — | **Not automatable** (browser UI). Confirm once by hand in desktop Chrome: Allow → reopen StoreLift → Audit open store tabs. |

Multi-tab permission flow fixed in PR #5 (`permission.html`/`permission.js`; same flow for "Verify internal links").

Bugs found by this run and fixed in PR #3: a hidden Bing UET beacon was reported as a HIGH broken image (Gymshark score 78 → 92 after fix), and long evidence URLs widened the popup to 743 px.

---

## Paid launch (v0.3.0)

Chrome Web Store payments (paid items, in-app purchases, free trials) were shut down: no new paid items since 2020 and no charging through CWS since 1 Feb 2021. Monetisation through an outside payment provider is allowed, but the listing must disclose the paywall (done in the description above). Licensing is implemented with Lemon Squeezy (merchant of record: it handles VAT/sales tax and invoices, and its License API needs no StoreLift server).

### Pricing options (owner decides — nothing is set in code)

| Option | Example | Pros | Cons |
|---|---|---|---|
| A. One-time "Lifetime" | $29, 3 browsers | Simplest to sell to freelancers; no renewals or cancellations to handle; matches a small local tool | No recurring revenue |
| B. Yearly subscription | $39/year, 3 browsers | Recurring revenue; funds updates | Harder sell for a small tool; renewals/cancel flows |
| C. Agency licence (add-on to A or B) | $79–99, 10 browsers | Agencies pay more for seats | One more product to manage |

Recommendation: start with **A** (plus **C** if agencies ask), because the tool has no server cost and the audience is freelancers and small agencies. Revisit B when there is a steady release cadence. Lemon Squeezy fees are about 5% + $0.50 per order, plus extra for some international/PayPal payments; confirm current fees when you sign up.

### What the owner must provide

1. **Plan and price:** option A/B/C, price, currency and browser activation limit.
2. **Lemon Squeezy account:** sign up, complete identity verification and store activation review, and add a payout method (bank or PayPal; check that your country is supported).
3. **Product:** create "StoreLift Pro" with *license keys enabled* and the activation limit above (for B, keys expire with the subscription). Then send: **store ID**, **product ID(s)**, **checkout (Buy) link**.
4. **Seller details for the policies:** legal name, business address/country, support email, governing-law jurisdiction, refund window (recommendation: 14 days, no questions asked).
5. **Approval** of the final listing text, and the go-ahead for the visibility change (currently *Published – unlisted*).

### Steps once those are in

1. Fill `license-config.js` (`storeId`, `productIds`, `checkoutUrl`, `priceLabel`) and the `[OWNER: …]` placeholders in `docs/privacy.html`, `terms.html`, `refund.html`, `support.html`, and in the description above.
2. `python3 build_release.py --release && python3 build_release.py --test`; this refuses to build while anything is missing.
3. Make one real purchase in Lemon Squeezy test mode. Activate the key in the extension, refund it, and confirm Pro turns off on "Check again".
4. Merge to `main` (publishes the policy pages on GitHub Pages).
5. CWS dashboard: upload the v0.3.0 ZIP, update the description and the Privacy tab (data category above, privacy URL), add terms/refund links to the description, and submit for review. **Do not change the visibility until the owner approves.**

## Submission checklist

- [x] GitHub Pages privacy policy live: https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html
- [x] GitHub Pages support page live: https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/support.html
- [x] CI green on ubuntu-latest with real Chromium (PR #1 merged, run 42676274957)
- [x] Extension ZIP built and verified: `dist/storelift-theme-qa-checker-v0.2.0.zip` (24.7 KB)
- [ ] Real 1280×800 screenshots captured on desktop Chrome (see screenshot instructions above) — **owner action required**
- [ ] Chrome Web Store developer account created ($5 one-time fee) — **owner action required**
- [ ] Final owner review and approval of listing text — **owner action required**
- [ ] Submit for Chrome review (typically 1–3 business days) — **owner action required**

---

## CWS Submission — step-by-step instructions

**Prerequisites already complete:**
- ZIP at `dist/storelift-theme-qa-checker-v0.2.0.zip` (24.7 KB, 14 files, all tests passing)
- Privacy policy URL: `https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html`
- Support URL: `https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/support.html`

**Steps (owner must complete):**

1. **Register** at https://chrome.google.com/webstore/devconsole — pay $5 one-time developer fee
2. Click **New Item** → drag and drop `dist/storelift-theme-qa-checker-v0.2.0.zip`
3. **Store listing tab:**
   - Name: `StoreLift — Shopify Theme QA Checker`
   - Short description: paste from `CHROME_WEB_STORE_LISTING.md`
   - Detailed description: paste from `CHROME_WEB_STORE_LISTING.md`
   - Category: **Developer Tools**
   - Language: English
   - Upload screenshots (5 × 1280×800, see instructions in this doc)
4. **Privacy practices tab:**
   - Privacy policy URL: `https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html`
   - Answer all questions as documented in the Privacy practices table above
5. **Store listing tab → Support URL:**
   - `https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/support.html`
6. Click **Submit for Review**

**What cannot be verified without a desktop:**
- Live Shopify storefront scanning behaviour (requires Chrome + real store)
- 1280×800 screenshots (requires desktop Chrome)
- Extension popup UI, permission prompts, multi-tab audit flow
- Client report PDF export
