# Публикация на GitHub

Инструкция ведёт от архива до карты на ainativeops.org. Команды рассчитаны на Linux (Arch, Omarchy). В других дистрибутивах меняется только установка пакетов.

## 1. Подготовка

1. Установите git и GitHub CLI:
   ```bash
   sudo pacman -S --needed git github-cli python
   ```
2. Войдите в GitHub из терминала. Выберите `GitHub.com`, протокол `HTTPS` и вход через браузер:
   ```bash
   gh auth login
   ```
3. Создайте организацию `ainativeops` на странице https://github.com/account/organizations/new, тариф Free. Отдельная организация держит проект независимым от личного аккаунта и от компании. Если имя занято, выберите другое и подставляйте его вместо `ainativeops` во всех командах ниже.

## 2. Распаковка и проверка

1. Распакуйте архив:
   ```bash
   cd ~/work
   unzip ainativeops.zip
   cd ainativeops
   ```
2. По желанию назначьте рецензентов. В `.github/CODEOWNERS` раскомментируйте строки и замените `@maintainers` на свой аккаунт, например `@your-login`. Мейнтейнеров и владельца домена в GOVERNANCE.md можно не указывать: до этого их роль исполняют владельцы организации на GitHub.
3. Проверьте модель и соберите карту:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python tools/validate.py
   python tools/build.py
   xdg-open dist/index.html
   ```
   Валидатор должен вывести `model OK: 99 classes…`. Папки `dist/` и `.venv/` не попадут в репозиторий, они перечислены в `.gitignore`.

## 3. Первый коммит и создание репозитория

1. Создайте локальный репозиторий и первый коммит. Ключ `-s` добавляет подпись DCO, которую требует CONTRIBUTING.md:
   ```bash
   git init -b main
   git add .
   git commit -s -m "AiNativeOps alpha 0.1"
   ```
2. Создайте публичный репозиторий в организации и отправьте код одной командой:
   ```bash
   gh repo create ainativeops/ainativeops --public --source=. --remote=origin --push \
     --description "Open reference model for AI-native operations. Community Interest Project." \
     --homepage "https://ainativeops.org"
   ```
3. Добавьте темы для поиска по GitHub:
   ```bash
   gh repo edit ainativeops/ainativeops --add-topic reference-model,ai-agents,mlops,llmops,ai-safety,archimate
   ```

## 4. Публикация карты через GitHub Pages

1. Откройте https://github.com/ainativeops/ainativeops/settings/pages. В поле **Source** выберите **GitHub Actions**.
2. Запустите публикацию. После первого пуша она могла упасть, потому что Pages ещё не был включён:
   ```bash
   gh workflow run pages.yml --repo ainativeops/ainativeops
   gh run watch --repo ainativeops/ainativeops
   ```
3. Когда задание `deploy` завершится, карта откроется по адресу https://ainativeops.github.io/ainativeops/. Проверьте три вида, переключатель языка и кнопку «Предложить правку» в панели элемента. Кнопка должна открыть форму issue в этом репозитории.

## 5. Домен ainativeops.org

1. **Подтвердите домен для организации.** Откройте https://github.com/organizations/ainativeops/settings/pages, нажмите **Add a domain** и введите `ainativeops.org`. GitHub покажет TXT-запись вида `_github-pages-challenge-ainativeops.ainativeops.org`. Создайте её у регистратора и нажмите **Verify**. Подтверждение запрещает другим аккаунтам привязать ваш домен к своим страницам.
2. **Создайте записи DNS у регистратора.** Перед вводом сверьте адреса с документацией GitHub: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

   | Имя | Тип | Значение |
   |---|---|---|
   | `@` | A | `185.199.108.153` |
   | `@` | A | `185.199.109.153` |
   | `@` | A | `185.199.110.153` |
   | `@` | A | `185.199.111.153` |
   | `@` | AAAA | `2606:50c0:8000::153` |
   | `@` | AAAA | `2606:50c0:8001::153` |
   | `@` | AAAA | `2606:50c0:8002::153` |
   | `@` | AAAA | `2606:50c0:8003::153` |
   | `www` | CNAME | `ainativeops.github.io` |

   Удалите у регистратора записи-заглушки для `@` и `www`, если они есть. Иначе GitHub не выпустит сертификат.
3. **Привяжите домен к репозиторию.** В https://github.com/ainativeops/ainativeops/settings/pages впишите `ainativeops.org` в поле **Custom domain** и нажмите **Save**. При публикации через Actions файл CNAME в репозитории не нужен.
4. **Дождитесь проверки DNS.** Обычно она занимает от нескольких минут до часа. Проверить записи можно так:
   ```bash
   dig +short ainativeops.org
   dig +short www.ainativeops.org
   ```
5. **Включите HTTPS.** Когда GitHub покажет «DNS check successful», поставьте галочку **Enforce HTTPS**. Сертификат выпускается автоматически, иногда за час.

## 6. Обсуждения и метки

1. Включите Discussions для RFC:
   ```bash
   gh repo edit ainativeops/ainativeops --enable-discussions
   ```
   В https://github.com/ainativeops/ainativeops/discussions/categories создайте категорию **RFC** с форматом Announcement или Open-ended discussion.
2. Создайте метку, которую ставит форма «Предложить правку»:
   ```bash
   gh label create proposal --color FBCA04 --description "Предложение изменить модель" --repo ainativeops/ainativeops
   ```

## 7. Защита ветки main

Правила не дают слить изменение без проверок и рецензии. Откройте https://github.com/ainativeops/ainativeops/settings/rules, создайте **New branch ruleset** и задайте:

1. Enforcement status: **Active**. Target branches: **Default branch**.
2. **Require a pull request before merging**, Required approvals: 1, отметьте **Require review from Code Owners**.
3. **Require status checks to pass**. Добавьте проверки `model` и `layout` из workflow `Validate`. Они появятся в списке после первого запуска workflow.
4. **Block force pushes**.

Пока вы единственный мейнтейнер, добавьте себя в **Bypass list**. Иначе вы не сможете слить собственный pull request без второго рецензента.

## 8. Выпуск alpha 0.1

Отметьте выпуск тегом и опубликуйте его как pre-release:

```bash
git tag -a v0.1.0-alpha -m "AiNativeOps alpha 0.1"
git push origin v0.1.0-alpha
gh release create v0.1.0-alpha --repo ainativeops/ainativeops --prerelease \
  --title "AiNativeOps alpha 0.1" --notes-file CHANGELOG.md
```

## 9. Как вносить изменения дальше

1. Создайте ветку, измените файлы в `model/`, проверьте сборку:
   ```bash
   git switch -c fix/pep-wording
   python tools/validate.py && python tools/build.py
   git commit -s -am "Уточнить описание RM-ACT-02"
   git push -u origin fix/pep-wording
   gh pr create --fill
   ```
2. CI запустит проверки и приложит собранную карту как артефакт `map-preview`.
3. После слияния в `main` workflow «Publish map» обновит ainativeops.org за одну-две минуты.

## Если что-то пошло не так

| Симптом | Причина и решение |
|---|---|
| Задание `deploy` падает с ошибкой про environment или Pages | Pages не включён или источник не GitHub Actions. Выполните шаг 4.1 и перезапустите `gh workflow run pages.yml`. |
| `gh repo create` отвечает, что нет прав в организации | Вы не владелец организации или имя репозитория занято. Проверьте https://github.com/orgs/ainativeops/people. |
| Домен не проходит проверку DNS | Остались старые A-записи регистратора или записи ещё не разошлись. Сверьте `dig +short ainativeops.org` с таблицей шага 5.2. |
| Нет галочки Enforce HTTPS | Сертификат ещё выпускается. Подождите до часа. Если не помогло, удалите домен в настройках Pages, сохраните и введите снова. |
| Кнопка «Предложить правку» не видна | Карта собрана локально без адреса репозитория. На GitHub Pages адрес подставляет workflow. |
| Проверка `layout` падает | Новая связь не нашла обход блоков или сценарий ссылается на элемент, которого нет в виде. Откройте лог задания, там названы элемент и вид. |
