# Frontend Sprint

Персональный трекер подготовки к frontend-собеседованиям. Один React-интерфейс
работает как локальный сайт на компьютере и как Android-приложение. Оба клиента
синхронизируют прогресс через защищённый NestJS API и одну MongoDB.

## Что внутри

- план на 10 основных и 2 буферные недели;
- 120 минут в день, включая 30-минутный AI-блок в первые четыре недели;
- 110 вопросов для самопроверки, включая отдельный блок по тестированию;
- 225 проверенных источников в серверном JSON-каталоге;
- трекер 60–80 алгоритмических задач;
- общий прогресс для компьютера и Android;
- JSON-бэкап и восстановление прогресса;
- локальные Android-напоминания, голосовые ответы в моках и JS-песочница;
- вход по личному паролю и JWT;
- MongoDB доступна только API, но не клиентским приложениям.

## Архитектура

```text
Локальный web-клиент ─┐
                      ├── HTTPS API (NestJS) ── MongoDB Atlas
Локальный Android APK ┘
```

Frontend не нужно размещать в интернете. Чтобы телефон работал при выключенном
компьютере, API и MongoDB должны быть доступны постоянно.

## Локальный запуск

Требуются Node.js 22.13+ или 24+, npm и Docker. Рекомендуемая версия записана в
`.nvmrc`.

1. Создать локальный конфиг:

   ```bash
   cp .env.example .env
   ```

2. Заменить `APP_PASSWORD` и `JWT_SECRET` в `.env`.
3. Запустить MongoDB:

   ```bash
   docker compose up -d mongo
   ```

4. Установить зависимости и запустить API с клиентом:

   ```bash
   npm install
   npm run dev
   ```

5. Открыть `http://localhost:5173`. Адрес API по умолчанию —
   `http://localhost:3001/api/v1`.

## Общая MongoDB

Для работы устройств независимо друг от друга:

1. Создать MongoDB Atlas cluster и отдельного database user.
2. Разрешить подключение к Atlas только с IP облачного API-сервера.
3. Разместить только API, используя `Dockerfile.api` или обычный Node.js runtime.
4. Передать API переменные `MONGODB_URI`, `APP_PASSWORD`, `JWT_SECRET`, `PORT` и
   `CLIENT_ORIGINS`.
5. В клиенте указать HTTPS-адрес вида `https://your-api.example.com/api/v1`.

Не добавляйте MongoDB connection string в Vite-переменные или Android-проект.

## GitHub и Northflank

Рекомендуемый поток выпуска API:

```text
feature branch → pull request → GitHub Actions → merge в main → Northflank
```

Workflow `.github/workflows/ci.yml` запускает typecheck, lint, тесты и сборку для
pull request и каждого обновления `main`. В GitHub рекомендуется защитить ветку
`main` и разрешать merge только после успешной проверки `Validate`.

Для первого деплоя:

1. Создать приватный GitHub-репозиторий и не добавлять в него `.env`.
2. Подключить этот репозиторий через Northflank GitHub App.
3. Создать `Combined Service`, выбрать ветку `main` и сборку через Dockerfile.
4. Указать build context `/` и Dockerfile path `/Dockerfile.api`.
5. Открыть публичный HTTP-порт `3001`.
6. Добавить runtime secret group:

   ```text
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=<MongoDB Atlas URI с именем базы frontend_prep>
   APP_PASSWORD=<личный пароль, не менее 12 символов>
   JWT_SECRET=<случайная строка, не менее 32 символов>
   OPENAI_API_KEY=<ключ для AI-уроков, чата, оценки и расшифровки голоса>
   OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
   ```

   `CLIENT_ORIGINS` нужен только для дополнительных web-origin. Локальный Vite
   и Capacitor уже разрешены API.

7. Настроить проверки контейнера на порту `3001`:
   - startup и readiness: `GET /api/health`;
   - liveness: `GET /api/health/live`.
8. После деплоя указать в web-клиенте и Android адрес
   `https://<northflank-domain>/api/v1`.

API пишет структурированные JSON-логи, добавляет `X-Request-Id` к каждому ответу
и сохраняет этот идентификатор в связанных сообщениях. Авторизация, cookie,
тексты AI-запросов и пользовательские ответы в логи не попадают. При закрытии
страницы активный SSE-запрос отменяет генерацию OpenAI.

Для монорепозитория можно включить allow list путей сборки:

```text
apps/api/**
apps/client/package.json
package.json
package-lock.json
tsconfig.base.json
Dockerfile.api
.dockerignore
```

Для production-доступа к Atlas используйте выделенный Northflank egress IP и
добавьте в Atlas только этот адрес `/32`. Доступ `0.0.0.0/0` допустим лишь для
короткой первичной проверки. По возможности выбирайте один облачный регион для
Northflank и Atlas.

## Обновление каталога без нового APK

Каталог хранится на backend в
`apps/api/src/learning/data/resources.json`. Прогресс и настройки остаются в
MongoDB.

Чтобы добавить или изменить материал:

1. Обновить JSON, сохраняя стабильный уникальный `id` и HTTPS-ссылку.
2. Запустить `npm run typecheck && npm test`.
3. Отправить изменения в GitHub.
4. Дождаться автоматического деплоя API в Northflank.

Клиент получает кешируемые `curriculum`, спринты, `resources` и `questions`
через `GET /api/v1/learning/bootstrap/content`, а изменяемый прогресс — через
`GET /api/v1/learning/bootstrap/progress`. Поэтому изменения контента не требуют
пересборки APK. Новая версия APK нужна только при изменении React-интерфейса или
клиентской логики.

## Учебные треки

AI-разбор, проверочный тест, практику с запуском кода и чат поддерживают четыре
трека: `course` (персональный AI-курс), `curriculum` (12-недельный учебный план),
`yandex` и `ozon`. Все они работают через один набор адресов:

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

Новый трек добавляется записью в `apps/api/src/learning/track-registry.ts`:
дни, цель для чата и инструкции промпта. Правки в контроллере не нужны.

## Бэкап прогресса

В разделе «Ещё» можно экспортировать все пользовательские данные в версионированный
JSON и восстановить их позже. Импорт работает как merge: добавляет и обновляет
записи, но не удаляет уже существующие. В файл не попадают пароль, JWT, адрес API
и MongoDB connection string.

На Android тот же раздел позволяет включить ежедневное локальное напоминание.
Для голосового ответа в мок-интервью приложение запрашивает доступ к микрофону,
отправляет запись на API для расшифровки и не сохраняет исходное аудио.

## Android

Требуются Android Studio, Android SDK и JDK 21+.

```bash
npm run android:sync
npm run android:open
```

Первая команда собирает React-клиент и копирует bundle внутрь Android-проекта.
Вторая открывает проект в Android Studio, где можно установить debug-версию на
телефон или собрать подписанный APK. Публичный сайт для работы APK не нужен.

Debug APK собирается командой:

```bash
cd apps/client/android
./gradlew assembleDebug
```

Результат: `apps/client/android/app/build/outputs/apk/debug/app-debug.apk`.

## Версии и релизы

Версия релиза определяется Git-тегами и Conventional Commits. После успешных
проверок push в `main` запускает `semantic-release`, создаёт GitHub Release и
прикладывает APK с именем `KnowsPreparation-vX.Y.Z.apk`. Android `versionName`
и возрастающий `versionCode` вычисляются из той же SemVer-версии во время сборки.
Поля `version` в workspace-пакетах намеренно содержат
`0.0.0-semantic-release`: фактическая версия берётся из Git-тега и не меняется
отдельным release-коммитом.
Релиз подписывается постоянным ключом из GitHub Secret
`ANDROID_DEBUG_KEYSTORE_BASE64`; ключ нельзя добавлять в репозиторий или заменять,
иначе Android не сможет установить новую версию поверх существующей.

- `fix: ...` — patch-релиз: `1.0.0` → `1.0.1`;
- `feat: ...` — minor-релиз: `1.0.0` → `1.1.0`;
- `feat!: ...` или `BREAKING CHANGE:` — major-релиз: `1.0.0` → `2.0.0`;
- `docs:`, `test:`, `chore:` — сами по себе релиз не создают.

Версии и release notes не нужно менять вручную. Локальная проверка конфигурации:

```bash
npm run release:dry-run
```

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Основные каталоги

- `apps/client` — React, Mantine, Vite и Capacitor Android;
- `apps/client/src/hooks` — навигация и доменные действия интерфейса;
- `apps/api` — NestJS, авторизация и MongoDB-модели;
- `apps/api/src/learning/track-registry.ts` — единая конфигурация учебных треков;
- `apps/api/src/learning/curriculum.ts` — учебная программа и банк вопросов.
- `apps/api/src/learning/data/resources.json` — серверный каталог материалов.
