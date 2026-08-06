import { getResourceIdsForBlock } from "./resources";

export type StudyBlockKind = "theory" | "practice" | "ai" | "review";

export interface StudyBlock {
  id: string;
  kind: StudyBlockKind;
  title: string;
  description: string;
  minutes: number;
  resourceIds: string[];
}

export interface StudyDay {
  id: string;
  dayNumber: number;
  offset: number;
  title: string;
  blocks: StudyBlock[];
}

export interface StudyWeek {
  number: number;
  title: string;
  outcome: string;
  isBuffer: boolean;
  days: StudyDay[];
}

interface WeekDefinition {
  title: string;
  outcome: string;
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
      "Прототипная цепочка",
      "Классы как синтаксис над прототипами",
      "Каррирование и композиция функций",
      "Утечки памяти через замыкания",
    ],
    practice: [
      "Исправить var в асинхронном цикле",
      "Реализовать собственный bind",
      "Реализовать curry(fn)",
      "Найти пару двумя указателями",
      "Самая длинная подстрока без повторов",
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
      "Context и цена обновлений",
      "TanStack Query, RTK и Zustand",
      "Проектирование кастомных хуков",
    ],
    practice: [
      "Исправить условный вызов хука",
      "Устранить цикл useEffect",
      "Исправить stale closure",
      "Профилировать бесполезную мемоизацию",
      "Разделить перегруженный Context",
      "Спроектировать server state",
      "Написать и защитить custom hook",
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
      "Realtime: WebSocket, SSE, polling",
      "Offline и оптимистичные обновления",
    ],
    practice: [
      "Разобрать сетевой waterfall",
      "Спроектировать безопасную сессию",
      "Сверстать адаптивный layout мысленно",
      "Провести a11y-аудит компонента",
      "Спроектировать ленту",
      "Спроектировать уведомления",
      "Спроектировать offline-first экран",
    ],
  },
  {
    title: "Архитектура и презентация опыта",
    outcome: "Защищать архитектурные решения и убедительно показывать фактический грейд.",
    theory: [
      "SOLID, KISS и осознанные нарушения",
      "Композиция и паттерны компонентов",
      "FSD и правила зависимостей",
      "Монорепа и полирепо",
      "Микрофронтенды: цена и польза",
      "STAR для рассказа об опыте",
      "Резюме: роль, вклад и метрики",
    ],
    practice: [
      "Защитить нарушение SOLID",
      "Разобрать архитектуру рабочего проекта",
      "Нарисовать границы модулей",
      "Сравнить mono и polyrepo",
      "Оценить оправданность микрофронтендов",
      "Подготовить три истории STAR",
      "Переписать ключевой опыт в резюме",
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
      "Финальная карта слабых мест",
    ],
    practice: [
      "Мок JS + TypeScript",
      "Мок React + браузер",
      "Мок алгоритмов",
      "Мок System Design",
      "Повторный мок слабой секции",
      "Подготовить список компаний и отклики",
      "Полное пробное интервью",
    ],
  },
  {
    title: "Буфер: закрытие пробелов",
    outcome: "Закрыть пропуски и довести нестабильные темы до критерия готовности.",
    isBuffer: true,
    theory: [
      "Аудит пропущенных дней",
      "Повтор слабого блока JS",
      "Повтор слабого блока React",
      "Повтор TypeScript и браузера",
      "Повтор алгоритмических паттернов",
      "Повтор System Design",
      "Актуализация карты пробелов",
    ],
    practice: [
      "Закрыть два пропущенных задания",
      "Решить слабую JS-задачу",
      "Провести React-мини-мок",
      "Провести TS/browser-мини-мок",
      "Повторить пять алгоритмов",
      "Защитить один дизайн под таймер",
      "Контрольный смешанный мок",
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

export const CURRICULUM: StudyWeek[] = WEEK_DEFINITIONS.map((definition, weekIndex) => {
  const weekNumber = weekIndex + 1;
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
      return {
        id: dayId,
        dayNumber,
        offset: weekIndex * 7 + dayIndex,
        title: dayName,
        blocks: [
          {
            id: `${dayId}-theory`,
            kind: "theory" as const,
            title: definition.theory[dayIndex] ?? "Повтор теории",
            description: `${mainBlockMinutes} минут: изучить механику и подготовить объяснение на 3–5 минут.`,
            minutes: mainBlockMinutes,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "theory"),
          },
          {
            id: `${dayId}-practice`,
            kind: "practice" as const,
            title: definition.practice[dayIndex] ?? "Практическая задача",
            description: `${mainBlockMinutes} минут: решить самостоятельно, затем разобрать альтернативы и Big-O.`,
            minutes: mainBlockMinutes,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "practice"),
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
            id: `${dayId}-review`,
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

export interface InterviewQuestion {
  id: string;
  number: number;
  category: string;
  prompt: string;
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
];

export const QUESTION_BANK: InterviewQuestion[] = questionGroups.flatMap(
  ([category, prompts], groupIndex, groups) => {
    const offset = groups
      .slice(0, groupIndex)
      .reduce((sum, [, previousPrompts]) => sum + previousPrompts.length, 0);
    return prompts.map((prompt, promptIndex) => {
      const number = offset + promptIndex + 1;
      return {
        id: `q-${String(number).padStart(2, "0")}`,
        number,
        category,
        prompt,
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
