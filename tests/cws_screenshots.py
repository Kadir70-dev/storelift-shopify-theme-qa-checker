#!/usr/bin/env python3
"""Capture honest 1280x800 screenshots from the real MV3 extension's UI.

Runs headless Chromium with the unmodified unpacked extension. DOM findings are
created from local HTML fixtures under a synthetic Shopify origin (no live store).
These images demonstrate real extension UI/report rendering, NOT live-site QA,
toolbar permission prompts, or end-to-end Chrome Web Store install behavior.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "screenshots"
ORIGIN = "https://testshop.myshopify.com"
PNG_1PX = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")


def find_id(profile: Path, extension: Path) -> str:
    prefs = profile / "Default" / "Preferences"
    if prefs.exists():
        settings = json.loads(prefs.read_text()).get("extensions", {}).get("settings", {})
        for ext_id, data in settings.items():
            if "StoreLift" in str(data.get("manifest", {}).get("name", "")):
                return ext_id
    # Chromium fallback for an unpacked extension whose ID is based on its path.
    digest = hashlib.sha256(str(extension.resolve()).encode("utf-8")).digest()[:16]
    return "".join(chr(97 + (b >> 4)) + chr(97 + (b & 15)) for b in digest)


def capture():
    from playwright.sync_api import Error
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="storelift-cws-profile-") as folder:
        profile = Path(folder)
        ext = ROOT.resolve()
        args = [f"--disable-extensions-except={ext}", f"--load-extension={ext}"]
        with sync_playwright() as pw:
            # 'chromium' channel uses new headless and supports Manifest V3 extensions.
            ctx = pw.chromium.launch_persistent_context(
                str(profile), channel="chromium", headless=True, args=args,
                viewport={"width": 1280, "height": 800}, accept_downloads=True,
            )
            ctx.close()
            ext_id = find_id(profile, ext)
            ctx = pw.chromium.launch_persistent_context(
                str(profile), channel="chromium", headless=True, args=args,
                viewport={"width": 1280, "height": 800}, accept_downloads=True,
            )

            def serve(route):
                url = route.request.url
                if url == ORIGIN + "/products/classic-cotton-shirt":
                    html = (ROOT / "fixtures" / "product-page.html").read_text()
                    return route.fulfill(status=200, content_type="text/html", body=html)
                if url == ORIGIN + "/pages/broken-test":
                    html = (ROOT / "fixtures" / "broken-page.html").read_text()
                    return route.fulfill(status=200, content_type="text/html", body=html)
                if url.startswith("https://cdn.shopify.com/"):
                    return route.fulfill(status=200, content_type="image/gif", body=PNG_1PX)
                return route.fulfill(status=404, body="Demo asset not found")

            ctx.route(ORIGIN + "/**", serve)
            ctx.route("https://cdn.shopify.com/**", serve)
            store = ctx.new_page()

            def analyze(route_path, mobile=False):
                store.set_viewport_size({"width": 375 if mobile else 1280, "height": 812 if mobile else 800})
                store.goto(ORIGIN + route_path, wait_until="load")
                store.add_script_tag(path=str(ROOT / "logic.js"))
                store.add_script_tag(path=str(ROOT / "collector.js"))
                raw = store.evaluate("() => globalThis.__storeliftCollect()")
                return store.evaluate("(raw) => globalThis.StoreLiftLogic.analyze(raw)", raw)

            healthy = analyze("/products/classic-cotton-shirt")
            broken = analyze("/pages/broken-test")
            mobile = analyze("/products/classic-cotton-shirt", mobile=True)
            print("Fixture scores: healthy=%s broken=%s mobile=%s" %
                  (healthy["score"], broken["score"], mobile["score"]))
            assert healthy["score"] == 100, "The healthy fixture should score 100"
            assert broken["score"] < 60, "The broken fixture should flag issues"

            popup = ctx.new_page()
            popup.set_viewport_size({"width": 1280, "height": 800})
            popup.goto(f"chrome-extension://{ext_id}/popup.html", wait_until="load")
            popup.locator("#scan").wait_for()
            popup.add_style_tag(content="""
                html { background:#eaf0f8 }
                body { margin: 34px auto 0; border-radius: 12px;
                       box-shadow:0 20px 55px rgba(14,34,65,.22); }
            """)
            popup.screenshot(path=str(OUT / "01-extension-home.png"))

            def apply(data, pages):
                popup.evaluate("""({data, pages}) => {
                    state.current = data;
                    state.session = {
                      id:'demo-handover', hostname:data.hostname,
                      createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
                      pages, checklist:{}, clientName:'Demo storefront', notes:'Sample fixture data only'
                    };
                    state.sessions = [state.session];
                    render(data); renderSession();
                    status('Demo fixture audit loaded (not a live Shopify store).');
                }""", {"data":data, "pages":pages})

            apply(healthy, [healthy])
            popup.screenshot(path=str(OUT / "02-healthy-scan.png"))
            apply(broken, [healthy, broken])
            popup.screenshot(path=str(OUT / "03-findings.png"))
            apply(mobile, [healthy, broken, mobile])
            popup.screenshot(path=str(OUT / "04-mobile-width-demo.png"))

            session = popup.evaluate("() => state.session")
            popup.evaluate("(s) => chrome.storage.local.set({storeliftSessions:[s]})", session)
            report = ctx.new_page()
            report.set_viewport_size({"width": 1280, "height": 800})
            report.goto(f"chrome-extension://{ext_id}/report.html?mode=session&id=demo-handover",
                        wait_until="load")
            report.locator("#domain").wait_for()
            report.wait_for_function("document.querySelector('#domain').textContent.includes('testshop')")
            report.screenshot(path=str(OUT / "05-agency-report.png"))
            print("Captured five real extension UI/report screenshots (fixture data).")
            for file in sorted(OUT.glob("*.png")):
                print(f"{file.name}: {file.stat().st_size} bytes")
            ctx.close()


if __name__ == "__main__":
    capture()
