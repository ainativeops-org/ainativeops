#!/usr/bin/env python3
"""Build the single-file AiNativeOps map from model/ and site/.

Usage: python tools/build.py [--out dist/index.html] [--no-routes]

The repository URL comes from project.yaml or from the AINO_REPOSITORY environment
variable (the GitHub Pages workflow sets it to the current repository).

Workflow diagrams are laid out by tools/workflows.py. When Playwright is installed, the build
also opens the page once in headless Chromium and embeds the line geometry of the
Stack and Infrastructure views, so the published map does not route lines in the
browser. Without Playwright the map still works and routes lines itself.
"""
import argparse
import json
import os
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import ROOT, ModelFileError, load_model, validate  # noqa: E402
from workflows import GraphvizMissing, render_all  # noqa: E402

SITE = ROOT / "site"
SCRIPTS = (("/*{{STYLES}}*/", "styles.css"), ("/*{{PROCESSES}}*/", "processes.js"),
           ("/*{{APP}}*/", "app.js"), ("/*{{WORKBENCH}}*/", "workbench.js"))


def script_json(obj):
    # safe to embed inside <script>: no "</script>" or "<!--" can appear
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")


def assemble(project, model):
    html = (SITE / "index.html").read_text(encoding="utf-8")
    parts = [("/*{{PROJECT}}*/", script_json(project)), ("/*{{MODEL}}*/", script_json(model))]
    parts += [(marker, (SITE / name).read_text(encoding="utf-8")) for marker, name in SCRIPTS]
    for marker, value in parts:
        if marker not in html:
            raise ValueError(f"template marker {marker} not found in site/index.html")
        html = html.replace(marker, value)
    return html


def collect_routes(page_path):
    """Return the router output of the built page, or None when Playwright is not installed."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    geometry = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        # the build runs offline: web fonts are not needed for geometry
        page.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort())
        for lang in ("ru", "en"):
            page.goto(page_path.as_uri() + f"?view=meta&lang={lang}")
            page.wait_for_function("window.AINO_MAP && window.AINO_MAP.routeGeometry")
            geometry.update(page.evaluate("window.AINO_MAP.routeGeometry()"))
        browser.close()
    return geometry


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(ROOT / "dist" / "index.html"))
    ap.add_argument("--no-routes", action="store_true", help="skip the line geometry pass (no Playwright needed)")
    args = ap.parse_args()

    try:
        model = load_model()
    except ModelFileError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    errors = validate(model)
    if errors:
        for e in errors:
            print(f"error: {e}", file=sys.stderr)
        print("build stopped: fix the model first (python tools/validate.py)", file=sys.stderr)
        return 1
    # deprecated classes stay in the model for references but are not drawn
    model["stack"]["classes"] = {k: c for k, c in model["stack"]["classes"].items() if c.get("status", "active") == "active"}
    try:
        render_all(model["workbench"])
    except GraphvizMissing as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    with open(ROOT / "project.yaml", encoding="utf-8") as f:
        project = yaml.safe_load(f)
    project["repository"] = os.environ.get("AINO_REPOSITORY") or project.get("repository") or ""

    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    html = assemble(project, model)
    if not args.no_routes:
        draft = out.with_name(".routes-" + out.name)
        draft.write_text(html, encoding="utf-8")
        try:
            geometry = collect_routes(draft)
        finally:
            draft.unlink(missing_ok=True)
        if geometry is None:
            print("note: Playwright is not installed, the map will route lines in the browser "
                  "(pip install playwright && python -m playwright install chromium)", file=sys.stderr)
        else:
            model["workbench"]["routeGeometry"] = geometry
            html = assemble(project, model)
    out.write_text(html, encoding="utf-8")
    shown = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(f"built {shown} ({len(html.encode('utf-8')) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
