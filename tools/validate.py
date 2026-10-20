#!/usr/bin/env python3
"""Validate the AiNativeOps model in model/.

Usage: python tools/validate.py
Exit code 1 when the model has errors. The checks keep identifiers stable and
references consistent, so a pull request cannot break the map silently.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "model"
LANGS = ("ru", "en")

ARCH_TYPES = {"goal", "assessment", "requirement", "constraint", "representation", "principle", "role",
              "dataobject", "gate", "event", "process", "llm", "node"}
INFRA_TYPES = {"node", "device", "actor", "appcomp", "syssw", "techsvc", "artifact"}
RELATIONS = {"flow", "serving", "triggering", "access"}
PLACEMENTS = {"top", "left", "column", "core"}
# zones the infrastructure layout positions explicitly (site/app.js, infraView)
INFRA_ZONES = {"corp", "ext", "dmz", "ai-safety-core", "data-protection", "guardrails", "operation-admission",
               "agents", "exp", "eval", "prod", "data-platform", "ci-cd", "observability", "trusted-services"}
RM_KEY = re.compile(r"^RM-[A-Z]{2,3}-\d{2}$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class UniqueKeyLoader(yaml.SafeLoader):
    """SafeLoader that rejects duplicate keys instead of silently keeping the last one."""


def _construct_mapping(loader, node, deep=False):
    seen = set()
    for key_node, _ in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in seen:
            raise yaml.constructor.ConstructorError(None, None, f"duplicate key {key!r}", key_node.start_mark)
        seen.add(key)
    return loader.construct_mapping(node, deep)


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)


def load(path):
    with open(path, encoding="utf-8") as f:
        return yaml.load(f, Loader=UniqueKeyLoader)


class ModelFileError(Exception):
    pass


def load_model():
    """Read model/ into one structure: {architecture, stack, infrastructure, scenarios}.

    Layout of model/:
      stack/_layers.yaml + stack/<layer id>.yaml          classes of a layer, in drawing order
      infrastructure/zones.yaml, elements.yaml, relations.yaml
      architecture/_layout.yaml + architecture/<file>.yaml elements of a level
      scenarios/<scenario id>.yaml
    """
    problems = []

    # stack: one file per layer; the layer of a class is the file it lives in
    stack = load(MODEL / "stack" / "_layers.yaml")
    stack["classes"] = {}
    seen_files = {"_layers.yaml"}
    for layer in stack["layers"]:
        f = MODEL / "stack" / f"{layer['id']}.yaml"
        seen_files.add(f.name)
        if not f.exists():
            problems.append(f"model/stack/{f.name}: missing file for layer {layer['id']}")
            continue
        for key, c in (load(f) or {}).items():
            if key in stack["classes"]:
                problems.append(f"model/stack/{f.name}: class {key} is also defined in model/stack/{stack['classes'][key]['layer']}.yaml")
                continue
            stack["classes"][key] = {"layer": layer["id"], **c}
    for f in (MODEL / "stack").glob("*.yaml"):
        if f.name not in seen_files:
            problems.append(f"model/stack/{f.name}: no layer with id '{f.stem}' in _layers.yaml")

    infra = load(MODEL / "infrastructure" / "zones.yaml")
    infra["elements"] = load(MODEL / "infrastructure" / "elements.yaml") or {}
    infra["relations"] = (load(MODEL / "infrastructure" / "relations.yaml") or {}).get("relations", [])

    # architecture: one file per level; an element must sit in a group of its own level
    arch = load(MODEL / "architecture" / "_layout.yaml")
    arch["elements"] = {}
    group_layer = {e: g["layer"] for g in arch["groups"] for e in g["items"]}
    seen_files = {"_layout.yaml"}
    for level in arch["layers"]:
        f = MODEL / "architecture" / f"{level['file']}.yaml"
        seen_files.add(f.name)
        if not f.exists():
            problems.append(f"model/architecture/{f.name}: missing file for level {level['id']}")
            continue
        for key, e in (load(f) or {}).items():
            if key in arch["elements"]:
                problems.append(f"model/architecture/{f.name}: element {key} is defined twice")
            if key in group_layer and group_layer[key] != level["id"]:
                problems.append(f"model/architecture/{f.name}: element {key} sits in a group of level {group_layer[key]}")
            arch["elements"][key] = e
    for f in (MODEL / "architecture").glob("*.yaml"):
        if f.name not in seen_files:
            problems.append(f"model/architecture/{f.name}: no level refers to this file")

    # scenarios: one file per scenario, sorted by 'order'
    scenarios = []
    for f in sorted((MODEL / "scenarios").glob("*.yaml")):
        s = load(f) or {}
        scenarios.append({"id": f.stem, **s})
    orders = [s.get("order") for s in scenarios]
    if len(set(orders)) != len(orders) or not all(isinstance(o, int) for o in orders):
        problems.append("model/scenarios: every scenario needs a unique integer 'order'")
    scenarios.sort(key=lambda s: (s.get("order") if isinstance(s.get("order"), int) else 10 ** 6, s["id"]))
    for s in scenarios:
        s.pop("order", None)

    if problems:
        raise ModelFileError("\n".join(problems))
    return {"architecture": arch, "stack": stack, "infrastructure": infra, "scenarios": {"scenarios": scenarios}}


def validate(m):
    errors = []
    err = errors.append

    def text(where, value, required=True):
        if value is None:
            if required:
                err(f"{where}: missing")
            return
        if not isinstance(value, dict):
            err(f"{where}: expected {{ru, en}}")
            return
        for lang in LANGS:
            if not str(value.get(lang, "")).strip():
                err(f"{where}: missing '{lang}' text")

    # ---------------------------------------------------------------- stack
    st = m["stack"]
    layers = {l["id"]: l for l in st["layers"]}
    for l in st["layers"]:
        text(f"stack layer {l['id']} title", l.get("title"))
        if l.get("placement") not in PLACEMENTS:
            err(f"stack layer {l['id']}: placement must be one of {sorted(PLACEMENTS)}")
        if l.get("category") not in st["categories"]:
            err(f"stack layer {l['id']}: unknown category {l.get('category')!r}")
    if sum(1 for l in st["layers"] if l.get("placement") == "top") > 1:
        err("stack: only one layer can have placement 'top'")
    classes = st["classes"]
    prefix_of_layer = {}
    for key, c in classes.items():
        where = f"stack class {key}"
        if not RM_KEY.match(key):
            err(f"{where}: key must look like RM-ABC-01")
        if c.get("layer") not in layers:
            err(f"{where}: unknown layer {c.get('layer')!r}")
            continue
        text(f"{where} name", c.get("name"))
        text(f"{where} desc", c.get("desc"))
        prefix = key.rsplit("-", 1)[0]
        prefix_of_layer.setdefault(c["layer"], prefix)
        if prefix_of_layer[c["layer"]] != prefix:
            err(f"{where}: prefix differs from other classes of layer {c['layer']} ({prefix_of_layer[c['layer']]})")
        if c.get("status", "active") not in ("active", "deprecated"):
            err(f"{where}: status must be 'active' or 'deprecated'")
        if c.get("status") == "deprecated" and c.get("replacedBy") and c["replacedBy"] not in classes:
            err(f"{where}: replacedBy {c['replacedBy']!r} does not exist")
    for lid in layers:
        if not any(c.get("layer") == lid for c in classes.values()):
            err(f"stack layer {lid}: has no classes")
    active = {k for k, c in classes.items() if c.get("status", "active") == "active"}

    # ---------------------------------------------------------------- infrastructure
    inf = m["infrastructure"]
    zones = {z["id"]: z for z in inf["zones"]}
    if set(zones) != INFRA_ZONES:
        err(f"infrastructure zones must be exactly {sorted(INFRA_ZONES)}; extra {sorted(set(zones) - INFRA_ZONES)}, missing {sorted(INFRA_ZONES - set(zones))}")
    for z in inf["zones"]:
        text(f"infrastructure zone {z['id']} title", z.get("title"))
        if z.get("category") not in inf["categories"]:
            err(f"infrastructure zone {z['id']}: unknown category {z.get('category')!r}")
    elements = inf["elements"]
    placed = {}
    for z in inf["zones"]:
        for row in z.get("rows", []):
            for e in row:
                if e in placed:
                    err(f"infrastructure element {e}: placed in both {placed[e]} and {z['id']}")
                placed[e] = z["id"]
    for key, e in elements.items():
        where = f"infrastructure element {key}"
        if not SLUG.match(key):
            err(f"{where}: key must be a lowercase slug")
        if e.get("type") not in INFRA_TYPES:
            err(f"{where}: type must be one of {sorted(INFRA_TYPES)}")
        if "class" in e:
            if e["class"] not in classes:
                err(f"{where}: class {e['class']!r} does not exist")
            elif e["class"] not in active:
                err(f"{where}: class {e['class']!r} is deprecated")
            text(f"{where} name", e.get("name"), required=False)
            text(f"{where} desc", e.get("desc"), required=False)
            if ("name" in e) != ("desc" in e):
                err(f"{where}: give both name and desc or neither (then the class text is used)")
        else:
            text(f"{where} name", e.get("name"))
            text(f"{where} desc", e.get("desc"))
        if key not in placed:
            err(f"{where}: not placed in any zone row")
        if "category" in e and e["category"] not in inf["categories"]:
            err(f"{where}: unknown category {e['category']!r}")
    for e in placed:
        if e not in elements:
            err(f"infrastructure zone {placed[e]}: row references unknown element {e!r}")
    seen_rel = set()
    for i, r in enumerate(inf["relations"]):
        if len(r) != 3:
            err(f"infrastructure relation #{i + 1}: expected [from, to, type]")
            continue
        a, b, kind = r
        for x in (a, b):
            if x not in elements:
                err(f"infrastructure relation {a} -> {b}: unknown element {x!r}")
        if kind not in RELATIONS:
            err(f"infrastructure relation {a} -> {b}: type must be one of {sorted(RELATIONS)}")
        if (a, b) in seen_rel:
            err(f"infrastructure relation {a} -> {b}: duplicate")
        seen_rel.add((a, b))

    # ---------------------------------------------------------------- architecture
    ar = m["architecture"]
    alayers = {l["id"] for l in ar["layers"]}
    for l in ar["layers"]:
        text(f"architecture layer {l['id']} title", l.get("title"))
    aels = ar["elements"]
    in_group = {}
    for g in ar["groups"]:
        text(f"architecture group {g['id']} title", g.get("title"))
        if g.get("layer") not in alayers:
            err(f"architecture group {g['id']}: unknown layer {g.get('layer')!r}")
        for e in g["items"]:
            if e not in aels:
                err(f"architecture group {g['id']}: unknown element {e!r}")
            if e in in_group:
                err(f"architecture element {e}: in groups {in_group[e]} and {g['id']}")
            in_group[e] = g["id"]
    for key, e in aels.items():
        where = f"architecture element {key}"
        if e.get("type") not in ARCH_TYPES:
            err(f"{where}: type must be one of {sorted(ARCH_TYPES)}")
        text(f"{where} name", e.get("name"))
        text(f"{where} desc", e.get("desc"))
        if "class" in e and e["class"] not in classes:
            err(f"{where}: class {e['class']!r} does not exist")
        if key not in in_group:
            err(f"{where}: not in any group")
    for i in range(10):
        if f"g{i}" not in aels or aels[f"g{i}"].get("type") != "gate":
            err(f"architecture: gate g{i} is missing")
    for a, b in ar["flows"]:
        for x in (a, b):
            if x not in aels:
                err(f"architecture flow {a} -> {b}: unknown element {x!r}")

    # ---------------------------------------------------------------- scenarios
    ids = set()
    views = {"architecture": aels, "infrastructure": elements, "stack": classes}
    for s in m["scenarios"]["scenarios"]:
        where = f"scenario {s.get('id')}"
        if s["id"] in ids:
            err(f"{where}: duplicate id")
        ids.add(s["id"])
        text(f"{where} name", s.get("name"))
        if not s.get("routes"):
            err(f"{where}: no routes")
        for view, steps in (s.get("routes") or {}).items():
            if view not in views:
                err(f"{where}: unknown view {view!r}")
                continue
            if not steps:
                err(f"{where} {view}: empty route")
            for step in steps:
                if len(step) != 2 or not isinstance(step[1], list):
                    err(f"{where} {view}: step must be [element, [participants]]")
                    continue
                for x in [step[0], *step[1]]:
                    if x not in views[view]:
                        err(f"{where} {view}: unknown element {x!r}")
                    elif view == "stack" and x not in active:
                        err(f"{where} {view}: class {x!r} is deprecated")
    return errors


def main():
    try:
        m = load_model()
    except yaml.YAMLError as e:
        print(f"YAML error: {e}", file=sys.stderr)
        return 1
    except ModelFileError as e:
        for line in str(e).splitlines():
            print(f"error: {line}", file=sys.stderr)
        return 1
    errors = validate(m)
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    if errors:
        print(f"\n{len(errors)} error(s)", file=sys.stderr)
        return 1
    st = m["stack"]["classes"]
    print(f"model OK: {len(st)} classes, {len(m['infrastructure']['elements'])} infrastructure elements, "
          f"{len(m['architecture']['elements'])} architecture elements, {len(m['scenarios']['scenarios'])} scenarios")
    return 0


if __name__ == "__main__":
    sys.exit(main())
