# Governance

[Русский текст ниже](#управление-проектом)

AiNativeOps is a Community Interest Project. The model belongs to its contributors and is published under open licenses. No organisation decides alone what enters the model.

## Roles

| Role | Rights | How to get it |
|---|---|---|
| Contributor | Opens issues and pull requests | Anyone |
| Layer steward | Reviews and approves changes to one or more layers; listed in `.github/CODEOWNERS` | Three accepted contributions to the layer and agreement of the maintainers |
| Maintainer | Merges, releases versions, appoints stewards, moderates | Agreement of the existing maintainers |

The owners of the `ainativeops-org` GitHub organisation act as maintainers until the project names maintainers in this file. The domain ainativeops.org is held for the project; if its holder leaves the project, the domain is transferred to a person or an organisation named by the maintainers.

## Decisions

- **Minor change** (wording, a new optional class, a new relation): the layer steward approves it in the pull request. If nobody objects within 7 days, a maintainer merges it.
- **Breaking change** (removing or splitting a class, changing the meaning of a class, a new layer, a change of the identifier scheme): an RFC in GitHub Discussions with a discussion window of 14 days. Maintainers record the decision and the reasons in the RFC.
- **Disagreement**: maintainers decide by majority after the discussion window. The decision and the dissenting opinion stay in the RFC.

## Versions

The model follows semantic versioning.

- **PATCH**: wording and translation fixes.
- **MINOR**: new classes, relations, scenarios; classes marked deprecated.
- **MAJOR**: removal of deprecated classes, a changed meaning of a class, a changed layer structure.

After release 1.0 a class key `RM-…` never changes its meaning and is never reused.

## Neutrality

Class names name functions. A product or a company appears only in examples and discussions. A steward who works for a vendor declares it in the pull request where the vendor's product is relevant.

---

# Управление проектом

AiNativeOps развивается как Community Interest Project. Модель принадлежит участникам и публикуется по открытым лицензиям. Ни одна организация не решает единолично, что входит в модель.

## Роли

| Роль | Права | Как получить |
|---|---|---|
| Участник | Открывает issue и pull request | Любой желающий |
| Сопровождающий слоя | Рецензирует и одобряет изменения одного или нескольких слоёв; указан в `.github/CODEOWNERS` | Три принятых вклада в слой и согласие мейнтейнеров |
| Мейнтейнер | Сливает изменения, выпускает версии, назначает сопровождающих, модерирует | Согласие действующих мейнтейнеров |

Пока проект не назвал мейнтейнеров в этом файле, их обязанности исполняют владельцы организации `ainativeops-org` на GitHub. Домен ainativeops.org принадлежит проекту; если его держатель выходит из проекта, он передаёт домен лицу или организации, которых назовут мейнтейнеры.

## Решения

- **Малое изменение** (формулировка, новый необязательный класс, новая связь) одобряет сопровождающий слоя в pull request. Если за 7 дней нет возражений, мейнтейнер сливает изменение.
- **Ломающее изменение** (удаление или разделение класса, смена смысла класса, новый слой, смена схемы идентификаторов) проходит через RFC в GitHub Discussions с окном обсуждения 14 дней. Мейнтейнеры записывают решение и его причины в RFC.
- **Разногласие** мейнтейнеры решают большинством после окна обсуждения. Решение и особое мнение остаются в RFC.

## Версии

Модель следует семантическому версионированию.

- **PATCH**: исправления формулировок и перевода.
- **MINOR**: новые классы, связи, сценарии; пометка классов как deprecated.
- **MAJOR**: удаление deprecated-классов, смена смысла класса, смена структуры слоёв.

После версии 1.0 ключ класса `RM-…` не меняет смысл и не переиспользуется.

## Нейтральность

Название класса называет функцию. Продукт или компания появляются только в примерах и обсуждениях. Сопровождающий, который работает у вендора, сообщает об этом в pull request, где затронут продукт вендора.
