# AiNativeOps

**Community Interest Project** · open reference model · **alpha 0.1** · [Русская версия](README.ru.md)

AiNativeOps is an open reference model of operations in which AI agents create, change and verify the target system across its life cycle, from data and models to code and release. A control loop takes the release decision. Deterministic checks, an AI controller and an accountable human act in it at control gates G0–G9. Every AI that creates or evaluates the system is in scope of analysis.

The model describes service classes, their typical placement across environments and the scenarios they take part in. It names no vendors. A class such as `RM-ACT-02 Policy Enforcement · PEP` can be implemented by any product.

> Status: **alpha, version 0.1.** The composition of classes, their names and identifiers can change in any release before 1.0. Do not build compliance documents or contracts on RM keys of an alpha version. Comments and proposals are welcome.

## The map

**[ainativeops.org](https://ainativeops.org)** · the interactive map is one HTML file with three views.

| View | What it shows | Size |
|---|---|---|
| Architecture | The meta-pipeline by level: business, methodology, Ops (DataOps, MLOps, DevOps, SecOps) and technology. Control gates G0–G9 link methodology to the pipelines. | 80 elements |
| Infrastructure | Typical placement of service classes in zones: external, perimeter, AI Safety Core, EXP / EVAL / PROD, data platform, CI/CD, observability, trusted services. | 67 elements, 77 relations |
| Platform stack | Service classes by layer from 01 · Hardware to 07 · Products, with CI/CD, observability, cybersecurity and AI Safety Core columns. | 99 classes |

Seven scenarios trace a route through the views, for example *IT product with agents* or *Incident response*. The map runs in Russian and English, has search by name or RM identifier, a minimap and a step-through mode. A link keeps the view, language and scenario: `?view=stack&scenario=agent&lang=en`.

## Core ideas

- **AI engineer and AI controller.** One AI builds the system, another AI evaluates it. The controller's assessment is evidence for a gate, and a protected rule mechanism takes the decision.
- **Recursive closure rule.** Every AI that creates, changes or evaluates the system is in scope. The question is repeated for every added component until the set stops changing.
- **Trust anchor.** A verifiable mechanism protected from modification by whatever it constrains. It ends the recursion of "who checks the checker".
- **AI Safety Core.** The class group that enforces control: operation admission (PDP / PEP), guardrails, data protection, confidential computing and trusted services.
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
    data.yaml …           one file per scenario: order, name, routes in every view
site/                     map template, styles and code (layout, edge routing, UI)
tools/
  validate.py             model checks used by CI
  build.py                builds dist/index.html
  check_layout.py         headless browser check: no edge crosses a block
project.yaml              version, license, repository URL
```

One file per layer lets `.github/CODEOWNERS` assign a steward to each layer, and two pull requests to different layers never touch the same file.

Every name and description is stored in both languages. Example from `model/stack/operation-admission.yaml`:

```yaml
RM-ACT-02:
  name:
    ru: Policy Enforcement · PEP
    en: Policy Enforcement · PEP
  desc:
    ru: Принудительно проверяет точный вызов до исполнения…
    en: Checks the exact call before execution…
```

## Build locally

```bash
pip install -r requirements.txt
python tools/validate.py
python tools/build.py          # writes dist/index.html
```

Open `dist/index.html` in a browser. The layout check needs Playwright:

```bash
pip install playwright && python -m playwright install chromium
python tools/check_layout.py
```

## Contributing

The quickest way is the **Propose a change** button in the map's element panel. It opens an issue form with the element and its current text filled in. Engineers can edit the YAML directly and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) and [GOVERNANCE.md](GOVERNANCE.md).

## License

- Model content (`model/`, texts and diagrams): [CC BY 4.0](LICENSE-MODEL.md).
- Code (`site/`, `tools/`): [MIT](LICENSE).

Cite the model with [CITATION.cff](CITATION.cff).
