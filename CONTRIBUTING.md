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
| `model/scenarios/<id>.yaml` | one scenario: order, name, routes per view | file name |

### Rules for a change

- **Both languages.** Every `name` and `desc` has `ru` and `en`. If you write only one, say so in the pull request and a steward adds the other.
- **No vendors in class names.** A class names a function, for example `LLM Gateway`. Products go to a pull request discussion or an example, never into the class name. Kubernetes, Jupyter and OpenTelemetry are accepted as industry standards.
- **One term per concept.** If a description mentions another class, use that class's name.
- **New class.** Add it at the end of its layer file with the next free number. The CI check rejects a key whose prefix differs from the rest of the layer.
- **Removing a class.** Set `status: deprecated` and `replacedBy: RM-…`. Never delete a released key and never reuse it.
- **Infrastructure element.** Give `class: RM-…`. Add `name` and `desc` only when the element differs from its class, for example `Package mirror` implements `Artifact Registry`.
- **Relations** have the type `flow`, `serving`, `triggering` or `access`.

### Writing style

Each sentence states a fact, a decision or a condition. The subject acts and the verb names the action: write "The PEP blocks the call", avoid "blocking of the call is performed". Keep a description to two or three sentences with a concrete detail such as a number, a name or a limit.

## Licensing of contributions

By contributing you agree that your contribution to `model/` is licensed under CC BY 4.0 and your contribution to `site/` and `tools/` under MIT. Sign off your commits (`git commit -s`) to certify the [Developer Certificate of Origin](https://developercertificate.org/).

## Conduct

All participants follow the [Code of Conduct](CODE_OF_CONDUCT.md).
