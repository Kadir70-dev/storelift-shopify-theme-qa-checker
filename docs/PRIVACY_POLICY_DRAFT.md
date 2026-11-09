# Privacy Policy — StoreLift Theme QA Checker

**Last updated: 2026-11-09**

**Live URL:** https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html
*(GitHub Pages — allow 1–5 minutes after first deploy for page to go live)*

---

## Overview

StoreLift Theme QA Checker ("the Extension") is a browser-only developer tool for quality-checking Shopify storefronts. This policy explains what data the Extension handles and how.

---

## What data the Extension accesses

When you run a scan, the Extension reads the already-loaded DOM of the active tab you clicked it on. This includes:

- Page title, meta description, canonical URL, robots meta tag
- H1 heading count
- Image `src` and `alt` attributes (to detect missing alt text and broken images)
- Anchor `href` attributes (to detect empty or non-navigating links)
- Visible text content (to detect placeholder/demo text)
- JSON-LD structured data blocks
- Presence of cart form and shipping/return link text
- Viewport width at time of scan

When you choose "Verify internal links", the Extension sends HTTP HEAD requests to same-origin product, collection, page, and policy URLs to check for potential 404 responses. These requests are limited to the same Shopify store origin, use `credentials: 'omit'`, and do not carry any user session data.

---

## What data the Extension stores

Scan results (page URL, findings list, score, timestamps) are saved in `chrome.storage.local` — your browser's local extension storage on your device. Up to 24 sessions and 20 pages per session are retained.

**No data is stored outside your device.** You can delete all stored data at any time using the "Clear all sessions" button in the Extension popup.

---

## What data the Extension does NOT collect

- No personal information (name, email, account credentials)
- No Shopify admin API tokens or store passwords
- No payment or financial data
- No browsing history beyond the tab you explicitly scan
- No analytics, telemetry, or crash reporting
- No cookies

---

## Data transmission

The Extension does not transmit any data to any server operated by StoreLift or any third party.

The only outbound network requests it may make are:

1. **HEAD requests to the scanned store's own origin** — only when you use "Verify internal links"; these go to the Shopify store you are already viewing, not to any StoreLift server.
2. **No other requests.** There is no backend, no analytics endpoint, and no cloud sync.

---

## Permissions used

| Permission | Why it is needed |
|---|---|
| `activeTab` | Access the tab you clicked the Extension on |
| `scripting` | Read the already-loaded DOM of that tab (read-only) |
| `storage` | Save scan results locally in your browser |
| Optional `https://*` origin | Only requested when you choose "Audit open store tabs" or "Verify internal links"; grants access to that specific store origin only, for that session |

---

## Third-party services

The Extension does not integrate with, embed, or communicate with any third-party service.

---

## Children's privacy

The Extension is a developer tool not directed at children. It does not knowingly collect any information from children under 13.

---

## Changes to this policy

If the Extension's data practices change in a future version, this policy will be updated and the "Last updated" date will reflect the change. Significant changes will be noted in the Chrome Web Store release notes.

---

## Contact

For questions about this privacy policy or the Extension, open an issue at:
https://github.com/Kadir70-dev/storelift-shopify-theme-qa-checker/issues

---

*StoreLift Theme QA Checker is an independent developer tool. It is not affiliated with or endorsed by Shopify Inc.*
