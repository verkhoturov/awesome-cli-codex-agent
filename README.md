# Awesome CLI Codex Agent

Интерактивный терминальный клиент для анализа и написания кода. Клиент напрямую
подключается к `codex app-server` и ведёт работу через один постоянный agent
thread.

## Требования

- Node.js 22 или новее
- установленный Codex CLI
- аккаунт ChatGPT с доступом к Codex, OpenAI API key или Codex access token

## Установка и запуск

```bash
npm install
npm run build
npm start
```

Если сохранённой авторизации нет, клиент предложит те же способы входа, что и
Codex CLI: ChatGPT через браузер, ChatGPT device code, OpenAI API key или ChatGPT
access token. Нативный `codex login` сохраняет результат в проектном
`.codex-data` с file-backed credential store, и при следующих запусках логин
используется автоматически. Чтобы сменить аккаунт или способ входа, запустите
клиент с `--login`:

```bash
npm start -- --login
```

Чтобы удалить сохранённые credentials, выполните `/logout` внутри клиента и
подтвердите выход. Клиент сначала завершит текущую сессию и App Server, затем
вызовет нативный `codex logout` для проектного `.codex-data`.

API key оплачивается через OpenAI Platform по стандартным API-тарифам и не
расходует лимит подписки ChatGPT. Вход через ChatGPT использует доступ и лимиты
соответствующего плана ChatGPT.

### Рабочий каталог агента

По умолчанию агент анализирует и изменяет файлы в каталоге, из которого запущен
клиент. Чтобы агент работал с другим проектом, передайте его каталог через
`--cwd` (короткая форма — `-C`):

```bash
npm start -- --cwd ../my-project
```

Можно указать абсолютный путь:

```bash
npm start -- -C /path/to/my-project
```

Путь из `--cwd` становится рабочим каталогом агента. Чтобы сменить его,
перезапустите клиент с другим значением `--cwd`.

### Настройки агента

Пользовательский запрос сразу получает один постоянный agent thread. Агенту
запрещено создавать или использовать subagents.

Модель основного агента и необязательный фиксированный reasoning effort задаются
аргументами:

```bash
npm start -- --model gpt-5.4 --reasoning-effort xhigh
```

Без `--reasoning-effort` агент использует `medium` по умолчанию. Флаг задаёт
фиксированный effort для нового agent thread.

Допустимые значения effort: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.
Конкретная модель может поддерживать не все уровни. Полный список аргументов
доступен через `npm start -- --help`.

App Server использует `.codex-data` в корне этого клиентского репозитория для
credentials и истории thread, независимо от значения `--cwd`. Этот каталог
принадлежит приложению; сохранённые в нём credentials следует защищать как
пароль. При первом запуске после обновления приложение удалит ранее добавленную
настройку `forced_login_method = "api"` из верхнего уровня
`.codex-data/config.toml`, сохранив остальные пользовательские настройки.

## Доступ и approvals

Поддерживаются sandbox-режимы `read-only` и `workspace-write`. Выбранный sandbox
применяется к одиночному агенту. По умолчанию используется `workspace-write` с
approval policy `on-request`. Если Codex хочет выполнить действие, требующее
дополнительного доступа, CLI показывает запрос на подтверждение. Интерактивные
server requests сериализуются.

## Команды

Актуальный список интерактивных команд и их аргументов доступен через `/help`.
Справка формируется из того же registry, который обрабатывает команды.
Сохранённый thread можно продолжить отдельным запуском:

```bash
npm run resume -- 019ee9d4-8595-7bd0-8933-943b97853c3d -C /path/to/project
```

`Ctrl+C` во время выполнения отправляет `turn/interrupt` в App Server. В режиме
ожидания `Ctrl+C` завершает CLI.

При выходе выводятся общая статистика токенов и разбивка по использованным ролям.

## Вывод действий

Клиент требует интерактивный TTY stdin и использует React Ink для отрисовки
интерфейса. Завершённые сообщения остаются в обычном terminal scrollback.
Запуск с перенаправлённым stdin завершается ошибкой.

App Server передает события Codex напрямую. CLI показывает активную роль с
таймером, команды, изменения файлов, MCP-вызовы, web search и потоковый итоговый
ответ.

Reasoning summaries являются краткими сводками, предоставленными Codex, а не
скрытой цепочкой рассуждений модели.

## Разработка

Для диагностики протокола запустите `DEBUG_APP_SERVER=1 npm start`.

Проверки для разработки:

```bash
npm run check
npm run build
```

## Архитектура

Клиент использует изолированный `CODEX_HOME` и до запуска App Server проверяет
сохранённую авторизацию через `codex login status`. Если её нет или передан
`--login`, клиент предлагает способ входа и передаёт его нативному `codex login`.
После авторизации клиент запускает App Server и использует
`thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, потоковые
notifications и server requests для approvals. Запросы идут в один постоянный
agent thread с выбранными model, reasoning effort, developer instructions и
sandbox-настройками.

App Server пока относится к экспериментальным интерфейсам Codex, поэтому при
обновлении Codex CLI схема протокола может измениться.

## Документация

- [Codex App Server](https://developers.openai.com/codex/app-server)
- [Codex authentication](https://developers.openai.com/codex/auth)
- [Codex CLI](https://developers.openai.com/codex/cli)
- [Codex security](https://developers.openai.com/codex/security)
