#!/usr/bin/env python3
"""Build the earlier releases listed in project.yaml, so the version switcher can open them.

Usage: python tools/build_versions.py [--dist dist]

A version with a git tag and a url such as /0.1/ is checked out into a temporary git worktree
and built with its own tools into dist/0.1/index.html. Its project.yaml gets the same list of
versions with its own entry first, so the switcher of the old map leads back to the current one.
Run it after tools/build.py; the repository needs its tags (git fetch --tags).
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dist", default=str(ROOT / "dist"))
    args = ap.parse_args()
    versions = yaml.safe_load((ROOT / "project.yaml").read_text(encoding="utf-8")).get("versions") or []
    plain = [{"label": v["label"], "url": v.get("url", "")} for v in versions]
    built = 0
    for k, v in enumerate(versions):
        tag, url = v.get("tag"), v.get("url", "")
        if not tag:
            continue
        if not url.startswith("/") or url == "/":
            print(f"error: version {v['label']!r} needs a url of its own folder, such as /0.1/", file=sys.stderr)
            return 1
        out = (Path(args.dist) / url.strip("/") / "index.html").resolve()
        with tempfile.TemporaryDirectory() as tmp:
            tree = Path(tmp) / "release"
            subprocess.run(["git", "worktree", "add", "--detach", str(tree), tag], cwd=ROOT, check=True, capture_output=True)
            try:
                project_file = tree / "project.yaml"
                project = yaml.safe_load(project_file.read_text(encoding="utf-8"))
                project["versions"] = [plain[k]] + [p for j, p in enumerate(plain) if j != k]
                project_file.write_text(yaml.safe_dump(project, allow_unicode=True, sort_keys=False), encoding="utf-8")
                subprocess.run([sys.executable, "tools/build.py", "--out", str(out)], cwd=tree, check=True)
                built += 1
            finally:
                subprocess.run(["git", "worktree", "remove", "--force", str(tree)], cwd=ROOT, check=True, capture_output=True)
    print(f"built {built} earlier version(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
