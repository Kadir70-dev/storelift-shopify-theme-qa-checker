#!/usr/bin/env python3
"""
StoreLift Theme QA Checker — release packager.

Usage:
    python3 build_release.py           # build only
    python3 build_release.py --test    # build + run packaging regression tests
    python3 build_release.py --verify <zip>  # verify an existing ZIP

Output: dist/storelift-theme-qa-checker-v{VERSION}.zip
"""
import argparse
import hashlib
import json
import os
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

# Files to include in the release ZIP (all relative to ROOT).
RELEASE_FILES = [
    "manifest.json",
    "collector.js",
    "logic.js",
    "popup.js",
    "popup.html",
    "report.js",
    "report.html",
    "permission.js",
    "permission.html",
    "style.css",
    "report.css",
    "README.md",
    "icons/16.png",
    "icons/32.png",
    "icons/48.png",
    "icons/128.png",
]

# Files that must NEVER appear in the release ZIP.
FORBIDDEN_PATTERNS = [
    r"\.env",
    r"\.git",
    r"node_modules",
    r"__pycache__",
    r"\.pyc$",
    r"\.DS_Store",
    r"tests/",
    r"fixtures/",
    r"dist/",
    r"build_release\.py",
]


def read_manifest() -> dict:
    return json.loads((ROOT / "manifest.json").read_text())


def get_version() -> str:
    return read_manifest()["version"]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(output_dir: Path | None = None) -> Path:
    version = get_version()
    dist = output_dir or (ROOT / "dist")
    dist.mkdir(exist_ok=True)
    out = dist / f"storelift-theme-qa-checker-v{version}.zip"

    missing = [f for f in RELEASE_FILES if not (ROOT / f).exists()]
    if missing:
        print(f"ERROR: Missing source files: {missing}", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel in RELEASE_FILES:
            zf.write(ROOT / rel, arcname=rel)

    print(f"Built: {out} ({out.stat().st_size:,} bytes)")
    print(f"SHA256: {sha256_file(out)}")
    return out


def verify(zip_path: Path, run_tests: bool = False) -> bool:
    """Run packaging regression tests against a ZIP. Returns True if all pass."""
    print(f"\nVerifying: {zip_path}")
    passed = failed = 0

    def ok(label: str):
        nonlocal passed
        passed += 1
        print(f"  PASS  {label}")

    def fail(label: str, detail: str = ""):
        nonlocal failed
        failed += 1
        print(f"  FAIL  {label}" + (f": {detail}" if detail else ""))

    with zipfile.ZipFile(zip_path) as zf:
        names = set(zf.namelist())

        # 1. manifest.json is at root (not nested).
        if "manifest.json" in names:
            ok("manifest.json at ZIP root")
        else:
            fail("manifest.json at ZIP root", f"found: {[n for n in names if 'manifest' in n]}")

        # 2. No nested subfolder (e.g. storelift-seo-inspector/manifest.json).
        nested = [n for n in names if "/" in n and not n.startswith("icons/")]
        if not nested:
            ok("No unexpected nested subdirectories")
        else:
            fail("No unexpected nested subdirectories", str(nested))

        # 3. All required release files present.
        expected = set(RELEASE_FILES)
        present = names & expected
        if present == expected:
            ok(f"All {len(expected)} required files present")
        else:
            missing = expected - present
            fail(f"All {len(expected)} required files present", f"missing: {sorted(missing)}")

        # 4. No hidden files or forbidden patterns.
        forbidden_found = []
        for name in names:
            for pat in FORBIDDEN_PATTERNS:
                if re.search(pat, name):
                    forbidden_found.append(name)
                    break
        if not forbidden_found:
            ok("No forbidden/hidden files in ZIP")
        else:
            fail("No forbidden/hidden files in ZIP", str(forbidden_found))

        # 5. Manifest V3 validation.
        try:
            manifest = json.loads(zf.read("manifest.json"))
            if manifest.get("manifest_version") == 3:
                ok("Manifest V3")
            else:
                fail("Manifest V3", f"manifest_version={manifest.get('manifest_version')}")

            if manifest.get("version"):
                ok(f"Version field present: {manifest['version']}")
            else:
                fail("Version field present")

            if manifest.get("name"):
                ok(f"Name field present: {manifest['name'][:40]}")
            else:
                fail("Name field present")

            # 6. No background.persistent (banned in MV3).
            bg = manifest.get("background", {})
            if "persistent" not in bg:
                ok("No background.persistent (MV3 compliant)")
            else:
                fail("No background.persistent", "persistent key banned in MV3")

            # 7. No dangerous permissions.
            perms = set(manifest.get("permissions", []))
            dangerous = perms & {"tabs", "webRequest", "webNavigation", "browsingData",
                                 "cookies", "nativeMessaging", "debugger", "history"}
            if not dangerous:
                ok(f"No dangerous permissions (declared: {sorted(perms)})")
            else:
                fail("No dangerous permissions", f"found: {dangerous}")

            # 8. No background service_worker (extension is popup-only, no background).
            if "background" not in manifest:
                ok("No background service worker (popup-only, correct)")
            else:
                fail("No background service worker", "extension should be popup-only")

            # 9. Icons declared for 16, 48, 128.
            icons = manifest.get("icons", {})
            for size in ["16", "48", "128"]:
                if size in icons:
                    ok(f"Icon {size}px declared")
                else:
                    fail(f"Icon {size}px declared")

        except (json.JSONDecodeError, KeyError) as e:
            fail("Manifest parseable", str(e))

        # 10. logic.js exports StoreLiftLogic.
        try:
            logic_src = zf.read("logic.js").decode()
            if "StoreLiftLogic" in logic_src and "module.exports" in logic_src:
                ok("logic.js exports StoreLiftLogic (Node-importable)")
            else:
                fail("logic.js exports StoreLiftLogic")
        except Exception as e:
            fail("logic.js readable", str(e))

        # 11. No telemetry / fetch to external hosts in JS files.
        for js_file in ["collector.js", "logic.js", "popup.js", "report.js", "permission.js"]:
            try:
                src = zf.read(js_file).decode()
                # Allow fetch only inside collector for HEAD link checks (same-origin, credentials:omit)
                # Disallow any external URL fetch or XMLHttpRequest to non-localhost.
                bad = re.findall(r'fetch\s*\(\s*["\']https?://(?!localhost)', src)
                bad += re.findall(r'new\s+XMLHttpRequest', src)
                bad += re.findall(r'navigator\.sendBeacon', src)
                if not bad:
                    ok(f"{js_file}: no external fetch / XHR / beacon")
                else:
                    fail(f"{js_file}: no external fetch / XHR / beacon", str(bad[:3]))
            except Exception as e:
                fail(f"{js_file} readable", str(e))

        # 12. No inline event handlers in HTML that bypass CSP.
        for html_file in ["popup.html", "report.html", "permission.html"]:
            try:
                src = zf.read(html_file).decode()
                inline = re.findall(r'\bon\w+\s*=\s*["\']', src, re.I)
                if not inline:
                    ok(f"{html_file}: no inline event handlers")
                else:
                    fail(f"{html_file}: no inline event handlers", str(inline[:3]))
            except Exception as e:
                fail(f"{html_file} readable", str(e))

        # 13. ZIP size sanity (should be < 500 KB for a simple extension).
        size_kb = zip_path.stat().st_size / 1024
        if size_kb < 500:
            ok(f"ZIP size reasonable ({size_kb:.1f} KB < 500 KB)")
        else:
            fail(f"ZIP size reasonable", f"{size_kb:.1f} KB (check for large assets)")

    print(f"\nPackaging tests: {passed} passed, {failed} failed")
    return failed == 0


def main():
    parser = argparse.ArgumentParser(description="StoreLift release packager")
    parser.add_argument("--test", action="store_true", help="Run packaging regression tests after building")
    parser.add_argument("--verify", metavar="ZIP", help="Verify an existing ZIP without rebuilding")
    args = parser.parse_args()

    if args.verify:
        ok = verify(Path(args.verify))
        sys.exit(0 if ok else 1)

    zip_path = build()

    if args.test:
        ok = verify(zip_path)
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
