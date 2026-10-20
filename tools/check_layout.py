#!/usr/bin/env python3
"""Render the built map in headless Chromium and check it.

Usage: python tools/check_layout.py [dist/index.html]
Requires: pip install playwright && playwright install chromium
Checks every view in both languages: no script errors, no edge crosses a block,
every scenario renders its full route.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CROSS = r"""() => {
  const rects = [...document.querySelectorAll('.el.dk')].map(g => { const r = g.querySelector('rect.body'); return { id: g.dataset.id, x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }; });
  const bad = [];
  for (const p of document.querySelectorAll('.dk-link path.dk-edge')) {
    const d = p.getAttribute('d');
    if (/[HV]/.test(d)) { bad.push('fallback route ' + d.slice(0, 30)); continue; }
    const pts = d.slice(1).split('L').map(s => s.trim().split(/\s+/).map(Number));
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], lx = Math.min(x1, x2), hx = Math.max(x1, x2), ly = Math.min(y1, y2), hy = Math.max(y1, y2);
      for (const r of rects) if (hx > r.x + 1 && lx < r.x + r.w - 1 && hy > r.y + 1 && ly < r.y + r.h - 1) bad.push('edge crosses ' + r.id);
    }
  }
  return bad;
}"""


def main():
    page_path = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "dist" / "index.html").resolve()
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for lang in ("ru", "en"):
            page = browser.new_page(viewport={"width": 1600, "height": 950})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(page_path.as_uri() + f"?lang={lang}")
            page.wait_for_timeout(600)
            for view in ("meta", "infra", "stack"):
                page.click(f"[data-view={view}]")
                page.wait_for_timeout(300)
                problems += [f"{lang}/{view}: {b}" for b in page.evaluate(CROSS)]
                page.click("#scenBtn")
                n = page.locator("#scenMenu button").count()
                page.keyboard.press("Escape")
                for i in range(2, n + 1):
                    page.click("#scenBtn")
                    page.click(f"#scenMenu button:nth-of-type({i})")
                    page.wait_for_timeout(250)
                    steps, routes = page.evaluate("() => [document.querySelectorAll('#rlist li').length, document.querySelectorAll('.rt').length]")
                    if steps < 2 or routes != steps - 1:
                        problems.append(f"{lang}/{view}: scenario #{i - 1} draws {routes} segments for {steps} steps")
                print(f"{lang}/{view}: {n - 1} scenarios checked")
            problems += [f"{lang}: script error {e}" for e in errors]
            page.close()
        browser.close()
    for pr in problems:
        print("problem:", pr, file=sys.stderr)
    print("layout OK" if not problems else f"{len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
