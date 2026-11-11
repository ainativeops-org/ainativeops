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
              "dataobject", "gate", "event", "process", "llm", "node", "appcomp", "techsvc"}
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

    workbench = load_workbench(problems)

    if problems:
        raise ModelFileError("\n".join(problems))
    return {"architecture": arch, "stack": stack, "infrastructure": infra, "scenarios": {"scenarios": scenarios},
            "workbench": workbench}


def load_workbench(problems):
    """Read processes, profiles, dependencies and sources into the 'workbench' part of the model.

      processes/_groups.yaml         process groups in display order
      processes/flows/<id>.yaml      a process on the map; its 'workflow' holds diagram nodes and edges
      processes/parts/<owner>.yaml   stages and variants; a part may hold its own 'workflow'
      profiles.yaml, dependencies/*.yaml, sources/registry.yaml, sources/bindings.yaml
    """
    P = MODEL / "processes"
    flows, flow_wf = {}, {}
    for f in sorted((P / "flows").glob("*.yaml")):
        row = load(f) or {}
        flow_wf[f.stem] = row.pop("workflow", None)
        flows[f.stem] = row
    flows = dict(sorted(flows.items(), key=lambda kv: (kv[1].get("order", 10 ** 6), kv[0])))
    parts, part_wf = {}, {}
    for f in sorted((P / "parts").glob("*.yaml")):
        for pid, row in (load(f) or {}).items():
            owner = pid.split("--")[0] if "--" in pid else "_shared"
            if owner != f.stem:
                problems.append(f"model/processes/parts/{f.name}: part {pid} belongs in {owner}.yaml")
            if pid in parts:
                problems.append(f"model/processes/parts/{f.name}: part {pid} is defined twice")
            wf = row.pop("workflow", None)
            if wf is not None:
                part_wf[pid] = wf
            parts[pid] = row

    dep = MODEL / "dependencies"
    return {
        "processGroups": load(P / "_groups.yaml") or {},
        "sources": load(MODEL / "sources" / "registry.yaml") or {},
        "bindings": load(MODEL / "sources" / "bindings.yaml") or {},
        "profiles": load(MODEL / "profiles.yaml") or {},
        "processMaps": {"flows": flows, "parts": parts},
        "dependencies": {
            "stack": (load(dep / "stack.yaml") or {}).get("dependencies", []),
            "infra": (load(dep / "infrastructure.yaml") or {}).get("dependencies", []),
            "boundaries": load(dep / "boundaries.yaml") or {},
        },
        "workflows": {"flows": {k: v for k, v in flow_wf.items() if v is not None}, "parts": part_wf},
    }


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
            # a route visits each element once; only the last step may bring the answer back to the first
            order = [st[0] for st in steps if st]
            for i, x in enumerate(order):
                if x in order[:i] and not (i == len(order) - 1 and x == order[0] and i > 2):
                    err(f"{where} {view}: step {i + 1} returns to {x!r}; make it a participant of an earlier step")
            for step in steps:
                if len(step) != 2 or not isinstance(step[1], list):
                    err(f"{where} {view}: step must be [element, [participants]]")
                    continue
                for x in [step[0], *step[1]]:
                    if x not in views[view]:
                        err(f"{where} {view}: unknown element {x!r}")
                    elif view == "stack" and x not in active:
                        err(f"{where} {view}: class {x!r} is deprecated")

    # CORE-01: a route that calls a model passes input and output guardrails and leaves an audit record
    for s in m["scenarios"]["scenarios"]:
        used = {x for step in (s.get("routes") or {}).get("stack", []) if len(step) == 2 for x in [step[0], *step[1]]}
        if used & INFERENCE:
            for rm in sorted(GUARDED - used):
                err(f"scenario {s['id']} stack: the route calls a model and must include {rm}")
        # every touch of an agent is metered: a model call, an action, a job run or a knowledge query
        touch = sorted(x for x in used if x in TOUCH or x.startswith("RM-AGT-"))
        if touch and BILLING not in used:
            err(f"scenario {s['id']} stack: the route uses {touch[0]} and must include {BILLING}")

    validate_workbench(m, err, text, views, ids)
    return errors


INFERENCE = {"RM-MOD-03", "RM-MOD-06", "RM-MOD-07"}
GUARDED = {"RM-AIC-01", "RM-AIC-02", "RM-AIC-05", "RM-TRS-04"}
TOUCH = INFERENCE | {"RM-ACT-02", "RM-ACT-03", "RM-DPR-06", "RM-INT-02", "RM-INT-04"}
BILLING = "RM-OPS-06"
SOURCE_TYPES = {"standard", "practice", "example"}
NODE_KINDS = {"step", "decision", "outcome"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_workbench(m, err, text, views, scenario_ids):
    """Processes, profiles, dependencies and sources: references resolve and both languages are present."""
    wb = m["workbench"]
    classes = m["stack"]["classes"]
    sources = wb["sources"]
    pm = wb["processMaps"]
    flows, parts = pm["flows"], pm["parts"]

    def pair(where, v, required=True):
        if v is None:
            if required:
                err(f"{where}: missing")
            return
        if not (isinstance(v, list) and len(v) == 2 and all(isinstance(x, str) and x.strip() for x in v)):
            err(f"{where}: expected a pair [ru, en] of non-empty strings")

    def known_class(where, rm):
        if rm not in classes:
            err(f"{where}: class {rm!r} does not exist")

    def source_ref(where, key):
        if key not in sources:
            err(f"{where}: source {key!r} is not in model/sources/registry.yaml")

    # sources
    for key, s in sources.items():
        where = f"source {key}"
        if s.get("type") not in SOURCE_TYPES:
            err(f"{where}: type must be one of {sorted(SOURCE_TYPES)}")
        title = s.get("title")
        if isinstance(title, dict):
            text(f"{where} title", title)
        elif not (isinstance(title, str) and title.strip()):
            err(f"{where}: title must be a string or {{ru, en}}")
        if not str(s.get("url", "")).startswith("https://"):
            err(f"{where}: url must start with https://")
        text(f"{where} scope", s.get("scope"))
        checked = s.get("checked", "")
        if checked and not DATE.match(str(checked)):
            err(f"{where}: checked must be empty or YYYY-MM-DD")
    # 'platform' is the logical AI platform boundary that site/app.js draws around its zones
    used = {k for rows in wb["bindings"].values() for keys in rows.values() for k in keys}
    used |= {k for view in ("stack", "infra") for d in wb["dependencies"][view] for k in d.get("sources", [])}
    used |= {b.get("source") for g in ("flows", "parts") for wf in wb["workflows"][g].values() for b in wf.get("basis", [])}
    for key in sources:
        if key not in used:
            err(f"source {key}: no element, dependency or workflow refers to it")
    element_sets = {"stack": classes, "meta": views["architecture"], "infra": views["infrastructure"],
                    "zones": {**{z["id"]: z for z in m["infrastructure"]["zones"]}, "platform": {}}}
    for view, rows in wb["bindings"].items():
        if view not in element_sets:
            err(f"bindings: unknown view {view!r}")
            continue
        for el, keys in rows.items():
            if el not in element_sets[view]:
                err(f"bindings {view}: unknown element {el!r}")
            for key in keys:
                source_ref(f"bindings {view} {el}", key)
    for view in ("stack", "meta", "infra"):
        unbound = [e for e in element_sets[view] if e not in wb["bindings"].get(view, {})]
        if unbound:
            err(f"bindings {view}: elements without a source: {', '.join(unbound[:8])}{' …' if len(unbound) > 8 else ''}")

    groups = wb["processGroups"]
    for code, name in groups.items():
        pair(f"process group {code} name", name)
        if not any(f.get("group") == code for f in flows.values()):
            err(f"process group {code}: no process on the map uses it")

    def workflow(where, wf):
        nodes = {}
        for n in wf.get("nodes", []):
            if n["id"] in nodes:
                err(f"{where} workflow: node {n['id']} is defined twice")
            nodes[n["id"]] = n
            if n.get("kind") not in NODE_KINDS:
                err(f"{where} workflow node {n['id']}: kind must be one of {sorted(NODE_KINDS)}")
            pair(f"{where} workflow node {n['id']} label", n.get("label"))
            pair(f"{where} workflow node {n['id']} detail", n.get("detail"))
            for view, ids in (n.get("components") or {}).items():
                if view not in views:
                    err(f"{where} workflow node {n['id']}: unknown view {view!r}")
                    continue
                for x in ids:
                    if x not in views[view]:
                        err(f"{where} workflow node {n['id']} {view}: unknown element {x!r}")
        exits = {}
        for e in wf.get("edges", []):
            for x in (e.get("from"), e.get("to")):
                if x not in nodes:
                    err(f"{where} workflow edge {e.get('from')} -> {e.get('to')}: unknown node {x!r}")
            pair(f"{where} workflow edge {e.get('from')} -> {e.get('to')} label", e.get("label"))
            exits[e.get("from")] = exits.get(e.get("from"), 0) + 1
        # a step continues and may also leave on a failure; a decision branches; an outcome ends the process
        for nid, n in nodes.items():
            count = exits.get(nid, 0)
            if n.get("kind") == "step" and count < 1:
                err(f"{where} workflow node {nid}: a step needs at least one exit")
            if n.get("kind") == "decision" and count < 2:
                err(f"{where} workflow node {nid}: a decision needs at least two exits")
            if n.get("kind") == "outcome" and count:
                err(f"{where} workflow node {nid}: an outcome has no exits")
        for x in wf.get("main", []):
            if x not in nodes:
                err(f"{where} workflow main: unknown node {x!r}")
        for f in ("summary", "synthesis"):
            pair(f"{where} workflow {f}", wf.get(f))
        for b in wf.get("basis", []):
            source_ref(f"{where} workflow basis", b.get("source"))
            pair(f"{where} workflow basis {b.get('source')} claim", b.get("claim"))
        return nodes

    def route_refs(where, row):
        if row.get("path") and row["path"] not in scenario_ids:
            err(f"{where}: path {row['path']!r} is not a scenario in model/scenarios")
        for key, sid in (row.get("paths") or {}).items():
            if sid not in scenario_ids:
                err(f"{where}: paths.{key} {sid!r} is not a scenario in model/scenarios")
        if row.get("option") and row["option"] not in wb["profiles"].get("options", {}):
            err(f"{where}: option {row['option']!r} is not in profiles.yaml options")

    flow_nodes = {}
    for fid, f in flows.items():
        where = f"process map {fid}"
        text(f"{where} name", f.get("name"))
        if f.get("group") not in groups:
            err(f"{where}: group {f.get('group')!r} is not in model/processes/_groups.yaml")
        for f_ in ("owner", "start", "result", "check"):
            pair(f"{where} {f_}", f.get(f_))
        for pid in f.get("parts", []):
            if pid not in parts:
                err(f"{where}: part {pid!r} does not exist")
        for c in f.get("calls", []):
            if c.get("id") not in flows:
                err(f"{where}: calls unknown process {c.get('id')!r}")
            pair(f"{where} call {c.get('id')} when", c.get("when"))
        route_refs(where, f)
        wf = wb["workflows"]["flows"].get(fid)
        flow_nodes[fid] = workflow(where, wf) if wf else {}
    for pid, p in parts.items():
        where = f"process part {pid}"
        text(f"{where} name", p.get("name"))
        pair(f"{where} description", p.get("description"))
        for rm in p.get("classes", []):
            known_class(where, rm)
        for x in p.get("architectureSteps", []):
            if x not in views["architecture"]:
                err(f"{where}: unknown architecture element {x!r}")
        owner = pid.split("--")[0] if "--" in pid else None
        if p.get("workflowNode") and owner in flow_nodes and p["workflowNode"] not in flow_nodes[owner]:
            err(f"{where}: workflowNode {p['workflowNode']!r} is not a node of {owner}")
        for f_ in ("start", "result", "check"):
            pair(f"{where} {f_}", p.get(f_), required=False)
        if not any(pid in f.get("parts", []) for f in flows.values()):
            err(f"{where}: no process uses this part")
        route_refs(where, p)
        if pid in wb["workflows"]["parts"]:
            workflow(where, wb["workflows"]["parts"][pid])

    # profiles
    prof = wb["profiles"]
    options = prof.get("options", {})
    for key, o in options.items():
        pair(f"profile option {key} name", o.get("name"))
        for value, label in (o.get("values") or {}).items():
            pair(f"profile option {key} value {value}", label)
        if not any(r.get("option") == key for r in [*flows.values(), *parts.values()]):
            err(f"profile option {key}: no process uses it")
    for key, value in prof.get("defaults", {}).items():
        if key not in options or value not in options[key].get("values", {}):
            err(f"profiles defaults: {key}={value!r} is not a declared option value")

    # dependencies
    for view, els in (("stack", classes), ("infra", views["infrastructure"])):
        for d in wb["dependencies"][view]:
            where = f"dependency {view} {d.get('from')} -> {d.get('to')}"
            for x in (d.get("from"), d.get("to")):
                if x not in els:
                    err(f"{where}: unknown element {x!r}")
            for f in ("when", "phase", "reason"):
                pair(f"{where} {f}", d.get(f))
            for key in d.get("sources", []):
                source_ref(where, key)
        for el, why in wb["dependencies"]["boundaries"].get(view, {}).items():
            if el not in els:
                err(f"dependency boundary {view}: unknown element {el!r}")
            pair(f"dependency boundary {view} {el}", why)


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
    wb = m["workbench"]
    print(f"model OK: {len(st)} classes, {len(m['infrastructure']['elements'])} infrastructure elements, "
          f"{len(m['architecture']['elements'])} architecture elements, {len(m['scenarios']['scenarios'])} routes, "
          f"{len(wb['processMaps']['flows'])} processes, {len(wb['processMaps']['parts'])} process parts, "
          f"{len(wb['sources'])} sources")
    return 0


if __name__ == "__main__":
    sys.exit(main())
