"""Render process workflow diagrams (nodes and edges from model/processes) to SVG.

The layout is fixed and made for these workflows, so the build needs no external tool:
- the main path runs straight down the middle column and ends in the final outcome;
- every exit to another outcome ends in its own small terminal on the right of the node it leaves,
  terminals of one node stack under each other;
- nodes off the main path (rework, alternative branches) stand in a column on the left;
- a return to an earlier step runs up a lane between the left column and the main path.

A node keeps its id in data-workflow-node, so a click opens the step description and its components.
"""
import html
import textwrap

ARIA = {"ru": "Схема процесса с условиями и исходами", "en": "Workflow with conditions and outcomes"}
LANG_INDEX = {"ru": 0, "en": 1}

NODE_W, TERM_W = 250, 210
LINE, TERM_LINE = 17, 15
ROW_GAP = 46           # vertical space between rows; the label of a main edge sits here
LANE_GAP = 10          # distance between return lanes
PAD = 24


class GraphvizMissing(RuntimeError):
    """Kept for tools/build.py: the renderer no longer needs Graphviz."""


def _wrap(s, width):
    return textwrap.wrap(s, width=width, break_long_words=False) or [s]


def _main_path(graph):
    """The given main path, or the longest forward path from the first node to the first outcome."""
    if graph.get("main"):
        return list(graph["main"])
    order = [n["id"] for n in graph["nodes"]]
    kinds = {n["id"]: n["kind"] for n in graph["nodes"]}
    final = next((i for i in order if kinds[i] == "outcome"), None)
    nxt = {}
    for e in graph["edges"]:
        if order.index(e["to"]) > order.index(e["from"]) or kinds[e["to"]] == "outcome":
            nxt.setdefault(e["from"], []).append(e["to"])
    best = {}

    def longest(a):
        if a == final:
            return [a]
        if a in best:
            return best[a]
        paths = [longest(b) for b in nxt.get(a, []) if kinds[b] != "outcome" or b == final]
        paths = [p for p in paths if p and p[-1] == final]
        best[a] = [a] + max(paths, key=len) if paths else []
        return best[a]

    return longest(order[0]) or order[:1]


def layout(graph, lang):
    i = LANG_INDEX[lang]
    nodes = {n["id"]: n for n in graph["nodes"]}
    order = [n["id"] for n in graph["nodes"]]
    kinds = {k: n["kind"] for k, n in nodes.items()}
    main = _main_path(graph)
    final = main[-1] if main and kinds[main[-1]] == "outcome" else None
    spine = [m for m in main if m != final]

    # rows: the main path takes consecutive rows; a node off the path stands one row below its first
    # predecessor in the left column
    row, col = {}, {}
    for k, m in enumerate(spine):
        row[m], col[m] = k, 0
    taken = {(r, 0) for r in row.values()}
    side = [n for n in order if kinds[n] != "outcome" and n not in row]
    for _ in range(len(side) + 1):
        for n in side:
            if n in row:
                continue
            preds = [e["from"] for e in graph["edges"] if e["to"] == n and e["from"] in row]
            if not preds:
                continue
            r = min(row[p] for p in preds) + 1
            while (r, -1) in taken:
                r += 1
            row[n], col[n] = r, -1
            taken.add((r, -1))
    for n in side:  # unreachable leftovers keep their order
        if n not in row:
            r = max(row.values(), default=-1) + 1
            row[n], col[n] = r, -1
    last_row = max(row.values(), default=0)
    if final:
        row[final], col[final] = last_row + 1, 0

    # terminals: one per exit to an outcome other than the final one
    terms = {}
    for e in graph["edges"]:
        if kinds[e["to"]] == "outcome" and e["to"] != final and e["from"] in row:
            terms.setdefault(e["from"], []).append(e)

    def node_lines(n):
        return _wrap(nodes[n]["label"][i], 26 if kinds[n] == "decision" else 30)

    def term_lines(e):
        return _wrap(e["label"][i], 30), _wrap(nodes[e["to"]]["label"][i], 28)

    def node_h(n):
        return max(44, 20 + LINE * len(node_lines(n))) if n != final else max(40, 18 + LINE * len(node_lines(n)))

    def term_h(e):
        c, o = term_lines(e)
        return 16 + TERM_LINE * (len(c) + len(o))

    rows = max(row.values()) + 1
    height = []
    for r in range(rows):
        hs = [node_h(n) for n in row if row[n] == r]
        for n in [n for n in row if row[n] == r]:
            if n in terms:
                hs.append(sum(term_h(e) for e in terms[n]) + 8 * (len(terms[n]) - 1))
        height.append(max(hs or [44]))

    # columns, left to right: terminals of the left column, left column, return lanes, main, terminals
    has_side = any(c == -1 for c in col.values())
    side_terms = has_side and any(col[n] == -1 for n in terms)
    retries = [e for e in graph["edges"] if e["from"] in row and e["to"] in row
               and (row[e["to"]] < row[e["from"]] or (col[e["from"]] == col[e["to"]] and row[e["to"]] > row[e["from"]] + 1))]
    lanes = max(1, len(retries))
    x = PAD
    x_side_term = x if side_terms else None
    if side_terms:
        x += TERM_W + 40
    x_side = x if has_side else None
    if has_side:
        x += NODE_W
    x_lane0 = x + 26
    x += 26 + lanes * LANE_GAP + 34
    x_main = x
    x += NODE_W
    x_term = x + 56
    width = x_term + TERM_W + PAD

    y = PAD + 34  # room for the start mark
    top = []
    for r in range(rows):
        top.append(y)
        y += height[r] + ROW_GAP
    total_h = y - ROW_GAP + PAD

    box = {}
    for n in row:
        h = node_h(n)
        bx = x_main if col[n] == 0 else x_side
        by = top[row[n]] + (height[row[n]] - h) / 2
        box[n] = (bx, by, NODE_W, h)
    tbox = {}
    for n, es in terms.items():
        bx, by, bw, bh = box[n]
        hs = [term_h(e) for e in es]
        stack = sum(hs) + 8 * (len(es) - 1)
        ty = by + bh / 2 - stack / 2
        tx = x_term if col[n] == 0 else x_side_term
        for e, h in zip(es, hs):
            tbox[(e["from"], e["to"], e["label"][i])] = (tx, ty, TERM_W, h)
            ty += h + 8
    return dict(nodes=nodes, kinds=kinds, final=final, row=row, col=col, box=box, tbox=tbox, terms=terms,
                retries=retries, x_lane0=x_lane0, width=width, height=total_h, i=i, node_lines=node_lines,
                term_lines=term_lines, main=spine)


def _esc(s):
    return html.escape(s, quote=True)


def render(graph, lang):
    L = layout(graph, lang)
    i, box, tbox, kinds, final = L["i"], L["box"], L["tbox"], L["kinds"], L["final"]
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L["width"]:.0f} {L["height"]:.0f}" '
           f'width="{L["width"]:.0f}" class="wf-diagram" role="group" aria-label="{ARIA[lang]}">',
           '<defs><marker id="wf-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto" '
           'markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="#7D8A87" stroke-width="1.6"/></marker>'
           '<marker id="wf-x" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto" '
           'markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="#C0806F" stroke-width="1.6"/></marker></defs>']
    edges, labels = [], []

    def label_at(x, y, text, anchor="start"):
        for k, line in enumerate(_wrap(text, 26)):
            labels.append(f'<text class="wf-edge-label" x="{x:.0f}" y="{y + k * 13:.0f}" text-anchor="{anchor}">{_esc(line)}</text>')

    def path(d, cls, marker="wf-a"):
        edges.append(f'<g class="wf-edge{(" " + cls) if cls else ""}"><path d="{d}" marker-end="url(#{marker})"/></g>')

    first = L["main"][0] if L["main"] else next(iter(box))
    fx, fy, fw, fh = box[first]
    cx = fx + fw / 2
    out.append(f'<circle class="wf-start" cx="{cx:.0f}" cy="{fy - 26:.0f}" r="6"/>')
    path(f"M{cx:.0f} {fy - 20:.0f}V{fy - 2:.0f}", "")

    lane = 0
    for e in graph["edges"]:
        a, b, text = e["from"], e["to"], e["label"][i]
        if (a, b, text) in tbox:
            ax, ay, aw, ah = box[a]
            tx, ty, tw, th = tbox[(a, b, text)]
            sy, ey = ay + ah / 2, ty + th / 2
            if tx > ax:
                sx, ex, mx = ax + aw, tx - 2, ax + aw + 24
            else:
                sx, ex, mx = ax, tx + tw + 2, ax - 20
            d = f"M{sx:.0f} {sy:.0f}H{mx:.0f}V{ey:.0f}H{ex:.0f}" if abs(sy - ey) > 1 else f"M{sx:.0f} {sy:.0f}H{ex:.0f}"
            path(d, "exit", "wf-x")
            continue
        if a not in box or b not in box:
            continue
        ax, ay, aw, ah = box[a]
        bx, by, bw, bh = box[b]
        ra, rb = L["row"][a], L["row"][b]
        if rb < ra:  # a return to an earlier step runs up its own lane
            lx = L["x_lane0"] + lane * LANE_GAP
            lane += 1
            sx = ax + aw if ax < lx else ax
            d = f"M{sx:.0f} {ay + ah / 2:.0f}H{lx:.0f}V{by + bh / 2:.0f}H{bx - 2:.0f}"
            # the condition of a return is in the step panel and in the tooltip; text in the narrow lane would collide
            edges.append(f'<g class="wf-edge retry"><title>{_esc(text)}</title><path d="{d}" marker-end="url(#wf-a)"/></g>')
            continue
        if ax == bx:  # same column, straight down
            d = f"M{ax + aw / 2:.0f} {ay + ah:.0f}V{by - 2:.0f}"
            path(d, "")
            if rb == ra + 1:
                label_at(ax + aw / 2 + 8, ay + ah + 18, text)
            else:  # a skip along the main path runs down its own lane on the left, like a return
                edges.pop()
                lx = L["x_lane0"] + lane * LANE_GAP
                lane += 1
                edges.append(f'<g class="wf-edge skip"><title>{_esc(text)}</title><path d="M{ax:.0f} {ay + ah / 2 + 6:.0f}H{lx:.0f}V{by + bh / 2 + 6:.0f}H{bx - 2:.0f}" marker-end="url(#wf-a)"/></g>')
            continue
        if L["col"][b] < L["col"][a]:  # into the left column: across, then down
            ex = bx + bw / 2
            d = f"M{ax:.0f} {ay + ah / 2:.0f}H{ex:.0f}V{by - 2:.0f}"
            path(d, "")
            label_at(ex + 8, by - 10, text)
            continue
        # from the left column back to the main path
        if abs((ay + ah / 2) - (by + bh / 2)) < 2:
            d = f"M{ax + aw:.0f} {ay + ah / 2:.0f}H{bx - 2:.0f}"
        else:
            sx = ax + aw / 2
            d = f"M{sx:.0f} {ay + ah:.0f}V{by + bh / 2:.0f}H{bx - 2:.0f}"
        path(d, "")
        label_at(ax + aw / 2 + 8, ay + ah + 18, text)

    nodes = []
    for n, (x, y, w, h) in box.items():
        kind = kinds[n] + (" final" if n == final else "")
        lines = L["node_lines"](n)
        t0 = y + h / 2 - (len(lines) - 1) * LINE / 2 + 4.5
        tx = x + w / 2 + (10 if kinds[n] == "decision" else 0)  # room for the decision mark
        txt = "".join(f'<text class="wf-node-label" x="{tx:.0f}" y="{t0 + k * LINE:.0f}" text-anchor="middle">{_esc(s)}</text>'
                      for k, s in enumerate(lines))
        mark = f'<path class="wf-mark" d="M{x + 14:.0f} {y + h / 2:.0f}l6 -6l6 6l-6 6z"/>' if kinds[n] == "decision" else ""
        nodes.append(f'<g class="wf-node {kind}" data-workflow-node="{_esc(n)}" role="button" tabindex="0" aria-label="{_esc(L["nodes"][n]["label"][i])}">'
                     f'<title>{_esc(L["nodes"][n]["detail"][i])}</title>'
                     f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h:.0f}" rx="8"/>{mark}{txt}</g>')
    for (a, b, text), (x, y, w, h) in tbox.items():
        cond, outc = L["term_lines"]({"label": [text, text], "to": b})
        ty = y + 19
        txt = "".join(f'<text class="wf-term-cond" x="{x + 12:.0f}" y="{ty + k * TERM_LINE:.0f}">{_esc(s)}</text>' for k, s in enumerate(cond))
        ty += TERM_LINE * len(cond)
        txt += "".join(f'<text class="wf-term-out" x="{x + 12:.0f}" y="{ty + k * TERM_LINE:.0f}">{_esc(s)}</text>' for k, s in enumerate(outc))
        nodes.append(f'<g class="wf-node terminal" data-workflow-node="{_esc(b)}" role="button" tabindex="0" '
                     f'aria-label="{_esc(text + " → " + L["nodes"][b]["label"][i])}"><title>{_esc(L["nodes"][b]["detail"][i])}</title>'
                     f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h:.0f}" rx="6"/>{txt}</g>')
    out += edges + nodes + labels + ["</svg>"]
    return "\n".join(out) + "\n"


def render_all(workbench):
    """Add diagrams {ru, en} to every workflow of processes and parts."""
    for group in ("flows", "parts"):
        for graph in workbench["workflows"][group].values():
            graph["diagrams"] = {lang: render(graph, lang) for lang in LANG_INDEX}
