<div align="center">

# FS · Frontend Sprint

### Interview OS для системной подготовки к frontend-собеседованиям

Учебный план, AI-разборы, интервальные повторения, live coding и полноценный симулятор интервью — в одном приложении для компьютера и Android.

[![Release](https://img.shields.io/github/v/release/620474/KnowsPreparation?style=for-the-badge&label=release&labelColor=07110f&color=6bf5b0)](https://github.com/620474/KnowsPreparation/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/620474/KnowsPreparation/ci.yml?branch=main&style=for-the-badge&label=checks&labelColor=07110f&color=b79cff)](https://github.com/620474/KnowsPreparation/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-6bf5b0?style=for-the-badge&labelColor=07110f)
![NestJS](https://img.shields.io/badge/NestJS-API-ffad73?style=for-the-badge&labelColor=07110f)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-6bf5b0?style=for-the-badge&labelColor=07110f)
![Android](https://img.shields.io/badge/Android-Capacitor-b79cff?style=for-the-badge&labelColor=07110f)

[Возможности](#возможности) · [Симулятор интервью](#симулятор-интервью) · [Быстрый старт](#быстрый-старт) · [Android](#android) · [Архитектура](#архитектура)

</div>

> **Главная идея:** приложение не просто хранит галочки, а измеряет подготовку, находит слабые темы и превращает их в следующий конкретный шаг.

## Возможности

| Направление | Что умеет приложение |
| --- | --- |
| **Учебный план** | 12 недель по 120 минут в день: 11 основных недель и одна буферная |
| **Четыре трека** | Основной план, персональный AI-курс, подготовка к Яндексу и Ozon |
| **AI-разборы** | Потоковая генерация уроков, схем, квизов, практики и контекстного чата |
| **Практика** | JS-песочница с QuickJS, тест-кейсами и сохранением решений локально и в MongoDB |
| **Interview Gym** | Сессии на 5/10 минут, 30 проверяемых задач, QuickJS и автоматическое планирование повторений |
| **Собеседования** | Семь профилей компаний, Adaptive Interview Director, Exam mode, live coding и пошаговый Replay |
| **Skill Graph** | 40+ versioned навыков, Evidence v3, Bayesian mastery и отдельные design/transfer/resilience |
| **Verified Readiness v9** | Hidden Checkpoint отделяет обучение от независимой проверки и учитывает exposure, уверенность и перенос |
| **Аналитика** | Evidence readiness отделена от вероятности пройти интервью; forecast включается только после калибровки |
| **Исследования** | Проекты, evidence matrix, автономный поиск, citation audit, противоречия и действия |
| **Поиск работы** | Воронка вакансий, follow-up, недельные KPI, интервью, конверсия и карьерная стратегия |
| **AI-агенты** | Versioned Agent Runtime, проверка уроков, адаптивные интервью, разбор вакансий и durable Research Agent |
| **AI Engineering** | 28-дневная линия и четыре проекта: agent loop, runtime, streaming и eval harness |
| **Надёжность** | IndexedDB-черновики, офлайн-очередь, версионированный JSON-бэкап и восстановление |

| **12 недель** | **158 вопросов** | **244 источника** | **4 учебных трека** | **Web + Android** |
| :---: | :---: | :---: | :---: | :---: |
| 120 минут в день | с повторениями | в серверном каталоге | единый AI-контур | общий прогресс |

Отдельная неделя «ООП и принципы проектирования» переводит SOLID, DRY, DAMP, KISS и YAGNI из списка определений в frontend-сценарии: React-компоненты, WebSocket transport, dependency injection, границы модулей и code review. В каталоге навыков доступны поиск и фильтры, а второстепенные блоки экрана «Сегодня» свёрнуты, чтобы не отвлекать от следующего действия.

## Симулятор интервью

Interview Director v3 ведёт платформенную секцию как настоящий интервьюер: уточняет пробелы, спорит с аргументом, просит контрпример, меняет ограничения и проверяет trade-offs. Он ведёт ledger утверждений, замечает противоречия и адаптирует сложность. Решение о следующем ходе предлагает AI, но таймер, максимальную глубину, переходы и запрет подсказок в Exam mode контролирует детерминированная политика.

```mermaid
flowchart LR
    A["Платформа<br/>JavaScript и браузер"] --> B["Live coding<br/>задача и тесты"]
    B --> C["AI-секция<br/>решение с ассистентом"]
    C --> D["Защита решения<br/>вопросы по коду"]
    D --> E["Отчёт<br/>готовность и слабые темы"]
```

Каждый ход сохраняется append-only в MongoDB и идемпотентно синхронизируется из offline outbox. Отдельный timeline фиксирует задания, ответы, запуски тестов, сообщения AI и смены этапов, поэтому завершённую сессию можно воспроизвести в Replay. Доступны профили общего бигтеха, Яндекса, Ozon, Avito, Т-Банка, МТС/МГТС и 2ГИС.

Перед настоящим собеседованием можно сохранить immutable snapshot Readiness Index, а после — отметить фактический исход техэтапа. До накопления восьми исходов приложение честно показывает «прогноз ещё не откалиброван»; затем рассчитывает Brier score и только после этого включает вероятностный forecast.

## Автономные исследования

Research Agent работает на сервере и продолжает run после закрытия Android-приложения. Доступны профили технической темы, компании, вакансии, методики обучения и post-interview, а также режимы Quick, Standard и Deep.

Pipeline сохраняет каждый этап в MongoDB: протокол, поиск, red-team, синтез, citation audit и Action Mapper. Lease owner, epoch и heartbeat защищают run от параллельного выполнения. Standard и Deep запускают OpenAI Responses в background mode, сохраняют `responseId` текущего шага и после перезапуска продолжают polling того же ответа без повторного платного вызова; Quick остаётся синхронным. Лимиты времени, источников, AI-вызовов и Sol контролируются кодом. Источники, выводы и предлагаемые действия попадают в проект только после ручного подтверждения; статический учебный план агент автоматически не переписывает.

Флаг `OPENAI_RESEARCH_BACKGROUND_ENABLED=false` возвращает новые шаги Standard/Deep к синхронному режиму; уже начатый фоновый шаг всё равно безопасно завершается по сохранённому `responseId`.

## Как устроено обучение

1. Открываешь тему из плана или специального трека.
2. Читаешь сохранённый AI-разбор и при необходимости уточняешь детали в чате.
3. Проходишь два уровня квиза: 10 Core и 10 Deep вопросов.
4. Решение практики запускается прямо в приложении и проверяется тестами.
5. Результат влияет на интервальные повторения и список слабых тем.
6. Симулятор собирает знания, речь и код в одну тренировку интервью.

### Interview Gym

Раздел повторений больше не просит самостоятельно выбрать «Не помню / Трудно / Хорошо / Легко». Пользователь получает одну конкретную задачу: предсказать вывод кода, выбрать и объяснить ответ, исправить ошибку, написать функцию или защитить решение. Детерминированные ответы проверяются на сервере, код запускается в изолированном QuickJS, открытые ответы оцениваются по интервью-рубрике.

Перед проверкой фиксируется уверенность. Она не меняет правильность ответа, но позволяет видеть переоценку и недооценку своих знаний. Следующий интервал вычисляется автоматически, а старые ручные оценки сохраняются как исторический сигнал с низкой надёжностью.

Контент хранится на backend, поэтому новые темы, ссылки и вопросы появляются на телефоне без пересборки APK. Новая Android-версия нужна только при изменении интерфейса или клиентской логики.

## Архитектура

```mermaid
flowchart LR
    WEB["Локальный web<br/>React + Mantine"] --> API["HTTPS API<br/>NestJS"]
    APK["Android APK<br/>Capacitor"] --> API
    API --> DB["MongoDB Atlas<br/>прогресс и контент"]
    API --> AI["OpenAI API<br/>уроки, чат и оценка"]
```

Frontend не требуется публиковать в интернете. Локальный сайт работает на компьютере, APK — на телефоне, а постоянно доступные API и MongoDB синхронизируют их даже при выключенном компьютере.

### Evidence-driven модель знаний

`frontend-v1` заменяет одну плоскую оценку графом конкретных навыков: например, `async.event-loop`, `react.hooks` и `testing.integration`. Каждый проверяемый результат параллельно сохраняется как immutable `EvidenceEvent` с capability, семейством задания, уровнем transfer, режимом AI/no-AI и версией evaluator.

Mastery считается воспроизводимо: старые результаты теряют вес, повтор одного семейства не создаёт ложную уверенность, а для высокого уровня применения требуется независимое transfer-evidence. Исходные `LearningSignal` сохраняются, поэтому v6-проекция может быть перестроена или отключена без потери старого прогресса.

Для аварийного rollback при деплое можно установить `PLANNER_V6_ENABLED=false`: Today вернётся к прежнему readiness-планированию, не удаляя evidence и mastery snapshots.

Quiz, practice, interview и Transfer Lab создают native `AssessmentResultV2` и `EvidenceEventV2` с criterion-level оценками; старые события проецируются с явным `legacy_projection`. Mastery v2 учитывает обязательные, но ещё не проверенные capabilities через coverage и широкую uncertainty-полосу, а каждое новое состояние сохраняется историческим snapshot.

Evidence v3 дополнительно разделяет задание, его версию, семейство концепта, форму и контекст. Повтор одной формы не создаёт ложную уверенность; process telemetry фиксирует время, запуски, ошибки тестов и число правок. Mastery v3 воспроизводится из immutable-событий и хранит posterior, доверительный диапазон и покрытие отдельно по `recall/explain/apply/debug/code/design/defend/transfer/resilience`.

Verified Transfer Readiness v9 добавляет отдельный слой контрольных evidence. Экран «Сегодня» получает серверный lease только на одно текущее задание; будущие формы, эталоны и runner tests не отправляются клиенту. Ответ можно закончить без сети: черновик и неизменный `operationId` переживают перезапуск, а outbox отправляет попытку после reconnect ровно один раз. Ответ получает eligibility `eligible`, `exposed`, `repeated` или `incomplete`, поэтому знакомая, просроченная либо подсмотренная форма остаётся полезной для обучения, но не способна подтвердить готовность.

API `/api/v3` хранит append-only `AssessmentEventV4`, curated concept/form/context metadata, server timing, confidence до и после решения и process telemetry. Capability становится `verified` только при достаточной нижней границе оценки, свежести и двух независимых формах; design/defend/transfer дополнительно требуют разные контексты. Learning Mastery, Verified Transfer Readiness и экспериментальный Interview Forecast отображаются как разные показатели. Decision Loop v9 учитывает дату интервью, возвращает максимум два действия и может честно сообщить, что на сегодня достаточно.

### Evidence Core v10

V10 параллельно пишет просмотры, попытки и раскрытие ответа в append-only `ExposureEventV2`. Endpoint `/api/v3/learning/candidate-state` объединяет Verified Readiness, assessment evidence, exposure и наблюдаемое поведение в один воспроизводимый Candidate State. Старые v9-проекции сохранены для безопасного сравнения и rollback.

Каждый AI-вызов получает `AgentRunEnvelope`: версию роли, разрешения, лимит шагов, лимит output tokens и требование ручного подтверждения. Это не даёт Research Agent автоматически менять учебный план и позволяет сравнивать результаты разных версий агентов.

Checkpoint и незавершённое интервью сохраняют черновики в IndexedDB. Код, ответы и operation ID восстанавливаются после перезагрузки Android WebView, а старые checkpoint-черновики автоматически переносятся из `localStorage`.

Цель можно выбрать готовую — общий Frontend, Яндекс или Ozon — либо создать из текста вакансии. Decision Loop v8 ранжирует пробелы по нижней границе mastery и предлагает максимум три действия: диагностику, интервенцию, параллельную перепроверку, перенос в новый контекст или контрольный экзамен.

### Learning Missions и Transfer Lab

Decision Engine превращает слабые места Mastery v2 в 1–3 активные миссии на экране «Сегодня». Миссия проходит состояния «диагностика → интервенция → немедленная проверка → закрепление → отложенная проверка» и закрывается только после двух успешных заданий из разных семейств.

Transfer Lab проверяет перенос знания без AI в трёх форматах: прогноз выполнения, диагностика дефекта и изменение решения при новых ограничениях. Попытки создают evidence, действия миссии идемпотентны и попадают в offline outbox, а экран миссии восстанавливается по постоянному URL после перезагрузки.

Для поэтапного отката доступны `EVIDENCE_V2_WRITE=false`, `MASTERY_V2_SHADOW=false` и `MISSION_V7_ENABLED=false`. Эти флаги не удаляют уже записанные события; последний скрывает миссии и возвращает Today к обычным рекомендациям.

### Interview Director и AI evals

Новые интервью используют `engineVersion: 3`, отдельную коллекцию append-only ходов и versioned reducer `interview-director-v3`. Финальную ветку независимо оценивает blind assessor, а в Exam mode промежуточные оценки скрыты. Старые сессии продолжают читаться через прежний контракт. Быстрый rollback выполняется через `INTERVIEW_V3_ENABLED=false`.

Core evaluator зарегистрирован централизованно с версиями prompt/schema. Frozen corpus в `apps/api/src/learning/eval` replay-ится отдельным CI-gate `npm run test:ai-evals`: релиз блокируется при изменении ожидаемых переходов или утечке подсказки в Exam mode.

### Информационная архитектура

Верхний уровень состоит только из пяти устойчивых разделов:

| Раздел | Назначение |
| --- | --- |
| **Сегодня** | Следующий шаг, повторения, интервью, карьерные действия и активное исследование |
| **Подготовка** | Яндекс, Ozon, поиск работы, основной план и симулятор собеседования |
| **Навыки** | Skill Graph, доказательства, mastery и переход к остальным инструментам знаний |
| **Исследования** | Проекты от постановки вопроса до проверяемого вывода |
| **Ещё** | Расписание, уведомления, бэкап и подключение |

Маршруты управляются React Router и сохраняют открытый день, урок или исследование после перезагрузки страницы и в Android WebView.

## Быстрый старт

Понадобятся Node.js 22.13+ или 24+, npm и Docker. Рекомендуемая версия Node.js записана в `.nvmrc`.

```bash
cp .env.example .env
docker compose up -d mongo
npm install
npm run dev
```

После создания `.env` замените `APP_PASSWORD` и `JWT_SECRET`, затем откройте:

- клиент — `http://localhost:5173`;
- основной API — `http://localhost:3001/api/v1`;
- Evidence/Mastery/Decision API — `http://localhost:3001/api/v2`;
- Verified Checkpoint/Readiness API — `http://localhost:3001/api/v3`;
- health check — `http://localhost:3001/api/health`.

## Учебные треки

| Ключ | Назначение |
| --- | --- |
| `curriculum` | Основная 12-недельная программа |
| `course` | Персональный AI-курс |
| `yandex` | Трёхнедельный спринт перед секциями Яндекса |
| `ozon` | Двухнедельный спринт по материалам интервью Ozon |

Урок, квиз, практика и чат всех треков используют единый API:

```text
POST   /api/v1/learning/tracks/:trackKey/items/:itemId/lesson
POST   /api/v1/learning/tracks/:trackKey/items/:itemId/lesson/stream
POST   /api/v1/learning/tracks/:trackKey/items/:itemId/quiz
PUT    /api/v1/learning/tracks/:trackKey/items/:itemId/practice
GET    /api/v1/learning/tracks/:trackKey/items/:itemId/chat
POST   /api/v1/learning/tracks/:trackKey/items/:itemId/chat
POST   /api/v1/learning/tracks/:trackKey/items/:itemId/chat/stream
DELETE /api/v1/learning/tracks/:trackKey/items/:itemId/chat
```

Новый трек добавляется через `apps/api/src/learning/track-registry.ts`: достаточно описать дни, цель чата и инструкции генерации без новых контроллеров.

## Android

### Установка готовой версии

Последний APK публикуется в [GitHub Releases](https://github.com/620474/KnowsPreparation/releases/latest). Он подключается к тому же API и использует тот же прогресс, что и локальный web-клиент.

### Локальная сборка

Понадобятся Android Studio, Android SDK и JDK 21+.

```bash
npm run android:sync
npm run android:open
```

Для ручной debug-сборки:

```bash
cd apps/client/android
./gradlew assembleDebug
```

Результат появится в `apps/client/android/app/build/outputs/apk/debug/app-debug.apk`.

## Данные и офлайн-режим

- Прочитанные статьи и основной bootstrap кешируются в IndexedDB.
- Изменения прогресса сохраняются локально и синхронизируются после восстановления сети.
- Ответы Interview Director получают operation ID и остаются в durable outbox до подтверждения API.
- Решения практики имеют версии: более новая локальная работа не затирается старой серверной копией.
- В разделе «Ещё» можно экспортировать пользовательские данные в JSON и восстановить их через merge; в файл также входят грязные и конфликтные локальные черновики.
- В бэкап не входят пароль, JWT, адрес API и строка подключения MongoDB.
- Голосовая запись отправляется на API для расшифровки, но исходное аудио не сохраняется.

## Обновление материалов

Каталог находится в `apps/api/src/learning/data/resources.json`, а прогресс и настройки — в MongoDB.

1. Обновите JSON, сохранив стабильный уникальный `id` и HTTPS-ссылку.
2. Запустите `npm run typecheck && npm test`.
3. Отправьте изменения в GitHub.
4. Дождитесь автоматического деплоя API.

Статический контент загружается через `GET /api/v1/learning/bootstrap/content`, а изменяемый прогресс — через `GET /api/v1/learning/bootstrap/progress`.

Skill Graph и объяснимая readiness доступны через:

```text
GET /api/v1/learning/knowledge/skills
GET /api/v1/learning/knowledge/overview?target=general|yandex|ozon
GET /api/v1/learning/knowledge/skills/:skillId
GET /api/v1/learning/knowledge/v2/overview?target=general|yandex|ozon
GET /api/v1/learning/knowledge/v2/comparison?target=general|yandex|ozon
GET /api/v1/learning/knowledge/v2/skills/:skillId
```

Контракты v8 добавлены отдельно и не ломают установленный клиент v7:

```text
GET  /api/v2/learning/targets
POST /api/v2/learning/targets/from-vacancy
GET  /api/v2/learning/knowledge/overview?targetId=yandex
GET  /api/v2/learning/knowledge/skills/:skillId?targetId=yandex
GET  /api/v2/learning/decision/today?targetId=yandex&availableMinutes=120
POST /api/v2/learning/readiness/snapshots
POST /api/v2/learning/readiness/outcomes
GET  /api/v2/learning/readiness/calibration?targetId=yandex
GET  /api/v2/learning/ai/observability?days=30
```

<details>
<summary><strong>MongoDB Atlas и production API</strong></summary>

Для независимой работы компьютера и телефона:

1. Создайте MongoDB Atlas cluster и отдельного database user.
2. Разрешите подключение только с IP облачного API-сервера.
3. Разместите API через `Dockerfile.api` или обычный Node.js runtime.
4. Передайте API переменные `MONGODB_URI`, `APP_PASSWORD`, `JWT_SECRET`, `PORT` и `CLIENT_ORIGINS`.
5. В клиенте укажите HTTPS-адрес вида `https://your-api.example.com/api/v1`.

Никогда не добавляйте MongoDB connection string в Vite-переменные, Android-проект или Git.

</details>

<details>
<summary><strong>GitHub и Northflank</strong></summary>

Рекомендуемый поток выпуска:

```text
feature branch → pull request → GitHub Actions → merge в main → Northflank
```

Workflow `.github/workflows/ci.yml` запускает typecheck, lint, тесты и сборку для pull request и каждого обновления `main`.

Для первого деплоя:

1. Подключите репозиторий через Northflank GitHub App.
2. Создайте `Combined Service` из ветки `main`.
3. Выберите build context `/` и Dockerfile path `/Dockerfile.api`.
4. Откройте публичный HTTP-порт `3001`.
5. Добавьте runtime variables:

   ```text
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=<MongoDB Atlas URI с именем базы frontend_prep>
   APP_PASSWORD=<личный пароль, не менее 12 символов>
   JWT_SECRET=<случайная строка, не менее 32 символов>
   OPENAI_API_KEY=<ключ для AI-уроков, чата, оценки и расшифровки>
   OPENAI_MODEL=gpt-5.6-sol
   OPENAI_REVIEW_MODEL=gpt-5.6-terra
   OPENAI_AGENT_MODEL=gpt-5.6-terra
   OPENAI_RESEARCH_MODEL=gpt-5.6-sol
   OPENAI_RESEARCH_MODEL_COST_CLASS=sol
   OPENAI_RESEARCH_BACKGROUND_ENABLED=true
   OPENAI_REVIEW_MODEL_COST_CLASS=standard
   OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
   INTERVIEW_V2_ENABLED=true
   EVIDENCE_V3_WRITE=true
   MASTERY_V3_SHADOW=true
   INTERVIEW_V3_ENABLED=true
   PLANNER_V8_ENABLED=true
   READINESS_V8_ENABLED=true
   CHECKPOINT_V9_ENABLED=true
   EVIDENCE_V4_DUAL_WRITE=true
   READINESS_V9_EXPOSE=true
   DECISION_V9_ENABLED=true
   ```

6. Настройте проверки контейнера:
   - startup и readiness — `GET /api/health`;
   - liveness — `GET /api/health/live`.
7. Укажите в web-клиенте и Android адрес `https://<northflank-domain>/api/v1`.

Для Atlas рекомендуется выделенный Northflank egress IP с правилом `/32`. Доступ `0.0.0.0/0` допустим только для короткой первичной проверки.

API пишет структурированные JSON-логи и добавляет `X-Request-Id`, но не логирует авторизацию, cookie, AI-запросы и пользовательские ответы.

</details>

<details>
<summary><strong>Версии и релизы</strong></summary>

Версия определяется Git-тегами и Conventional Commits. После успешного push в `main` запускается `semantic-release`, создаётся GitHub Release и прикладывается APK `KnowsPreparation-vX.Y.Z.apk`.

- `fix: ...` — patch: `1.0.0` → `1.0.1`;
- `feat: ...` — minor: `1.0.0` → `1.1.0`;
- `feat!: ...` или `BREAKING CHANGE:` — major: `1.0.0` → `2.0.0`;
- `docs:`, `test:`, `chore:` — сами по себе релиз не создают.

Поля `version` в workspace-пакетах содержат `0.0.0-semantic-release`: фактическая версия берётся из Git-тега. Android `versionName` и `versionCode` вычисляются из той же версии.

APK подписывается постоянным ключом из GitHub Secret `ANDROID_DEBUG_KEYSTORE_BASE64`. Его нельзя добавлять в репозиторий или заменять, иначе Android не сможет установить обновление поверх существующего приложения.

Локальная проверка конфигурации:

```bash
npm run release:dry-run
```

</details>

## Стек

| Слой | Технологии |
| --- | --- |
| Client | React, TypeScript, React Router, Mantine, Vite, TanStack Query |
| Android | Capacitor, Android SDK, локальные уведомления и запись голоса |
| API | NestJS, TypeScript, SSE, JWT |
| Data | MongoDB, Mongoose, IndexedDB |
| AI | OpenAI API, потоковая генерация, транскрипция и оценка |
| Practice | QuickJS, тест-кейсы и изолированный запуск решений |
| Delivery | Docker, GitHub Actions, semantic-release, Northflank |

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Структура проекта

```text
apps/
├── api/                         NestJS API и MongoDB-модели
│   └── src/
│       ├── career/              вакансии, интервью и карьерные действия
│       ├── learning/            треки, прогресс, AI и интервью
│       └── research/            отдельный HTTP-модуль исследований
└── client/                      React, Mantine и Capacitor Android
    └── src/
        ├── features/            подготовка, знания, поиск работы и исследования
        ├── components/          общие учебные инструменты и App Shell
        └── hooks/               навигация и доменные действия
packages/
└── contracts/                   общие Zod-контракты API и клиента
```

## Версия 5

Версия 5 перестраивает приложение вокруг задач пользователя, а не количества функций: пять стабильных разделов, отдельные центры «Подготовка» и «Знания», полноценные вложенные маршруты и изолированный API-модуль исследований. Данные MongoDB и существующий прогресс остаются совместимыми.

---

<div align="center">

**Учись → практикуйся → проходи интервью → разбирай результат**

[Скачать последнюю версию](https://github.com/620474/KnowsPreparation/releases/latest) · [Открыть репозиторий](https://github.com/620474/KnowsPreparation)

</div>
