# AiNativeOps

**Community Interest Project** · open reference model · **alpha 0.2** · [Русская версия](README.ru.md)

AiNativeOps is an open reference model of operations in which AI agents create, change and verify the target system across its life cycle, from data and models to code and release. A control loop takes the release decision. Deterministic checks, an AI controller and an accountable human act in it at control gates G0–G9. Every AI that creates or evaluates the system is in scope of analysis.

The model describes service classes, their typical placement across environments and the processes they take part in. Every element of the map has sources: standards, published practice and implementation examples. Class names name functions, so a class such as `RM-ACT-02 Policy enforcement point (PEP)` can be implemented by any product.

> Status: **alpha, version 0.2** ([release notes](docs/releases/v0.2.0-alpha.md#english)). The composition of classes, their names and identifiers can change in any release before 1.0. Do not build compliance documents or contracts on RM keys of an alpha version. Comments and proposals are welcome.

## The map

**[ainativeops.org](https://ainativeops.org)** · the interactive map is one HTML file with three views.

| View | What it shows | Size |
|---|---|---|
| Architecture | The meta-pipeline by level: business, methodology, Ops (DataOps, MLOps, DevOps, SecOps) and technology. Control gates G0–G9 link methodology to the pipelines. | 91 elements |
| Infrastructure | Typical placement of service classes in zones: external, perimeter, AI Safety Core, EXP / EVAL / PROD, data platform, CI/CD, observability, trusted services. | 87 elements, 106 relations, 94 dependencies |
| Platform stack | Service classes by layer from 01 · Hardware to 07 · Products, with CI/CD, observability, cybersecurity and AI Safety Core columns. | 106 classes, 130 dependencies |

Twenty processes trace a route through the views, for example *Protected Employee AI Assistance* (`INF-01`) or *AI Security Incident Response* (`FLOW-INCIDENT`). A process card shows its workflow with decisions and outcomes; a step opens its description and components. An element card lists its sources, standards first and implementation examples last.

The map runs in Russian and English, has search by name or RM identifier, a minimap and a step-through mode. A link keeps the view, language, process and placement: `?view=stack&lang=en&mapProcess=INF-01&mapVariant=external`.

## Core ideas

- **AI engineer and AI controller.** One AI builds the system, another AI evaluates it. The controller's assessment is evidence for a gate, and a protected rule mechanism takes the decision.
- **Recursive closure rule.** Every AI that creates, changes or evaluates the system is in scope. The question is repeated for every added component until the set stops changing.
- **Trust anchor.** A verifiable mechanism protected from modification by whatever it constrains. It ends the recursion of "who checks the checker".
- **AI Safety Core.** The class group that enforces control: execution protection (PDP / PEP), inference protection (guardrails), data protection, confidential computing and trusted services.
- **Stable identifiers.** Each class has a key such as `RM-AGT-04`. After release 1.0 a key never changes and is never reused.

## Repository layout

```
model/
  stack/
    _layers.yaml          layer order, placement on the map, colour categories
    hardware.yaml …       one file per layer; the classes of the layer in drawing order
  infrastructure/
    zones.yaml            zones and the rows of elements in them
    elements.yaml         elements; an element with class: and no text takes the class text
    relations.yaml        [from, to, type]
  architecture/
    _layout.yaml          levels, groups with coordinates, flows
    business.yaml …       one file per level
  scenarios/
    process-inf-01-local.yaml …   one route per file: order, name, steps in every view
  processes/
    _groups.yaml          process groups in display order
    flows/INF-01.yaml …   a process: owner, trigger, result, parts, routes, workflow nodes and edges
    parts/INF-01.yaml …   stages and variants of a process; _shared.yaml for reused parts
  dependencies/           dependencies between classes and between infrastructure elements
  sources/
    registry.yaml         sources: type, title, url, section, scope, date of the last check
    bindings.yaml         sources of every element and zone
  profiles.yaml           options that select the route of a process, for example model placement
site/                     map template, styles and code (layout, line routing, processes, cards)
tools/
  validate.py             model checks used by CI
  build.py                builds dist/index.html
  build_versions.py       builds earlier releases from their tags into dist/<folder>/
  workflows.py            lays out and draws workflow diagrams as SVG
  check_layout.py         headless browser check: lines, process routes, English text
backlog/                  material for 0.3 that the map does not use yet; not built
project.yaml              version, license, repository URL
```

One file per layer lets `.github/CODEOWNERS` assign a steward to each layer, and two pull requests to different layers never touch the same file.

Every name and description is stored in both languages. Classes and elements use `{ru, en}`; process texts use a pair `[ru, en]`. Example from `model/stack/operation-admission.yaml`:

```yaml
RM-ACT-02:
  name:
    ru: Точка исполнения политики (PEP)
    en: Policy enforcement point (PEP)
  desc:
    ru: Принудительно проверяет точный вызов до исполнения…
    en: Checks the exact call before execution…
```

## Build locally

The build needs Python 3.10+.

```bash
pip install -r requirements.txt
python tools/validate.py
python tools/build.py          # writes dist/index.html
```

Open `dist/index.html` in a browser. With Playwright installed, the build also embeds the line geometry, and the layout check runs:

```bash
pip install playwright && python -m playwright install chromium
python tools/build.py
python tools/check_layout.py
```

Without Playwright the map works the same and routes its lines in the browser; `python tools/build.py --no-routes` skips the geometry step on purpose.

## Contributing

The quickest way is the **Propose a change** button in the map's element panel. It opens an issue form with the element and its current text filled in. Engineers can edit the YAML directly and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) and [GOVERNANCE.md](GOVERNANCE.md).

## License

- Model content (`model/`, texts and diagrams): [CC BY 4.0](LICENSE-MODEL.md).
- Code (`site/`, `tools/`): [MIT](LICENSE).

Cite the model with [CITATION.cff](CITATION.cff).
