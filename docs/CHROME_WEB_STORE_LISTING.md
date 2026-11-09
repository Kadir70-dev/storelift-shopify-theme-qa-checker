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
User-initiated Shopify storefront QA: check pages, produce a client handover report. No backend, no account.
```

### Detailed description (≤ 16,383 chars)

```
StoreLift — Shopify Theme QA Checker is a standalone browser-only quality-control tool for Shopify theme developers and digital agencies. No VPS, backend, AI, Shopify admin token, or login required.

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

No background scripts. No cross-origin data collection. No tracking or telemetry. Reports stay on your device.

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

## Privacy practices questionnaire (answer honestly)

| Question | Answer | Notes |
|---|---|---|
| Does the extension collect user data? | No | No data leaves the browser |
| Does it transmit personal data? | No | — |
| Does it use the data for purposes other than the core function? | No | — |
| Is data encrypted in transit? | N/A | No data transmitted |
| Does it sell data to third parties? | No | — |
| Does it use the data for personalisation or advertising? | No | — |

---

## Support URL (OWNER ACTION REQUIRED)

Must be a live public URL. Options:
- GitHub repository Issues tab
- A simple hosted page at storelift.io/support or similar
- Email contact link

---

## Privacy policy URL (OWNER ACTION REQUIRED)

Must be a live public URL. See `docs/PRIVACY_POLICY_DRAFT.md` for the draft.
Host it at: `https://your-domain.com/privacy` or GitHub Pages.

---

## Submission checklist

- [ ] Real 1280×800 screenshots captured on live Chrome
- [ ] Privacy policy URL live and publicly accessible
- [ ] Support contact URL live
- [ ] Chrome Web Store developer account created ($5 one-time fee)
- [ ] Extension ZIP verified with `python3 build_release.py --test`
- [ ] Final owner review and approval of listing text
- [ ] Submit for Chrome review (typically 1–3 business days)
