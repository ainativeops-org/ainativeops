#!/usr/bin/env python3
"""Render the built map in headless Chromium and check it.

Usage: python tools/check_layout.py [dist/index.html]
Requires: pip install playwright && playwright install chromium

Checks in both languages:
- no script errors;
- no model or dependency line crosses a block in the Stack and Infrastructure views;
- every element label fits its box;
- every process on the map, in every placement variant, draws its full route in every view;
- in the Stack and Infrastructure views a route line crosses no block and takes no detour longer than
  1.6 times the distance between the centres of its blocks;
- the English map, route panel and process head contain no Russian text.
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CYRILLIC = re.compile("[А-Яа-яЁё]")
CROSS = r"""() => {
  const rects = [...document.querySelectorAll('.el.dk')].map(g => { const r = g.querySelector('rect.body'); return { id: g.dataset.id, x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }; });
  const bad = [];
  for (const p of document.querySelectorAll('.dk-link path.dk-edge')) {
    const d = p.getAttribute('d');
    if (/[HV]/.test(d)) { bad.push('fallback route ' + d.slice(0, 30)); continue; }
    const pts = d.slice(1).split('L').map(s => s.trim().split(/\s+/).map(Number));
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], lx = Math.min(x1, x2), hx = Math.max(x1, x2), ly = Math.min(y1, y2), hy = Math.max(y1, y2);
      for (const r of rects) if (hx > r.x + 1 && lx < r.x + r.w - 1 && hy > r.y + 1 && ly < r.y + r.h - 1) bad.push('line ' + p.parentNode.dataset.from + ' -> ' + p.parentNode.dataset.to + ' crosses ' + r.id);
    }
  }
  return bad;
}"""
TEXT = r"""(sel) => { const out = []; for (const root of document.querySelectorAll(sel)) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('script,style,title') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n; while ((n = w.nextNode())) { const s = n.textContent.trim(); if (s) out.push(s.slice(0, 60)); } } return out; }"""
CUT = r"""() => [...document.querySelectorAll('#svg g.el')].filter(g => [...g.querySelectorAll('text, tspan')].some(t => t.textContent.trim().endsWith('…'))).map(g => g.dataset.id)"""
ROUTE = r"""() => {
  const rects = Object.fromEntries([...document.querySelectorAll('.el.dk')].map(g => { const r = g.querySelector('rect.body'); return [g.dataset.id, { x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }]; }));
  const bad = [];
  for (const p of document.querySelectorAll('path.rt:not(.rt-return)')) {
    const a = rects[p.dataset.from], b = rects[p.dataset.to];
    if (!a || !b) continue;
    // M and L give points; a rounded corner Q gives its corner (control point) and its end
    const pts = [...p.getAttribute('d').matchAll(/([MLQ])([^MLQ]*)/g)].flatMap(m => { const n = m[2].trim().split(/[\s,]+/).map(Number); return m[1] === 'Q' ? [n.slice(0, 2), n.slice(2)] : [n]; });
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], lx = Math.min(x1, x2), hx = Math.max(x1, x2), ly = Math.min(y1, y2), hy = Math.max(y1, y2);
      len += hx - lx + hy - ly;
      for (const [id, r] of Object.entries(rects)) if (id !== p.dataset.from && id !== p.dataset.to && hx > r.x + 1 && lx < r.x + r.w - 1 && hy > r.y + 1 && ly < r.y + r.h - 1) bad.push(`route line ${p.dataset.from} -> ${p.dataset.to} crosses ${id}`);
    }
    const md = Math.abs(a.x + a.w / 2 - b.x - b.w / 2) + Math.abs(a.y + a.h / 2 - b.y - b.h / 2);
    if (md > 150 && len > 1.6 * md) bad.push(`route line ${p.dataset.from} -> ${p.dataset.to} takes a detour: ${Math.round(len)} for ${Math.round(md)}`);
  }
  return [...new Set(bad)];
}"""
MODES = {"meta": [None], "infra": ["deps", "relations"], "stack": ["deps"]}


def main():
    page_path = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "dist" / "index.html").resolve()
    url = page_path.as_uri()
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for lang in ("ru", "en"):
            page = browser.new_page(viewport={"width": 1600, "height": 950})
            page.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort())
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"{url}?view=meta&lang={lang}")
            page.wait_for_function("window.AINO_PROCESSES && window.AINO_MAP")
            flows = page.evaluate("window.AINO_PROCESSES.rows.map(r => [r.id, r.paths ? Object.keys(r.paths) : ['']])")
            for view, modes in MODES.items():
                for mode in modes:
                    page.goto(f"{url}?view={view}&lang={lang}")
                    switch = page.locator(f"[data-graph-mode={mode}][aria-pressed=false]")
                    if mode and switch.count():
                        switch.click()
                    problems += [f"{lang}/{view}/{mode or 'flows'}: {b}" for b in page.evaluate(CROSS)]
                    cut = page.evaluate(CUT)
                    problems += [f"{lang}/{view}: label of {x} does not fit its box" for x in cut]
                    if lang == "en":
                        labels = [s for s in page.evaluate(TEXT, "#svg, #map-key") if CYRILLIC.search(s)]
                        problems += [f"en/{view}: Russian text on the map: {s!r}" for s in labels[:5]]
                checked = 0
                for fid, variants in flows:
                    for variant in variants:
                        page.goto(f"{url}?view={view}&lang={lang}&mapProcess={fid}" + (f"&mapVariant={variant}" if variant else ""))
                        steps, segments = page.evaluate("() => [document.querySelectorAll('#rlist li').length, document.querySelectorAll('.rt').length]")
                        where = f"{lang}/{view}: {fid}{'/' + variant if variant else ''}"
                        if steps < 2 or segments != steps - 1:
                            problems.append(f"{where}: draws {segments} segments for {steps} steps")
                        if view != "meta":
                            problems += [f"{where}: {b}" for b in page.evaluate(ROUTE)]
                        if lang == "en":
                            ru = [s for s in page.evaluate(TEXT, "#route, #process-head, #scenBtn") if CYRILLIC.search(s)]
                            problems += [f"{where}: Russian text in the route panel: {s!r}" for s in ru[:3]]
                        checked += 1
                print(f"{lang}/{view}: {checked} process routes checked")
            problems += [f"{lang}: script error {e}" for e in errors]
            page.close()
        browser.close()
    for pr in problems:
        print("problem:", pr, file=sys.stderr)
    print("layout OK" if not problems else f"{len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
