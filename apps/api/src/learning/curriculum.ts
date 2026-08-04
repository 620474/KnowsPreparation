import { getResourceIdsForBlock } from "./resources";

export type StudyBlockKind = "theory" | "practice" | "review";

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
            description: "50 минут: изучить механику и подготовить объяснение на 3–5 минут.",
            minutes: 50,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "theory"),
          },
          {
            id: `${dayId}-practice`,
            kind: "practice" as const,
            title: definition.practice[dayIndex] ?? "Практическая задача",
            description: "50 минут: решить самостоятельно, затем разобрать альтернативы и Big-O.",
            minutes: 50,
            resourceIds: getResourceIdsForBlock(weekIndex, dayIndex, "practice"),
          },
          {
            id: `${dayId}-review`,
            kind: "review" as const,
            title: "Короткое повторение и журнал",
            description: `20 минут: зафиксировать выводы и проверить результат недели «${definition.title}».`,
            minutes: 20,
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
