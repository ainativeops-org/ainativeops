#!/usr/bin/env python3
"""Build the single-file AiNativeOps map from model/ and site/.

Usage: python tools/build.py [--out dist/index.html]
The repository URL comes from project.yaml or from the AINO_REPOSITORY environment
variable (the GitHub Pages workflow sets it to the current repository).
"""
import argparse
import json
import os
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import ROOT, ModelFileError, load_model, validate  # noqa: E402


def script_json(obj):
    # safe to embed inside <script>: no "</script>" or "<!--" can appear
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(ROOT / "dist" / "index.html"))
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

    with open(ROOT / "project.yaml", encoding="utf-8") as f:
        project = yaml.safe_load(f)
    project["repository"] = os.environ.get("AINO_REPOSITORY") or project.get("repository") or ""

    site = ROOT / "site"
    html = (site / "index.html").read_text(encoding="utf-8")
    for marker, value in (("/*{{STYLES}}*/", (site / "styles.css").read_text(encoding="utf-8")),
                          ("/*{{PROJECT}}*/", script_json(project)),
                          ("/*{{MODEL}}*/", script_json(model)),
                          ("/*{{APP}}*/", (site / "app.js").read_text(encoding="utf-8"))):
        if marker not in html:
            print(f"template marker {marker} not found in site/index.html", file=sys.stderr)
            return 1
        html = html.replace(marker, value)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"built {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out} ({len(html) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
