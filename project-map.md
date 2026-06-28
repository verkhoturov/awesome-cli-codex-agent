# Карта проекта

Ниже перечислены основные каталоги и файлы репозитория, что в них лежит и зачем они нужны.

## Корень репозитория

- `package.json` - описание пакета, точка входа CLI, npm-скрипты, зависимости и бинарное имя `custom-codex-agent`.
- `tsconfig.json` - TypeScript config; задаёт path aliases `@/app/*`, `@/cli/*`, `@/core`, `@/core/*`, `@/adapters`, `@/adapters/*` и `@/shared/*`.
- `README.md` - пользовательская документация: установка, запуск, настройки агента, авторизация, команды и архитектурный обзор.
- `AGENTS.md` - правила и ограничения для Codex-агентов, особенно по слоям приложения и защищённым файлам.
- `project-map.md` - эта карта проекта, чтобы быстро ориентироваться по структуре кода.
- `.codex-data/` - проектный `CODEX_HOME` с авторизацией, конфигом, логами, sqlite-базами и другой runtime-состоянием Codex.

## `src/`

### `src/app/`

- `src/app/index.ts` - главный entrypoint приложения; проверяет CLI, авторизацию, запускает App Server, создаёт UI и стартует интерактивный цикл.
- `src/app/config.ts` - центральные дефолты: модель, reasoning effort, sandbox, approval policy, метаданные клиента App Server и путь к `.codex-data`.
- `src/app/cli-arguments.ts` - парсинг аргументов CLI и сборка начального `CliState`.

### `src/core/`

- `src/core/index.ts` - barrel-export для общего импорта core API через `@/core`.
- `src/core/types.ts` - общие типы приложения и type guards для sandbox/reasoning effort.
- `src/core/agent.ts` - профиль агента и запуск одного постоянного agent thread.
- `src/core/turn.ts` - жизненный цикл одного turn: старт, поток уведомлений, буферизация, interrupt и завершение.

### `src/adapters/`

- `src/adapters/index.ts` - barrel-export для общего импорта adapter API через `@/adapters`.

### `src/adapters/app-server/`

Этот слой работает с сырым JSON-RPC App Server и не должен протекать в UI.

- `src/adapters/app-server/client.ts` - управление дочерним процессом `codex app-server`, JSON-RPC transport, запросами, уведомлениями и server requests.
- `src/adapters/app-server/types.ts` - wire-level типы RPC, ответов, уведомлений, ошибок и служебных структур App Server.
- `src/adapters/app-server/events.ts` - декодирование notification-событий App Server в типизированные события для отрисовки.
- `src/adapters/app-server/requests.ts` - декодирование server requests в typed approvals, user input и elicitation-запросы.
- `src/adapters/app-server/session.ts` - helper-функции для `thread/start`, `thread/resume`, `turn/start` и `turn/interrupt`.

### `src/adapters/native-codex/`

- `src/adapters/native-codex/types.ts` - типы и валидаторы для нативных способов авторизации Codex.
- `src/adapters/native-codex/check-cli.ts` - проверка, что нативный `codex` доступен в `PATH`.
- `src/adapters/native-codex/codex-home.ts` - создание `.codex-data` и удаление устаревшего `forced_login_method` из верхнего уровня `config.toml`.
- `src/adapters/native-codex/auth.ts` - запуск `codex login`, `codex logout` и `codex login status` в проектном `CODEX_HOME`.

### `src/adapters/ui/`

- `src/adapters/ui/contracts.ts` - presentation-independent порт `CliUi`, типы UI-событий, запросов ввода и подсказок.
- `src/adapters/ui/resolve-input.ts` - нормализация ответа пользователя для choice/input полей.

#### `src/adapters/ui/ink/`

Ink-реализация терминального интерфейса.

- `src/adapters/ui/ink/index.tsx` - адаптер `CliUi`: mounting Ink, bridge для input, interrupt handling и временное освобождение терминала.
- `src/adapters/ui/ink/app.tsx` - корневой React-компонент Ink, который соединяет history, active turn и prompt.
- `src/adapters/ui/ink/store.ts` - immutable UI store для scrollback history, текущего turn, prompt и command history.
- `src/adapters/ui/ink/model.ts` - renderable модели для history, turn blocks, prompt и snapshot.
- `src/adapters/ui/ink/turn-projector.ts` - преобразование App Server events в визуальные блоки turn-ов.

#### `src/adapters/ui/ink/components/`

- `src/adapters/ui/ink/components/prompt.tsx` - поле ввода, история ввода и slash-command palette.
- `src/adapters/ui/ink/components/command-palette.tsx` - список подсказок для `/`-команд.
- `src/adapters/ui/ink/components/history.tsx` - отрисовка завершённых сообщений и turn-ов из scrollback.
- `src/adapters/ui/ink/components/turn.tsx` - отображение активного turn-а, activity grouping и статуса выполнения.
- `src/adapters/ui/ink/components/message.tsx` - стилизованный вывод системных, статусных, warning и error сообщений.

### `src/cli/`

Этот слой управляет интерактивным циклом, командами и последовательностью turn-ов.

- `src/cli/index.ts` - основной CLI-цикл: приветствие, ввод пользователя, обработка команд, запуск агентов и завершение сессии.
- `src/cli/authentication.ts` - оркестрация выбора способа входа и вызова нативной авторизации через UI.
- `src/cli/commands/index.ts` - публичный API команд: `handleCommand`, help и подсказки.
- `src/cli/commands/registry.ts` - registry интерактивных команд, lookup по имени, help-текст и подсказки.
- `src/cli/commands/handlers.ts` - обработчики команд `/resume`, `/model`, `/permissions`, `/logout` и shared helpers для conversation reset.
- `src/cli/commands/types.ts` - общие типы command layer: context, result и command definition.
- `src/cli/session/usage.ts` - текст `--help` для верхнего уровня CLI.
- `src/cli/session/output.ts` - вывод приветствия, статуса и итоговой сводки по токенам.
- `src/cli/server-requests/queue.ts` - сериализация server requests, чтобы запросы на подтверждение не пересекались.
- `src/cli/server-requests/handler.ts` - обработка approvals, permission requests, user input и MCP elicitation через `CliUi`.

### `src/shared/`

- `src/shared/assert-never.ts` - helper для exhaustive-checking в `switch`-ветках.

## Что здесь важно понимать

- `src/adapters/app-server/` держит протокол и декодирование сырых сообщений.
- `src/core/` держит состояние, профиль агента и lifecycle turn-а без привязки к Ink.
- `src/cli/` управляет поведением приложения и очередностью интерактивных запросов.
- `src/adapters/ui/ink/` отвечает только за визуализацию и ввод в терминале.
