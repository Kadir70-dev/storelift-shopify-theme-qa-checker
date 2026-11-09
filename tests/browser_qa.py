#!/usr/bin/env python3
"""
StoreLift browser fixture QA tests.

Requires: playwright Python package + Chromium browser.
Install: pip install playwright && python -m playwright install chromium

Run:   python3 tests/browser_qa.py
Skip:  SKIP_BROWSER_QA=1 python3 tests/browser_qa.py

These tests exercise the collector.js DOM scanner against local fixture HTML files.
They do NOT require a live Shopify store, real network access, or the Chrome extension
to be installed — they run collector.js directly in a Playwright browser context.

Limitations (always document these):
- Fixture pages are static HTML; JavaScript-rendered storefronts may behave differently.
- Broken-image detection (img.complete && naturalWidth===0) requires the browser to
  actually attempt loading; with blocked network it may not resolve the same way.
- No test of the Chrome extension popup UI, permissions prompt or chrome.storage.
- Mobile viewport tests only simulate narrow width; they do not test a real device.
- These are automated fixture checks, NOT live Shopify store verification.
"""

import os
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent.resolve()
FIXTURES = ROOT / "fixtures"

SKIP = os.getenv("SKIP_BROWSER_QA") == "1"


def skip_if_unavailable():
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
        return False
    except ImportError:
        print("SKIP: playwright not installed (pip install playwright && python -m playwright install chromium)")
        return True


STORE_ORIGIN = "https://testshop.myshopify.com"
# Browser-drawn 1px SVG, served from a mocked image URL. No external network.
PIXEL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="blue"/></svg>'


def collect_page(page, fixture_name: str, after_load=None) -> dict:
    """Exercise real Chromium DOM under a synthetic same-origin Shopify URL.

    All requests are intercepted. Fixtures and valid images are served locally;
    deliberately broken images return 404. This is NOT live-store testing.
    """
    healthy = fixture_name == "product-page.html"
    url = (STORE_ORIGIN + "/products/classic-cotton-shirt") if healthy else (
        STORE_ORIGIN + "/pages/broken-test")
    html = (FIXTURES / fixture_name).read_text(encoding="utf-8")

    def serve_fixture(route):
        req = route.request
        target = req.url
        if target == url and req.resource_type == "document":
            route.fulfill(status=200, content_type="text/html", body=html)
        elif target.startswith("https://cdn.shopify.com/") and req.resource_type == "image":
            route.fulfill(status=200, content_type="image/svg+xml", body=PIXEL_SVG)
        elif target in (STORE_ORIGIN + "/broken-404.jpg", STORE_ORIGIN + "/no-alt.jpg"):
            route.fulfill(status=404, content_type="text/plain", body="Not found")
        else:
            # Fail closed: no actual external request leaves the test browser.
            route.abort()

    page.route("**/*", serve_fixture)
    page.goto(url, wait_until="load")
    if after_load:
        after_load(page)
    # Inject both scripts
    page.add_script_tag(path=str(ROOT / "logic.js"))
    page.add_script_tag(path=str(ROOT / "collector.js"))
    raw = page.evaluate("() => globalThis.__storeliftCollect()")
    result = page.evaluate(
        "(raw) => globalThis.StoreLiftLogic.analyze(raw)",
        raw
    )
    return result


def run_tests():
    from playwright.sync_api import sync_playwright

    passed = failed = 0

    def ok(label: str):
        nonlocal passed
        passed += 1
        print(f"  PASS  {label}")

    def fail(label: str, detail: str = ""):
        nonlocal failed
        failed += 1
        print(f"  FAIL  {label}" + (f": {detail}" if detail else ""))

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("\n=== Fixture: product-page.html (healthy product page) ===")
        page = browser.new_page()
        result = collect_page(page, "product-page.html")
        page.close()

        if result["score"] == 100:
            ok("Healthy product page scores 100")
        else:
            fail("Healthy product page scores 100", f"score={result['score']}, issues={[i['title'] for i in result['issues']]}")

        if result["shopifyHints"]:
            ok("Shopify signals detected on fixture")
        else:
            fail("Shopify signals detected on fixture")

        if result["hasProductSchema"]:
            ok("Product JSON-LD detected")
        else:
            fail("Product JSON-LD detected")

        if result["hasCartAction"]:
            ok("Cart action (add-to-cart form) detected")
        else:
            fail("Cart action (add-to-cart form) detected")

        if result["hasShippingLink"]:
            ok("Shipping link detected")
        else:
            fail("Shipping link detected")

        if result["hasReturnLink"]:
            ok("Return/refund link detected")
        else:
            fail("Return/refund link detected")

        if result["missingAlt"] == 0:
            ok("No images missing alt on healthy page")
        else:
            fail("No images missing alt on healthy page", f"missing={result['missingAlt']}")

        print("\n=== Fixture: broken-page.html (intentionally broken) ===")
        page = browser.new_page()
        result_broken = collect_page(page, "broken-page.html")
        page.close()

        issue_titles = [i["title"] for i in result_broken["issues"]]

        if any("noindex" in t.lower() for t in issue_titles):
            ok("Noindex directive detected")
        else:
            fail("Noindex directive detected")

        if any("h1" in t.lower() for t in issue_titles):
            ok("Missing H1 detected")
        else:
            fail("Missing H1 detected")

        if any("title" in t.lower() for t in issue_titles):
            ok("Missing title detected")
        else:
            fail("Missing title detected")

        if any("description" in t.lower() for t in issue_titles):
            ok("Missing description detected")
        else:
            fail("Missing description detected")

        if any("alt" in t.lower() for t in issue_titles):
            ok("Missing alt attribute detected")
        else:
            fail("Missing alt attribute detected")

        if any("placeholder" in t.lower() for t in issue_titles):
            ok("Lorem ipsum placeholder detected")
        else:
            fail("Lorem ipsum placeholder detected")

        if any("link" in t.lower() for t in issue_titles):
            ok("Empty/non-navigating links detected")
        else:
            fail("Empty/non-navigating links detected")

        if any("broken" in t.lower() for t in issue_titles):
            ok("404 fixture images detected as broken")
        else:
            fail("404 fixture images detected as broken", str(issue_titles))

        if result_broken["score"] < 60:
            ok(f"Broken page score appropriately low ({result_broken['score']})")
        else:
            fail(f"Broken page score appropriately low", f"score={result_broken['score']}")

        print("\n=== Mobile viewport simulation ===")
        page = browser.new_page(viewport={"width": 375, "height": 812})
        result_mobile = collect_page(page, "product-page.html")
        page.close()

        if result_mobile["viewportWidth"] == 375:
            ok("Mobile viewport width correctly reported as 375px")
        else:
            fail("Mobile viewport width correctly reported", f"got={result_mobile['viewportWidth']}")

        print("\n=== Security: collector.js does not exfiltrate data ===")
        page = browser.new_page()
        requests_made = []

        def monitor_after_fixture_loaded(p):
            # Asset loads are page resources, not network calls from collector.js.
            # Observe requests only after the full fixture and images are loaded.
            p.on("request", lambda req: requests_made.append(req.url))

        collect_page(page, "product-page.html", after_load=monitor_after_fixture_loaded)
        page.close()

        if not requests_made:
            ok("Collector analysis triggers no extra network requests")
        else:
            fail("Collector analysis triggers no extra network requests", str(requests_made[:3]))

        browser.close()

    print(f"\n{'='*50}")
    print(f"Browser fixture results: {passed} passed, {failed} failed")
    if failed > 0:
        print("FAILURES — see above.")
        sys.exit(1)
    else:
        print("All fixture tests PASSED.")
        print("\nNOTE: These are fixture-only tests. Live Shopify store testing")
        print("requires real Chrome, real storefront, and manual verification.")


if __name__ == "__main__":
    if SKIP:
        print("SKIP_BROWSER_QA=1 — skipping browser tests.")
        sys.exit(0)
    if skip_if_unavailable():
        sys.exit(0)  # skip gracefully, not a failure
    run_tests()
