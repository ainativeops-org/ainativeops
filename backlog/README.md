# Backlog

Material removed from the 0.2 model because the map does not use it yet. Nothing here is built, validated or published. It is kept as a starting point for 0.3; a part returns to `model/` through a pull request together with the code that shows it.

| Path | What it is | Why it left 0.2 |
|---|---|---|
| `process-registry/` | 104 processes in 13 groups with trigger, result, check, classes and gates | The map shows 20 processes with their own keys; the registry had no view and two processes carried different names in both places |
| `profiles.yaml` | 6 profile options, 9 presets, mandatory-composition contracts of 22 processes | Processes use the placement option only; no code read the contracts |
| `process-aliases.yaml` | Short addresses of processes from earlier drafts | Version 0.1 was never published, so no links depend on them |
| `process-flags.yaml` | `executionScope` and `modelAssisted` of processes | No code read them |
| `dependency-kinds.yaml` | Free-form kind of each dependency | 81 kinds for 196 dependencies, 63 of them used once or twice; the card shows the reason text instead |
| `sources-unused.yaml` | 4 sources | No element, dependency or workflow referred to them |

---

# Задел

Материал, который убран из модели 0.2, потому что карта его пока не использует. Он не собирается, не проверяется и не публикуется. Это основа для 0.3: часть возвращается в `model/` через pull request вместе с кодом, который её показывает.

| Путь | Что это | Почему убрано из 0.2 |
|---|---|---|
| `process-registry/` | 104 процесса в 13 группах с запуском, результатом, проверкой, классами и рубежами | Карта показывает 20 процессов со своими ключами; у реестра не было вида, а два процесса назывались по-разному в реестре и на карте |
| `profiles.yaml` | 6 параметров профиля, 9 пресетов, контракты обязательного состава 22 процессов | Процессы используют только параметр размещения; контракты код не читал |
| `process-aliases.yaml` | Короткие адреса процессов из ранних черновиков | Версия 0.1 не публиковалась, ссылок на них нет |
| `process-flags.yaml` | Флаги процессов `executionScope` и `modelAssisted` | Код их не читал |
| `dependency-kinds.yaml` | Свободный вид каждой зависимости | 81 вид на 196 зависимостей, 63 встречаются один-два раза; карточка показывает текст причины |
| `sources-unused.yaml` | 4 источника | На них не ссылался ни один элемент, зависимость или схема |
