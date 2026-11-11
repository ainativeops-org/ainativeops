# Changelog

The project follows [semantic versioning](https://semver.org/). Versions 0.x are alpha and beta: classes and identifiers may change in any release before 1.0.

## 0.2.0-alpha — processes and sources

Model
- 20 processes on the map. Each has a workflow with steps, decisions and outcomes, and a route in all three views; with local and external placement variants the map holds 38 routes.
- 156 stages and variants of processes in 10 groups. A process that calls a model has a route for the model inside the boundary and a route for an external API.
- Every route that calls a model includes input guardrails, output guardrails, the quota check and the audit log; the validator enforces it.
- 224 dependencies: 130 between stack classes and 94 between infrastructure elements, each with a condition, a phase, a reason and sources.
- 106 classes. New: `RM-AIC-05` Quotas and abuse protection, `RM-MOD-12` Request classifier, `RM-MOD-13` Model call planner, `RM-MOD-11` Inference runtime, `RM-DAT-10` Multimodal data extraction, `RM-DEV-11` Distributed training runtime, `RM-DEV-12` Training checkpoint store. Russian class names are now Russian terms.
- AI Safety Core groups are renamed: Execution protection · PDP / PEP (was Operation admission), Inference protection · Guardrails, Data protection; in Russian «Безопасность исполнения», «Безопасность инференса», «Безопасность данных». The Infrastructure view places PDP, retrieval access control, agent memory access control and the provenance registry in the same groups as the Stack view.
- One term per concept: «ИИ-контролёр» / AI controller for the evaluating model, «изолированная среда» for the job sandbox; Architecture elements carry the names of their classes.
- `RM-OPS-06` becomes AI usage metering and billing: consumption per consumer, project, process and model, tariffs and chargeback. The inference gateway asks `RM-AIC-05` for a quota decision before every call. Every touch of an agent reaches metering: the gateway reports model calls, the PEP admitted actions, the isolated environment job resources and knowledge access control queries; task limits are checked against metering. The validator requires metering in every route where an agent or a model takes part.
- Every request first passes the request classifier `RM-MOD-12`: it estimates complexity and the needed capabilities and picks a route profile among the models that disclosure policy permits for the data category. A composite request goes to the model call planner `RM-MOD-13`, which splits it into subtasks, gives each the cheapest sufficient model, reuses cached results and assembles the answer; a subtask that needs a tool or an action goes to the agent orchestrator. `INF-01` gets a branch for composite requests, and the planner takes part in every route that calls a model without an agent. Sources: RouteLLM, FrugalGPT, LLMCompiler.
- Architecture: 91 elements, with new groups for guarded inference and Harness. Infrastructure: 87 elements, 106 relations and the logical boundary of the AI platform.
- Registry of 91 sources: 28 standards or specifications, 27 published practices, 36 implementation examples. Every element of the three views and every zone is bound to sources. No link is verified by a maintainer yet: the `checked` field is empty.

Map
- Process picker with search and groups. The route panel shows steps and the composition of a process; the process card opens the workflow diagram first.
- Dependency mode in the Stack and Infrastructure views.
- A process route is the first layer of the map. A route visits each element once; a store, a quota or an audit record that a step uses is a participant of that step, and a dashed line brings the answer back to the first element. Choosing a process zooms the map to its route.
- Route lines run along the gaps between zones with rounded corners and never cross a block. Lines to the participants and the dependencies of a step appear only for the current step.
- Calm frame: hairline solid borders, a neutral ground and a light idle network; dashes remain only on the logical boundary of the AI platform. Below 60 % zoom only the elements of the route keep their labels.
- The element card shows sources right after the description: standards first, implementation examples last.
- Panels without uppercase labels, chips or pill buttons, in Fira Sans. The element card lists the role of the element in each process; the process card shows the workflow and the selected step side by side.
- Version switcher: alpha 0.1 stays available at /0.1/. The publishing workflow builds it from the tag `v0.1.0-alpha` with `tools/build_versions.py`; the switcher keeps the language and the view.
- One panel at a time. The minimap hides under an open card; on screens up to 900 px wide the card replaces the route panel.
- The Architecture view draws route lines at right angles, below the row when the blocks are not adjacent, and highlights the participants of a process without lines across levels.
- English text for every process field, source title and source scope.

Tools
- New model folders: `model/processes`, `model/sources`, `model/dependencies` and `model/profiles.yaml`. The validator checks references, `[ru, en]` pairs, source types, workflow node kinds, that every element has a source and that every source, process part, group and option is used.
- `backlog/` keeps material the map does not use yet: the registry of 104 processes, profile presets and contracts. It is not built or validated.
- `tools/workflows.py` lays out workflow diagrams itself: the main path runs straight down, every failure exit ends in its own terminal beside its node, rework steps stand in a left column and returns run up separate lanes. The build needs no Graphviz.
- With Playwright installed, the build computes the line geometry in headless Chromium once and embeds it, so the map opens without routing lines in the browser.
- `tools/check_layout.py` checks every process route in every view, that a route line crosses no block and takes no detour longer than 1.6 times the distance between its blocks, and the absence of Russian text in the English map. The validator rejects a route that returns to an element it has already visited.

Known limitations
- The route steps list components. The operations of a process are in the Composition tab and in the process card.
- No route uses the Confidential computing classes, data encryption `RM-DPR-05` or agent memory access control `RM-DPR-07`.
- Sources are bound broadly: most classes have exactly two, and three general documents cover 40 or more elements each. 62 sources have no section.

## 0.1.0-alpha — first public alpha

- Three views of the map: Architecture (80 elements), Infrastructure (67 elements, 77 relations), Platform stack (99 classes in 7 layers, CI/CD, observability, cybersecurity and AI Safety Core).
- Seven scenarios with routes across the views.
- Stable class keys `RM-…` and the deprecation rule.
- Russian and English for all model texts and the interface.
- Model in YAML split by layer, level and scenario, so each layer can have its own steward; validation, single-file build, browser layout check, GitHub Pages workflow.
- "Propose a change" issue form linked from every element of the map.
