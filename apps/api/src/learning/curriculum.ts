import type {
  QuestionCapability,
  QuestionExercise,
  SkillKey,
  StudyBlock,
  StudyBlockKind,
  StudyDay,
  StudyExercise,
  StudyExerciseExample,
  StudyExerciseRunner,
  StudyExerciseTestCase,
  StudyWeek,
} from "@prep/contracts";

import { getResourceIdsForBlock } from "./resources";
import { getExerciseRunner } from "./exercise-runners";
import { getQuestionTraining } from "./question-training";

export type {
  StudyBlock,
  StudyBlockKind,
  StudyDay,
  StudyExercise,
  StudyExerciseExample,
  StudyExerciseRunner,
  StudyExerciseTestCase,
  StudyWeek,
};

interface WeekDefinition {
  title: string;
  outcome: string;
  taskKey?: string;
  isBuffer?: boolean;
  theory: string[];
  practice: string[];
}

const WEEK_DEFINITIONS: WeekDefinition[] = [
  {
    title: "JS: выполнение кода",
    outcome: "Уверенно объяснять выполнение JavaScript и решать задачи на массивы и хэши.",
    theory: [
      "Контексты выполнения и стек вызовов",
      "Типы, преобразования и сравнения",
      "Области видимости, hoisting и TDZ",
      "Event loop: задачи и очереди",
      "Микрозадачи, макрозадачи и рендер",
      "Сборка мусора и удержание памяти",
      "Повторение JS runtime",
    ],
    practice: [
      "Разобрать порядок вывода event loop",
      "Решить задачи на frequency map",
      "Реализовать Two Sum",
      "Сгруппировать анаграммы",
      "Реализовать debounce",
      "Сделать clone с циклическими ссылками",
      "Мини-мок по JS core",
    ],
  },
  {
    title: "JS: функции и объекты",
    outcome: "Понимать замыкания, this и прототипы; освоить два указателя и скользящее окно.",
    theory: [
      "Замыкания и лексическое окружение",
      "this и правила привязки контекста",
      "call, apply, bind",
      "ООП в JavaScript: прототипы, инкапсуляция и полиморфизм",
      "Классы JS/TS: private, interface, abstract и контракт",
      "Каррирование и композиция функций",
      "Утечки памяти через замыкания",
    ],
    practice: [
      "Исправить var в асинхронном цикле",
      "Реализовать собственный bind",
      "Реализовать curry(fn)",
      "Реализовать EventEmitter с закрытым состоянием",
      "Спроектировать WebSocketClient через композицию",
      "Минимальное окно в строке",
      "Мини-мок: функции и объекты",
    ],
  },
  {
    title: "Асинхронность и структуры",
    outcome: "Свободно работать с Promise и решать задачи со стеком, очередью и бинарным поиском.",
    theory: [
      "Состояния и цепочки Promise",
      "async/await и обработка ошибок",
      "Параллельность и последовательность",
      "AbortController и отмена запросов",
      "Генераторы и итераторы",
      "Стек, очередь и дек",
      "Бинарный поиск и инвариант",
    ],
    practice: [
      "Реализовать Promise.all",
      "Реализовать Promise.allSettled",
      "Ограничить параллельность запросов",
      "Проверить валидность скобок",
      "Сделать очередь на двух стеках",
      "Найти первый и последний индекс",
      "Мини-мок по асинхронности",
    ],
  },
  {
    title: "React internals",
    outcome: "Объяснять reconciliation, Fiber и фазы рендера на уровне middle+.",
    theory: [
      "Reconciliation и идентичность элементов",
      "Ключи в списках",
      "Fiber и прерываемый render",
      "Фазы render и commit",
      "Batching обновлений",
      "Приоритеты и concurrent rendering",
      "React Compiler обзорно",
    ],
    practice: [
      "Найти ошибки ключей в списке",
      "Разобрать причины повторного рендера",
      "Нарисовать дерево Fiber",
      "Объяснить render/commit за 5 минут",
      "Исправить лишние обновления состояния",
      "Разобрать transition-сценарий",
      "Мини-мок по React internals",
    ],
  },
  {
    title: "React hooks и состояние",
    outcome: "Предсказывать поведение хуков и выбирать инструмент состояния под задачу.",
    theory: [
      "Механика и порядок хуков",
      "Зависимости useEffect",
      "Устаревшие замыкания",
      "useMemo, useCallback и memo",
      "Context, controlled state и границы обновлений",
      "TanStack Query, RTK и Zustand",
      "Кастомные хуки и жизненный цикл внешней подписки",
    ],
    practice: [
      "Исправить условный вызов хука",
      "Устранить цикл useEffect",
      "Исправить stale closure",
      "Профилировать бесполезную мемоизацию",
      "Разделить Context и стабилизировать значения",
      "Спроектировать server state",
      "Реализовать состояние useWebSocket без stale closure",
    ],
  },
  {
    title: "TypeScript и деревья",
    outcome: "Типизировать сложные API без any и уверенно обходить деревья и графы.",
    theory: [
      "Generics и ограничения типов",
      "Conditional types и infer",
      "Mapped types",
      "Дискриминированные объединения",
      "unknown, never и narrowing",
      "Вариантность функций",
      "BFS, DFS и представление графа",
    ],
    practice: [
      "Типизировать универсальный fetch",
      "Извлечь тип элемента через infer",
      "Собрать DeepReadonly",
      "Описать state machine загрузки",
      "Убрать any из внешнего ответа",
      "Объяснить контравариантность",
      "Реализовать BFS и DFS",
    ],
  },
  {
    title: "Производительность и платформа",
    outcome: "Диагностировать медленный интерфейс и понимать браузерный pipeline.",
    theory: [
      "Critical Rendering Path",
      "Reflow, repaint и composite",
      "LCP, INP и CLS",
      "Code splitting и lazy loading",
      "Виртуализация списков",
      "Кэширование HTTP",
      "Базовый dynamic programming",
    ],
    practice: [
      "Разметить путь первого рендера",
      "Найти layout thrashing",
      "Составить план улучшения CWV",
      "Разбить тяжёлый bundle",
      "Спроектировать виртуальный список",
      "Настроить стратегию кэша",
      "Решить лестницу и Кадане",
    ],
  },
  {
    title: "Браузер и Frontend System Design",
    outcome: "Структурированно проектировать крупные клиентские приложения.",
    theory: [
      "HTTP/2, HTTP/3 и TLS",
      "CORS, preflight и cookies",
      "CSS cascade, Flexbox и Grid",
      "Семантика, ARIA и клавиатура",
      "Бесконечная лента",
      "WebSocket: lifecycle, heartbeat, reconnect и backoff",
      "Offline и оптимистичные обновления",
    ],
    practice: [
      "Разобрать сетевой waterfall",
      "Спроектировать безопасную сессию",
      "Сверстать адаптивный layout мысленно",
      "Провести a11y-аудит компонента",
      "Спроектировать ленту",
      "Реализовать reconnect с exponential backoff и jitter",
      "Спроектировать offline-first экран",
    ],
  },
  {
    title: "ООП и принципы проектирования",
    outcome: "Применять ООП, SOLID, DRY и KISS к frontend-коду и защищать выбранные компромиссы.",
    theory: [
      "ООП в JavaScript: инкапсуляция, полиморфизм и прототипы",
      "SOLID на примерах React и TypeScript",
      "DRY, DAMP, KISS и YAGNI без догматизма",
      "Композиция, dependency injection и границы объектов",
      "Cohesion, coupling и публичные API модулей",
      "Code review архитектурного решения",
      "Мини-мок по ООП и принципам проектирования",
    ],
    practice: [
      "Спрятать состояние EventEmitter и сохранить полиморфный контракт",
      "Разделить React-модель по SRP и расширить через OCP",
      "Упростить переабстрагированный код по KISS и YAGNI",
      "Спроектировать WebSocketClient через композицию и DI",
      "Разделить модуль на связные части со стабильным public API",
      "Провести code review нарушения SOLID",
      "Защитить архитектурные trade-offs вслух",
    ],
  },
  {
    title: "Моки и выход на рынок",
    outcome: "Стабильно проходить смешанное интервью и начать целевые процессы.",
    theory: [
      "Структура технического ответа",
      "Стратегия live coding",
      "Frontend System Design под таймер",
      "Поведенческая секция",
      "Разбор ошибок первого мока",
      "Стратегия параллельных откликов",
      "Стратегия тестирования frontend-приложения",
    ],
    practice: [
      "Мок JS + TypeScript",
      "Мок React + браузер",
      "Мок алгоритмов",
      "Мок System Design",
      "Повторный мок слабой секции",
      "Подготовить список компаний и отклики",
      "Написать unit, integration и E2E-тесты одного сценария",
    ],
  },
  {
    title: "Тестирование frontend-приложений",
    outcome: "Выбирать уровень тестирования и уверенно проверять функции, React-компоненты и пользовательские сценарии.",
    taskKey: "testing",
    theory: [
      "Пирамида тестирования и выбор уровня",
      "Unit-тесты и Vitest",
      "React Testing Library и поведение пользователя",
      "Test doubles: mock, stub, spy и fake",
      "Интеграционные тесты асинхронного UI",
      "E2E с Playwright и устойчивые локаторы",
      "Покрытие, flaky-тесты и тесты в CI",
    ],
    practice: [
      "Составить стратегию тестов для frontend-фичи",
      "Написать unit-тесты чистой функции",
      "Протестировать React-компонент через роль и текст",
      "Изолировать API и таймеры тестовыми дублями",
      "Проверить loading, success и error состояния",
      "Написать E2E критического пользовательского пути",
      "Найти причины flaky-теста и защитить решение",
    ],
  },
  {
    title: "Буфер: финальная готовность",
    outcome: "Выйти на интервью без накопленного долга и с готовыми историями.",
    isBuffer: true,
    theory: [
      "Разбор обратной связи с моков",
      "Повтор ключевых internals",
      "Повтор Big-O и паттернов",
      "Повтор архитектурных trade-offs",
      "Подготовка вопросов команде",
      "Переговоры о грейде и вилке",
      "Лёгкое повторение перед интервью",
    ],
    practice: [
      "Исправить три ошибки из моков",
      "Объяснить React и event loop вслух",
      "Решить две задачи под таймер",
      "Провести System Design под таймер",
      "Составить вопросы работодателю",
      "Отрепетировать разговор о грейде",
      "Финальное интервью без подсказок",
    ],
  },
];

export const AI_SPRINT_DAYS = [
  {
    title: "AGENTS.md и инструкции проекта",
    description: "Создать короткий AGENTS.md: команды, ограничения, критерии готовности и правила проверки.",
    resourceIds: ["ai-assisted-02"],
  },
  {
    title: "Explore → plan → code",
    description: "Провести одну небольшую задачу через исследование, спецификацию, реализацию и проверку.",
    resourceIds: ["ai-assisted-01"],
  },
  {
    title: "AI как проверяемый напарник",
    description: "Составить личный чек-лист проверки diff, API, тестов и утверждений модели.",
    resourceIds: ["ai-assisted-03"],
  },
  {
    title: "Tokens и context window",
    description: "Рассчитать бюджет контекста для двадцатиминутного интервью и определить правила trimming.",
    resourceIds: ["ai-engineering-01"],
  },
  {
    title: "System prompt и данные пользователя",
    description: "Разделить постоянные инструкции, rubric, примеры и недоверенный пользовательский ввод.",
    resourceIds: ["ai-engineering-02"],
  },
  {
    title: "Workflow или автономный агент",
    description: "Выбрать минимальную архитектуру для одной функции тренажёра и обосновать уровень автономности.",
    resourceIds: ["ai-assisted-09", "ai-agent-javascript-kevin-yank"],
  },
  {
    title: "Инструкции для разных AI-инструментов",
    description: "Сравнить AGENTS.md и vendor-specific инструкции, не дублируя общий контекст.",
    resourceIds: ["ai-assisted-12"],
  },
  {
    title: "Structured Outputs",
    description: "Описать EvaluationResult через JSON Schema или Zod и добавить негативные примеры.",
    resourceIds: ["ai-engineering-03"],
  },
  {
    title: "Function calling и tools",
    description: "Спроектировать read-only tool, allowlist аргументов и серверную авторизацию.",
    resourceIds: ["ai-engineering-04"],
  },
  {
    title: "Типизированный AI provider",
    description: "Набросать интерфейс провайдера генерации, usage, finish reason и переключения модели.",
    resourceIds: ["ai-engineering-12"],
  },
  {
    title: "Production checklist",
    description: "Зафиксировать timeout, retries, quotas, logs, fallback и хранение секретов на backend.",
    resourceIds: ["ai-engineering-05"],
  },
  {
    title: "Rate limits и bounded concurrency",
    description: "Спроектировать semaphore, backoff с jitter и ограничение запросов на пользователя.",
    resourceIds: ["ai-engineering-06"],
  },
  {
    title: "Классификация ошибок API",
    description: "Разделить validation, auth, rate-limit, provider и network errors по retryability.",
    resourceIds: ["ai-engineering-21"],
  },
  {
    title: "Стоимость AI-функции",
    description: "Посчитать примерный бюджет одной сессии и определить лимиты tokens, retries и regeneration.",
    resourceIds: ["ai-engineering-22"],
  },
  {
    title: "Provider streaming",
    description: "Преобразовать события провайдера во внутренний типизированный протокол приложения.",
    resourceIds: ["ai-engineering-07"],
  },
  {
    title: "SSE-протокол",
    description: "Описать события start, delta, done и error, включая идентификатор запуска.",
    resourceIds: ["ai-engineering-08"],
  },
  {
    title: "ReadableStream и TextDecoder",
    description: "Разобрать обработку chunks, UTF-8 границ и incremental parser для POST-streaming.",
    resourceIds: ["ai-engineering-09"],
  },
  {
    title: "End-to-end cancellation",
    description: "Провести AbortSignal от React через backend до provider stream и состояния cancelled.",
    resourceIds: ["mdn-abortcontroller"],
  },
  {
    title: "Streaming в NestJS",
    description: "Сравнить @Sse(), ручной response.write() и streaming POST для тренажёра.",
    resourceIds: ["ai-engineering-11"],
  },
  {
    title: "Состояния AI-интерфейса",
    description: "Спроектировать idle, submitting, streaming, stopped, failed и completed с Retry и Regenerate.",
    resourceIds: ["ai-engineering-13"],
  },
  {
    title: "Доступность streaming UI",
    description: "Добавить план aria-live сообщений для старта, остановки, ошибки и завершения.",
    resourceIds: ["ai-engineering-20"],
  },
  {
    title: "RAG и MongoDB Vector Search",
    description: "Спроектировать document → chunk → embedding → index → retrieval с metadata filters.",
    resourceIds: ["ai-engineering-15"],
  },
  {
    title: "Минимальный vector search",
    description: "Описать индекс, top-k, numCandidates, score и формат возвращаемых источников.",
    resourceIds: ["ai-engineering-19"],
  },
  {
    title: "Prompt injection и tool abuse",
    description: "Составить threat model: недоверенный контекст, allowlist tools, least privilege и audit log.",
    resourceIds: ["ai-engineering-16"],
  },
  {
    title: "Golden dataset и evals",
    description: "Подготовить набор обычных, граничных и ошибочных ответов с проверяемыми критериями.",
    resourceIds: ["ai-engineering-17"],
  },
  {
    title: "Error analysis",
    description: "Разметить ошибки тренажёра и превратить их в taxonomy, dataset и regression checks.",
    resourceIds: ["ai-engineering-18"],
  },
  {
    title: "AI в российском бигтехе",
    description: "Подготовить объяснение, зачем компаниям внутренние ассистенты и как измерять их качество.",
    resourceIds: ["ai-assisted-35"],
  },
  {
    title: "Spec-driven итог и презентация",
    description: "Подготовить десятиминутный рассказ: задача, архитектура, риски, evals и личный вклад.",
    resourceIds: ["ai-assisted-29", "ai-assisted-30"],
  },
] as const;

const dayNames = [
  "Фундамент",
  "Углубление",
  "Механика",
  "Практика",
  "Закрепление",
  "Интервью-режим",
  "Контроль недели",
];

const CURRICULUM_EXERCISES: Record<string, Omit<StudyExercise, "runner">> = {
  "w02-d04-practice": {
    statement: "Реализуй EventEmitter. Обработчики должны храниться внутри экземпляра, подписка должна возвращать функцию отписки, а emit — вызывать актуальные обработчики с переданными аргументами.",
    signature: "class EventEmitter { on(event, handler): () => void; emit(event, ...args): void }",
    constraints: [
      "Не используй глобальное состояние",
      "Повторная отписка не должна приводить к ошибке",
      "Разные события не должны влиять друг на друга",
    ],
    examples: [
      {
        input: "on('message', handler); emit('message', 'hello')",
        output: "handler получает 'hello'",
      },
    ],
  },
  "w02-d05-practice": {
    statement: "Реализуй SocketClient, который не наследуется от транспорта, а получает transport и retryPolicy через конструктор. Клиент должен управлять состоянием и планировать переподключение после закрытия.",
    signature: "class SocketClient { connect(): void; handleOpen(): void; handleClose(): number; getState(): string }",
    constraints: [
      "Используй композицию и dependency injection",
      "После успешного открытия сбрасывай номер попытки",
      "handleClose должен вернуть выбранную задержку",
    ],
    examples: [
      {
        input: "connect(); handleOpen(); handleClose()",
        output: "transport.schedule получает повторный connect",
      },
    ],
  },
  "w05-d07-practice": {
    statement: "Реализуй чистый reducer для состояния useWebSocket. Он должен обрабатывать connect, open, message, error и close без мутации предыдущего состояния.",
    signature: "socketReducer(state, event): SocketState",
    constraints: [
      "Не изменяй state и массив messages",
      "Неизвестное событие должно вернуть прежний объект",
      "message добавляет данные в конец списка",
    ],
    examples: [
      {
        input: "socketReducer({ status: 'open', messages: [] }, { type: 'message', data: 'hi' })",
        output: "{ status: 'open', messages: ['hi'], error: null }",
      },
    ],
  },
  "w08-d06-practice": {
    statement: "Реализуй расчёт задержки переподключения с exponential backoff, верхним лимитом и управляемым jitter. Функция понадобится внутри useWebSocket.",
    signature: "getReconnectDelay(attempt, baseDelay, maxDelay, jitter): number",
    constraints: [
      "attempt начинается с нуля",
      "Результат не должен превышать maxDelay",
      "jitter находится в диапазоне от -1 до 1 и делает тесты детерминированными",
    ],
    examples: [
      { input: "getReconnectDelay(3, 500, 30000, 0)", output: "4000" },
      { input: "getReconnectDelay(10, 500, 30000, 0)", output: "30000" },
    ],
  },
  "w09-d01-practice": {
    statement: "Реализуй EventEmitter с инкапсулированным состоянием. Подписчики не должны получать доступ к внутренней коллекции, а разные события должны оставаться независимыми.",
    signature: "class EventEmitter { on(event, handler): () => void; emit(event, ...args): void }",
    constraints: [
      "Храни состояние внутри экземпляра",
      "on возвращает идемпотентную функцию отписки",
      "Изменение подписок во время emit не должно ломать текущий обход",
    ],
    examples: [{ input: "on('message', handler); emit('message', 1)", output: "handler получает 1" }],
  },
  "w09-d02-practice": {
    statement: "Реализуй расширяемый обработчик уведомлений. Основная функция не должна содержать цепочку if для каждого нового канала.",
    signature: "createNotifier(channels).notify(channel, message): unknown",
    constraints: [
      "Следуй OCP: новый канал добавляется регистрацией обработчика",
      "Неизвестный канал должен завершаться понятной ошибкой",
      "Не привязывай notifier к конкретному транспорту",
    ],
    examples: [{ input: "createNotifier({ email: sendEmail }).notify('email', 'hi')", output: "результат sendEmail('hi')" }],
  },
  "w09-d03-practice": {
    statement: "Упрости фабрику форматирования: оставь минимальный контракт и убери преждевременную иерархию классов, сохранив поддержку разных форматов.",
    signature: "formatValue(value, formatter): string",
    constraints: [
      "Решение должно использовать простой полиморфный callback",
      "Не создавай абстракцию для единственного сценария",
      "Исходное значение не должно изменяться",
    ],
    examples: [{ input: "formatValue(10, value => `${value} ₽`)", output: "10 ₽" }],
  },
  "w09-d04-practice": {
    statement: "Спроектируй SocketClient, которому transport и retryPolicy передаются извне. Клиент управляет соединением, но не знает деталей WebSocket и расчёта задержки.",
    signature: "class SocketClient { connect(): void; handleOpen(): void; handleClose(): number }",
    constraints: [
      "Используй композицию и dependency injection",
      "После открытия сбрасывай номер попытки",
      "При закрытии планируй следующий connect через transport.schedule",
    ],
    examples: [{ input: "connect(); handleOpen(); handleClose()", output: "запланирован reconnect с задержкой retryPolicy(0)" }],
  },
  "w09-d05-practice": {
    statement: "Раздели модуль профиля пользователя на связные части: получение данных, преобразование view model и отображение. Опиши публичный API и направление зависимостей.",
    signature: "Текстовая архитектурная задача",
    constraints: [
      "Назови ответственность каждого модуля",
      "Не допускай импорт UI из data-слоя",
      "Объясни, какие детали должны остаться приватными",
    ],
    examples: [{ input: "API response → profile feature → UI", output: "явные границы и стабильный public API" }],
  },
  "w09-d06-practice": {
    statement: "Проведи code review компонента, который одновременно загружает данные, открывает WebSocket, форматирует DTO и рисует таблицу. Найди нарушения принципов и предложи минимальный рефакторинг.",
    signature: "Текстовый code review",
    constraints: [
      "Не дроби код только ради количества файлов",
      "Свяжи каждое изменение с конкретной проблемой",
      "Укажи цену и риск предлагаемого рефакторинга",
    ],
    examples: [{ input: "God component с четырьмя ответственностями", output: "план из 2–4 проверяемых изменений" }],
  },
  "w09-d07-practice": {
    statement: "За 20 минут защити архитектуру realtime-экрана: границы компонентов, состояние, transport, reconnect, тестирование и осознанные нарушения SOLID.",
    signature: "Устный архитектурный мок",
    constraints: [
      "Сначала сформулируй требования и ограничения",
      "Назови минимум две альтернативы",
      "Заверши рисками и способом проверить решение",
    ],
    examples: [{ input: "Realtime dashboard", output: "структурированный ответ с trade-offs" }],
  },
};

const getCurriculumExercise = (blockId: string): StudyExercise | undefined => {
  const exercise = CURRICULUM_EXERCISES[blockId];
  return exercise ? { ...exercise, runner: getExerciseRunner(blockId) } : undefined;
};

export const CURRICULUM: StudyWeek[] = WEEK_DEFINITIONS.map((definition, weekIndex) => {
  const weekNumber = weekIndex + 1;
  const taskSuffix = definition.taskKey ? `-${definition.taskKey}` : "";
  return {
    number: weekNumber,
    title: definition.title,
    outcome: definition.outcome,
    isBuffer: definition.isBuffer ?? false,
    days: dayNames.map((dayName, dayIndex) => {
      const dayNumber = dayIndex + 1;
      const dayId = `w${String(weekNumber).padStart(2, "0")}-d${String(dayNumber).padStart(2, "0")}`;
      const aiSprintDay = AI_SPRINT_DAYS[weekIndex * 7 + dayIndex];
      const mainBlockMinutes = aiSprintDay ? 40 : 50;
      const reviewMinutes = aiSprintDay ? 10 : 20;
      const practiceBlockId = `${dayId}-practice${taskSuffix}`;
      return {
        id: dayId,
        dayNumber,
        offset: weekIndex * 7 + dayIndex,
        title: dayName,
        blocks: [
          {
            id: `${dayId}-theory${taskSuffix}`,
            kind: "theory" as const,
            title: definition.theory[dayIndex] ?? "Повтор теории",
            description: `${mainBlockMinutes} минут: изучить механику и подготовить объяснение на 3–5 минут.`,
            minutes: mainBlockMinutes,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "theory"),
          },
          {
            id: practiceBlockId,
            kind: "practice" as const,
            title: definition.practice[dayIndex] ?? "Практическая задача",
            description: `${mainBlockMinutes} минут: решить самостоятельно, затем разобрать альтернативы и Big-O.`,
            minutes: mainBlockMinutes,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "practice"),
            exercise: getCurriculumExercise(practiceBlockId),
          },
          ...(aiSprintDay
            ? [
                {
                  id: `${dayId}-ai`,
                  kind: "ai" as const,
                  title: aiSprintDay.title,
                  description: `30 минут: ${aiSprintDay.description}`,
                  minutes: 30,
                  resourceIds: [...aiSprintDay.resourceIds],
                },
              ]
            : []),
          {
            id: `${dayId}-review${taskSuffix}`,
            kind: "review" as const,
            title: "Короткое повторение и журнал",
            description: `${reviewMinutes} минут: зафиксировать выводы и проверить результат недели «${definition.title}».`,
            minutes: reviewMinutes,
            resourceIds: [],
          },
        ],
      };
    }),
  };
});

export const CURRICULUM_CORE_WEEKS = CURRICULUM.filter((week) => !week.isBuffer).length;
export const CURRICULUM_BUFFER_WEEKS = CURRICULUM.filter((week) => week.isBuffer).length;

export interface InterviewQuestion {
  id: string;
  number: number;
  category: string;
  prompt: string;
  skillKeys?: SkillKey[];
  capabilities?: QuestionCapability[];
  exercise?: QuestionExercise;
}

const questionGroups: Array<[string, string[]]> = [
  [
    "JS core",
    [
      "Порядок вывода при смеси setTimeout, Promise и queueMicrotask — объясни через микро- и макротаски.",
      "Что печатает цикл с var и setTimeout и как это исправить?",
      "Реализуй debounce и throttle с сохранением контекста и аргументов.",
      "Реализуй Promise.all и Promise.allSettled с нуля.",
      "Напиши curry(fn).",
      "Реализуй глубокое клонирование объекта с циклическими ссылками.",
      "Как работает цепочка прототипов и чем __proto__ отличается от prototype?",
      "Потеря this: назови три способа восстановить контекст.",
      "Реализуй собственный bind.",
      "Что такое замыкание и где оно приводит к утечке памяти?",
      "Как работает сборщик мусора mark-and-sweep и что мешает освобождению памяти?",
      "Чем yield отличается от return и где практически полезны генераторы?",
    ],
  ],
  [
    "TypeScript",
    [
      "Когда unknown лучше any?",
      "Напиши условный тип, извлекающий тип элемента массива через infer.",
      "Напиши mapped type, делающий поля опциональными и readonly.",
      "Опиши дискриминированное объединение для idle/loading/success/error.",
      "Объясни ковариантность и контравариантность на примере колбэков.",
      "Как типизировать ответ внешнего API без any?",
    ],
  ],
  [
    "React",
    [
      "Что такое reconciliation и какую роль играют ключи в списках?",
      "Зачем нужен Fiber и чем отличаются фазы render и commit?",
      "Почему нельзя вызывать хуки условно?",
      "Откуда берётся устаревшее замыкание в useEffect и как его исправить?",
      "Когда useMemo и useCallback нужны, а когда вредят?",
      "Что изменилось в batching обновлений с React 18?",
      "Как работает виртуализация больших списков?",
      "Какова цена Context и как избегать лишних рендеров?",
      "TanStack Query, Redux Toolkit и Zustand — что для чего?",
      "Что делает React Compiler и отменяет ли он ручную мемоизацию?",
    ],
  ],
  [
    "Браузер",
    [
      "Опиши Critical Rendering Path по шагам.",
      "Чем reflow отличается от repaint и как их минимизировать?",
      "Что такое композитные слои и когда опасен will-change?",
      "Назови ключевые отличия HTTP/2 и HTTP/3.",
      "Как работает CORS preflight?",
      "Зачем cookie-флаги SameSite, HttpOnly и Secure?",
      "Что измеряют LCP, INP и CLS?",
      "Как рассчитывается специфичность CSS и разрешается каскад?",
      "Когда выбирать Flexbox, а когда Grid?",
      "Назови базовые правила семантики и ARIA.",
    ],
  ],
  [
    "Алгоритмы",
    [
      "Два указателя: найди пару с заданной суммой в отсортированном массиве.",
      "Скользящее окно: найди самую длинную подстроку без повторов.",
      "Хэш-таблица: сгруппируй анаграммы.",
      "Бинарный поиск: найди первый и последний индекс элемента.",
      "Сравни BFS и DFS для обхода дерева.",
      "Стек: проверь валидность скобок.",
      "Реши базовую задачу DP: лестница или алгоритм Кадане.",
      "Оцени Big-O по времени и памяти для своего решения.",
    ],
  ],
  [
    "System Design",
    [
      "Спроектируй ленту с бесконечным скроллом.",
      "Realtime-уведомления: WebSocket, SSE или polling?",
      "Спроектируй offline-режим, кэш и оптимистичные обновления.",
      "Как организовать дизайн-систему, версионирование и распространение?",
      "Как организовать состояние крупного приложения?",
    ],
  ],
  [
    "Архитектура",
    [
      "Приведи пример осознанного нарушения SOLID.",
      "Сравни композицию и наследование в TypeScript-компонентах.",
      "Назови слои FSD, правила зависимостей и альтернативы.",
      "Когда микрофронтенды оправданы, а когда вредят?",
      "Сравни монорепу и полирепо.",
    ],
  ],
  [
    "Про опыт",
    [
      "Расскажи о самой сложной интеграции и своей роли.",
      "Как ты разрешил конфликт в code review?",
      "Как принимал решение о выборе state manager?",
      "Расскажи об улучшении производительности с метрикой до и после.",
    ],
  ],
  [
    "AI Engineering",
    [
      "Что такое token и context window и почему большой контекст не гарантирует лучший ответ?",
      "Чем отличаются system, developer и user instructions?",
      "Что делает temperature и почему значение 0 не гарантирует воспроизводимость?",
      "Почему LLM галлюцинируют и какими слоями это ограничивать?",
      "Когда нужен structured output, а когда tool calling?",
      "Зачем валидировать результат после успешной проверки JSON Schema?",
      "Где хранить API key в React, Capacitor и NestJS-приложении?",
      "Как реализовать общий timeout, cancellation и безопасный retry?",
      "Как обрабатывать rate limits без retry storm?",
      "Как контролировать стоимость AI-функции на пользователя и сессию?",
      "Когда выбрать SSE, а когда WebSocket?",
      "Когда использовать EventSource, а когда fetch с ReadableStream?",
      "Как провести end-to-end cancellation через frontend, backend и provider?",
      "Как безопасно показывать partial Markdown output?",
      "Как восстановиться после разрыва stream и не запустить вторую генерацию?",
      "Из каких частей состоит хороший system prompt?",
      "Когда few-shot examples улучшают результат, а когда мешают?",
      "Чем prompt injection отличается от jailbreak?",
      "Как защищать tools от ошибочных и вредоносных вызовов?",
      "Что такое embeddings и vector search?",
      "Как выбирать стратегию chunking для RAG?",
      "Что дают hybrid search и reranking?",
      "Когда RAG не нужен?",
      "Как проектировать проверяемые citations?",
      "Что такое golden dataset для AI-функции?",
      "Какие ограничения есть у LLM-as-a-judge?",
      "Как тестировать регрессии недетерминированной системы?",
      "Какие поля логировать для AI run без утечки PII?",
      "Какие состояния и действия обязательны в AI UX?",
      "Как спроектировать AI-тренажёр на React, NestJS и MongoDB?",
    ],
  ],
  [
    "AI-assisted Development",
    [
      "Как ты используешь AI в ежедневной разработке и где оставляешь human review?",
      "Приведи пример неверного результата AI и объясни, как ты его обнаружил.",
      "Как ограничивать scope задачи для coding agent?",
      "Как давать модели контекст, не загружая весь репозиторий?",
      "Чем AGENTS.md отличается от CLAUDE.md и vendor-specific rules?",
      "Чем детерминированный workflow отличается от автономного агента?",
      "Как измерять пользу AI без метрики «строк кода»?",
      "Как встроить AI code review, не заменяя ответственность инженера?",
      "Какие ограничения AI-инструментов особенно важны для российского бигтеха?",
      "Какие российские AI-ассистенты для разработки ты знаешь и как их сравнивать?",
    ],
  ],
  [
    "Тестирование",
    [
      "Чем unit-, integration- и E2E-тесты отличаются по цели, скорости и цене поддержки?",
      "Почему Testing Library рекомендует проверять поведение через доступные пользователю запросы?",
      "Как выбирать между getBy, queryBy и findBy в Testing Library?",
      "Как корректно тестировать асинхронный UI с userEvent, findBy и waitFor?",
      "Что стоит мокать в frontend-тестах, а что лучше оставить реальной интеграцией?",
      "Как протестировать React-компонент с server state, не привязываясь к деталям реализации?",
      "Как тестировать debounce, интервалы и таймауты с fake timers без нестабильных ожиданий?",
      "Зачем нужен MSW и чем перехват сетевого запроса лучше прямого мока fetch?",
      "Как писать устойчивые Playwright-тесты: локаторы, auto-waiting и изоляция данных?",
      "Из-за чего появляются flaky-тесты и как локализовать проблему в CI?",
    ],
  ],
  [
    "ООП JavaScript/TypeScript",
    [
      "Как четыре принципа ООП проявляются в JavaScript, где нет обязательной классической модели классов?",
      "Чем приватное поле #value отличается от соглашения _value и замыкания?",
      "Как связаны prototype экземпляра, свойство prototype конструктора и оператор new?",
      "Когда наследование оправдано, а когда композиция уменьшает связанность?",
      "Чем interface отличается от abstract class в TypeScript и когда выбирать каждый вариант?",
      "Покажи нарушение принципа подстановки Лисков на frontend-примере и предложи исправление.",
      "Как dependency inversion помогает тестировать WebSocket-клиент без настоящего соединения?",
      "Спроектируй EventEmitter: хранение подписок, отписка, обработка изменения списка во время emit.",
    ],
  ],
  [
    "React: прикладная разработка",
    [
      "Чем controlled и uncontrolled компоненты отличаются по источнику истины и цене интеграции?",
      "Как спроектировать useWebSocket: connect, cleanup, reconnect и защита от stale closure?",
      "Как не открыть два WebSocket-соединения из-за повторного запуска эффекта в Strict Mode?",
      "Как хранить часто приходящие сообщения, чтобы не перерисовывать всё дерево на каждый пакет?",
      "Что стабилизируют memo, useMemo и useCallback, и почему сами по себе они не гарантируют ускорение?",
      "Как разделить Context, чтобы изменение realtime-данных не обновляло всех потребителей?",
      "Как смоделировать состояния connecting, open, reconnecting, closed и error через reducer?",
      "Как доказать оптимизацию React-компонента с помощью Profiler и вкладки WebSocket Frames?",
    ],
  ],
  [
    "Принципы проектирования",
    [
      "Как понять, что React-компонент нарушает SRP, и где провести границу рефакторинга?",
      "Как применить OCP к отображению разных типов уведомлений без растущего switch?",
      "Покажи нарушение LSP на примере взаимозаменяемых UI-компонентов.",
      "Как ISP помогает не превращать props и Context в универсальный объект зависимостей?",
      "Как DIP позволяет тестировать WebSocket-клиент без реального соединения?",
      "Когда удаление дублирования по DRY создаёт более опасную связанность?",
      "Почему DAMP иногда полезнее DRY в тестах и документации?",
      "Как KISS влияет на выбор между локальным state и глобальным store?",
      "Как YAGNI защищает от преждевременной дизайн-системы или микрофронтендов?",
      "Чем высокая связность модуля отличается от сильной связанности между модулями?",
      "Что такое composition root и где его разместить во frontend-приложении?",
      "Какие способы dependency injection доступны в JavaScript без DI-контейнера?",
      "Как спроектировать стабильный public API feature-модуля?",
      "Почему универсальный компонент с десятками boolean props обычно плохо масштабируется?",
      "Когда strategy лучше наследования и когда обычного callback достаточно?",
      "Как отделить доменную модель от DTO REST API и зачем это делать?",
      "Какие признаки говорят, что абстракция появилась слишком рано?",
      "Когда осознанное нарушение SOLID является разумным инженерным решением?",
      "Как провести code review архитектуры без вкусовщины и ссылок только на принципы?",
      "Как отвечать про SOLID на интервью: правило, frontend-пример, компромисс и проверка?",
    ],
  ],
  [
    "ООП: ситуации и практика",
    [
      "Как инкапсулировать изменяемое состояние объекта и не раскрыть внутреннюю коллекцию?",
      "Что именно делает оператор new и как он связывает экземпляр с prototype?",
      "В каком смысле class в JavaScript является синтаксисом над прототипной моделью, а в каком — нет?",
      "Как реализуется полиморфизм через общий контракт и duck typing?",
      "Когда композиция объектов предпочтительнее глубокой цепочки наследования?",
      "Какие гарантии дают приватные поля #field и какие ограничения они создают?",
      "Когда в TypeScript выбрать interface, abstract class или обычный объект с функциями?",
      "Почему усиление предусловий в наследнике нарушает принцип подстановки?",
      "Как корректно обрабатывать отписку и изменение подписчиков внутри EventEmitter.emit?",
      "Когда value object полезнее набора примитивов в frontend-модели?",
      "Как выбрать между factory, strategy и простым callback без переусложнения?",
      "Как тестировать объект через публичное поведение, не привязываясь к приватной реализации?",
    ],
  ],
];

export const QUESTION_BANK: InterviewQuestion[] = questionGroups.flatMap(
  ([category, prompts], groupIndex, groups) => {
    const offset = groups
      .slice(0, groupIndex)
      .reduce((sum, [, previousPrompts]) => sum + previousPrompts.length, 0);
    return prompts.map((prompt, promptIndex) => {
      const number = offset + promptIndex + 1;
      const id = `q-${String(number).padStart(2, "0")}`;
      const training = getQuestionTraining(id);
      return {
        id,
        number,
        category,
        prompt,
        ...(training
          ? {
              skillKeys: training.skillKeys,
              capabilities: training.capabilities,
              exercise: training.exercise,
            }
          : {}),
      };
    });
  },
);

export const ALGORITHM_PATTERNS = [
  "Массивы и строки",
  "Хэш-таблица",
  "Два указателя",
  "Скользящее окно",
  "Стек и очередь",
  "Бинарный поиск",
  "Деревья: BFS/DFS",
  "Графы",
  "Базовый DP",
  "Смешанная задача",
];

export const TASK_IDS = new Set(
  CURRICULUM.flatMap((week) => week.days.flatMap((day) => day.blocks.map((block) => block.id))),
);

export const QUESTION_IDS = new Set(QUESTION_BANK.map((question) => question.id));
