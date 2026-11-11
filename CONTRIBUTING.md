# Contributing to AiNativeOps

[Русская версия](CONTRIBUTING.ru.md)

AiNativeOps is a Community Interest Project. A change enters the model after a steward of the affected layer reviews it. There are two ways to propose one.

## 1. From the map, without Git

1. Open the element in the map and press **Propose a change**.
2. GitHub opens an issue form with the element, its view and its current text filled in.
3. Describe the change and why it is needed. Name a source or a practical case if you have one.

A steward answers in the issue. When the proposal is accepted, a maintainer or you turn it into a pull request.

## 2. Pull request with a YAML change

1. Fork the repository and edit files in `model/`. A layer's classes live in `model/stack/<layer>.yaml`.
2. Run the checks:
   ```bash
   pip install -r requirements.txt
   python tools/validate.py
   python tools/build.py
   ```
3. Open a pull request. CI repeats the checks, renders the map in a browser and attaches the built page as an artifact.

### What the model files hold

| Path | Holds | Key |
|---|---|---|
| `model/stack/<layer>.yaml` | service classes of one layer; `_layers.yaml` holds layer order and colours | `RM-ABC-01` |
| `model/infrastructure/` | `zones.yaml` with element rows, `elements.yaml`, `relations.yaml` | lowercase slug |
| `model/architecture/` | `_layout.yaml` with levels, groups and flows; a file per level with its elements | short id, gates `g0`–`g9` |
| `model/scenarios/<id>.yaml` | one route: order, name, steps per view | file name |
| `model/processes/flows/<id>.yaml` | a process: owner, trigger, result, check, parts, routes, workflow nodes and edges | `INF-01`, `FLOW-IT` |
| `model/processes/parts/<process>.yaml` | stages of a process; `_shared.yaml` holds parts used by several processes | `INF-01--INPUT` |
| `model/sources/registry.yaml`, `bindings.yaml` | sources and the sources of every element | `NIST-C`, `DEP-KSR` |
| `model/dependencies/` | dependencies between classes and between infrastructure elements | `[from, to]` |

### Rules for a change

- **Both languages.** Every `name` and `desc` has `ru` and `en`. If you write only one, say so in the pull request and a steward adds the other.
- **No vendors in class names.** A class names a function, for example `LLM Gateway`. Products go to a pull request discussion or an example, never into the class name. Kubernetes, Jupyter and OpenTelemetry are accepted as industry standards.
- **One term per concept.** If a description mentions another class, use that class's name.
- **New class.** Add it at the end of its layer file with the next free number. The CI check rejects a key whose prefix differs from the rest of the layer.
- **Removing a class.** Set `status: deprecated` and `replacedBy: RM-…`. Never delete a released key and never reuse it.
- **Infrastructure element.** Give `class: RM-…`. Add `name` and `desc` only when the element differs from its class, for example `Package mirror` implements `Artifact Registry`.
- **Relations** have the type `flow`, `serving`, `triggering` or `access`.
- **Process texts** are pairs `[ru, en]`. A workflow node has a `kind` (`step`, `decision` or `outcome`), a label, a detail and the components it uses in each view. A step continues to the next node and may also leave on a failure; a decision has at least two exits; an outcome has none. The build draws the diagram; do not add SVG.
- **Routes.** A route that calls a model (`RM-MOD-03`, `RM-MOD-06` or `RM-MOD-07`) includes `RM-AIC-01`, `RM-AIC-02`, `RM-AIC-05` and `RM-TRS-04`. A route where an agent or a model takes part includes usage metering `RM-OPS-06`. A route visits each element once: a store, a quota or an audit record that a step reads or writes is a participant of that step. Only the last step may return to the first, when the answer goes back to the consumer.
- **Nothing unused.** The validator rejects a source, a process part, a group or a profile option that nothing refers to. Material for a later version goes to `backlog/`.
- **Sources.** A source has a `type`: `standard` for a standard or specification, `practice` for published practice, `example` for documentation of a product. The title is the publisher's title; add `{ru, en}` only when you translate it. Give the exact `section` the claim relies on and write in `scope` what the source supports and what it does not. Every element of the map needs at least one source.
- **Verifying a source.** A maintainer who opened the link and found the section sets `checked: YYYY-MM-DD`.

### Writing style

Each sentence states a fact, a decision or a condition. The subject acts and the verb names the action: write "The PEP blocks the call", avoid "blocking of the call is performed". Keep a description to two or three sentences with a concrete detail such as a number, a name or a limit.

## Licensing of contributions

By contributing you agree that your contribution to `model/` is licensed under CC BY 4.0 and your contribution to `site/` and `tools/` under MIT. Sign off your commits (`git commit -s`) to certify the [Developer Certificate of Origin](https://developercertificate.org/).

## Conduct

All participants follow the [Code of Conduct](CODE_OF_CONDUCT.md).
