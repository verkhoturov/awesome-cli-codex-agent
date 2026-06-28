# Карта проекта

Ниже перечислены основные каталоги и файлы репозитория, что в них лежит и зачем они нужны.

## Корень репозитория

- `package.json` - описание пакета, точка входа CLI, npm-скрипты, зависимости и бинарное имя `custom-codex-agent`.
- `README.md` - пользовательская документация: установка, запуск, настройки агента, авторизация, команды и архитектурный обзор.
- `AGENTS.md` - правила и ограничения для Codex-агентов, особенно по слоям приложения и защищённым файлам.
- `project-map.md` - эта карта проекта, чтобы быстро ориентироваться по структуре кода.
- `.codex-data/` - проектный `CODEX_HOME` с авторизацией, конфигом, логами, sqlite-базами и другой runtime-состоянием Codex.

## `src/`

### Точка входа и общие настройки

- `src/index.ts` - главный entrypoint приложения; проверяет CLI, авторизацию, запускает App Server, создаёт UI и стартует интерактивный цикл.
- `src/config.ts` - центральные дефолты: модель, reasoning effort, sandbox, approval policy, метаданные клиента App Server и путь к `.codex-data`.
- `src/types.ts` - общие типы состояния приложения, sandbox, reasoning effort и профиля агента.

### `src/auth/`

- `src/auth/types.ts` - типы и валидаторы для нативных способов авторизации Codex.
- `src/auth/native-codex-auth.ts` - запуск `codex login`, `codex logout` и `codex login status` в проектном `CODEX_HOME`.

### `src/utils/`

- `src/utils/cli-arguments.ts` - парсинг аргументов CLI и сборка начального `CliState`.
- `src/utils/check-codex-cli.ts` - проверка, что нативный `codex` доступен в `PATH`.
- `src/utils/ensure-codex-home.ts` - создание `.codex-data` и удаление устаревшего `forced_login_method` из верхнего уровня `config.toml`.
- `src/utils/assert-never.ts` - helper для exhaustive-checking в `switch`-ветках.

### `src/app-server/`

Этот слой работает с сырым JSON-RPC App Server и не должен протекать в UI.

- `src/app-server/client.ts` - управление дочерним процессом `codex app-server`, JSON-RPC transport, запросами, уведомлениями и server requests.
- `src/app-server/types.ts` - wire-level типы RPC, ответов, уведомлений, ошибок и служебных структур App Server.
- `src/app-server/events.ts` - декодирование notification-событий App Server в типизированные события для отрисовки.
- `src/app-server/requests.ts` - декодирование server requests в typed approvals, user input и elicitation-запросы.
- `src/app-server/session.ts` - helper-функции для `thread/start`, `thread/resume`, `turn/start` и `turn/interrupt`.

### `src/cli/`

Этот слой управляет интерактивным циклом, командами и последовательностью turn-ов.

- `src/cli/index.ts` - основной CLI-цикл: приветствие, ввод пользователя, обработка команд, запуск агентов и завершение сессии.
- `src/cli/authentication.ts` - оркестрация выбора способа входа и вызова нативной авторизации через UI.
- `src/cli/commands.ts` - единый registry интерактивных команд, их help-текст, подсказки и обработчики.
- `src/cli/usage.ts` - текст `--help` для верхнего уровня CLI.
- `src/cli/session-output.ts` - вывод приветствия, статуса и итоговой сводки по токенам.
- `src/cli/turn/runner.ts` - жизненный цикл одного turn: старт, поток уведомлений, буферизация, interrupt и завершение.
- `src/cli/server-requests/queue.ts` - сериализация server requests, чтобы запросы на подтверждение не пересекались.
- `src/cli/server-requests/handler.ts` - обработка approvals, permission requests, user input и MCP elicitation через `CliUi`.

### `src/agents/`

- `src/agents/runner.ts` - профиль агента и запуск одного постоянного agent thread.

### `src/ui/`

- `src/ui/contracts.ts` - presentation-independent порт `CliUi`, типы UI-событий, запросов ввода и подсказок.
- `src/ui/resolve-input.ts` - нормализация ответа пользователя для choice/input полей.

#### `src/ui/ink/`

Ink-реализация терминального интерфейса.

- `src/ui/ink/index.tsx` - адаптер `CliUi`: mounting Ink, bridge для input, interrupt handling и временное освобождение терминала.
- `src/ui/ink/app.tsx` - корневой React-компонент Ink, который соединяет history, active turn и prompt.
- `src/ui/ink/store.ts` - immutable UI store для scrollback history, текущего turn, prompt и command history.
- `src/ui/ink/model.ts` - renderable модели для history, turn blocks, prompt и snapshot.
- `src/ui/ink/turn-projector.ts` - преобразование App Server events в визуальные блоки turn-ов.

#### `src/ui/ink/components/`

- `src/ui/ink/components/prompt.tsx` - поле ввода, история ввода и slash-command palette.
- `src/ui/ink/components/command-palette.tsx` - список подсказок для `/`-команд.
- `src/ui/ink/components/history.tsx` - отрисовка завершённых сообщений и turn-ов из scrollback.
- `src/ui/ink/components/turn.tsx` - отображение активного turn-а, activity grouping и статуса выполнения.
- `src/ui/ink/components/message.tsx` - стилизованный вывод системных, статусных, warning и error сообщений.

## Что здесь важно понимать

- `src/app-server/` держит протокол и декодирование сырых сообщений.
- `src/cli/` управляет поведением приложения и очередностью интерактивных запросов.
- `src/agents/` определяет профиль и запуск одиночного агента.
- `src/ui/ink/` отвечает только за визуализацию и ввод в терминале.
