export type ResearchResourceKind = "main" | "deep-dive" | "practice" | "reference" | "case-study";
export type ResearchResourceLevel = "basic" | "beginner" | "intermediate" | "advanced";
export type ResearchResourceStatus = "current" | "evergreen" | "historical";

export interface ResearchResource {
  id: string;
  title: string;
  url: string;
  provider: string;
  language: "ru" | "en";
  kind: ResearchResourceKind;
  topics: string[];
  tags: string[];
  estimatedMinutes: number;
  level: ResearchResourceLevel;
  publishedYear?: number;
  status: ResearchResourceStatus;
  paywall: boolean;
  registrationRequired: boolean;
  description: string;
  learningGoal: string;
  whySelected: string;
  verifiedAt: string;
}

export const RESOURCE_CATALOG_VERIFIED_AT = "2026-08-04";

export const RESEARCH_RESOURCES: ResearchResource[] = [
  {
    "id": "learnjs-event-loop",
    "title": "Событийный цикл: микрозадачи и макрозадачи",
    "url": "https://learn.javascript.ru/event-loop",
    "provider": "learn.javascript.ru (Илья Кантор)",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Очередь макрозадач, микрозадачи из промисов и queueMicrotask, правило выполнения всех микрозадач до рендеринга, разбиение тяжёлых задач через setTimeout.",
    "learningGoal": "Предсказывать порядок вывода синхронного кода, промисов и таймеров без запуска.",
    "whySelected": "Русскоязычный первоисточник, обновлён 27.06.2024, с задачами и разбором.",
    "topics": [
      "JavaScript",
      "Browser"
    ],
    "tags": [
      "JavaScript",
      "Event loop"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-microtask-guide",
    "title": "Using microtasks in JavaScript with queueMicrotask()",
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "reference",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Как event loop многократно обрабатывает очередь микрозадач за одну итерацию и риск бесконечного залипания.",
    "learningGoal": "Объяснять, когда именно выполняются микрозадачи относительно задач и рендера.",
    "whySelected": "Официальная документация браузерной платформы.",
    "topics": [
      "JavaScript",
      "Browser"
    ],
    "tags": [
      "JavaScript",
      "Event loop"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "archibald-tasks-microtasks",
    "title": "Tasks, microtasks, queues and schedules",
    "url": "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/",
    "provider": "Jake Archibald",
    "language": "en",
    "kind": "deep-dive",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2015,
    "status": "evergreen",
    "paywall": false,
    "registrationRequired": false,
    "description": "Классический разбор порядка задач и микрозадач инженером Chrome с пошаговой визуализацией.",
    "learningGoal": "Разбирать нетривиальные комбинации setTimeout и Promise.",
    "whySelected": "Первоисточник от инженера браузера, evergreen.",
    "topics": [
      "JavaScript",
      "Browser"
    ],
    "tags": [
      "JavaScript",
      "Event loop"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "learnjs-closure",
    "title": "Область видимости переменных, замыкание",
    "url": "https://learn.javascript.ru/closure",
    "provider": "learn.javascript.ru (Илья Кантор)",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 30,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Блочная область видимости, лексическое окружение, [[Environment]], makeCounter, влияние на GC.",
    "learningGoal": "Объяснять замыкание через лексическое окружение и решать задачи с var/let в циклах.",
    "whySelected": "Русскоязычный первоисточник, обновлён 07.11.2024; актуальный URL /closure (не устаревший /closures).",
    "topics": [
      "JavaScript"
    ],
    "tags": [
      "JavaScript",
      "Замыкания"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "learnjs-object-methods-this",
    "title": "Методы объекта, \"this\"",
    "url": "https://learn.javascript.ru/object-methods",
    "provider": "learn.javascript.ru (Илья Кантор)",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Свободный this в JavaScript — вычисляется в момент вызова; стрелочные функции.",
    "learningGoal": "Определять значение this для любого способа вызова.",
    "whySelected": "Основной раздел учебника про this.",
    "topics": [
      "JavaScript"
    ],
    "tags": [
      "JavaScript",
      "this"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "learnjs-prototype-inheritance",
    "title": "Прототипное наследование",
    "url": "https://learn.javascript.ru/prototype-inheritance",
    "provider": "learn.javascript.ru (Илья Кантор)",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "[[Prototype]], __proto__, чтение по цепочке, запись без прототипа, this и прототипы.",
    "learningGoal": "Проходить цепочку прототипов и объяснять, почему this не зависит от прототипа.",
    "whySelected": "Русскоязычный первоисточник, обновлён 07.07.2024.",
    "topics": [
      "JavaScript"
    ],
    "tags": [
      "JavaScript",
      "Прототипы"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "learnjs-async",
    "title": "Промисы, async/await",
    "url": "https://learn.javascript.ru/async",
    "provider": "learn.javascript.ru (Илья Кантор)",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 40,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Промисы, цепочки, обработка ошибок, async/await, Promise.all/allSettled.",
    "learningGoal": "Строить асинхронные пайплайны и корректно обрабатывать ошибки.",
    "whySelected": "Единый русскоязычный первоисточник по асинхронности.",
    "topics": [
      "JavaScript"
    ],
    "tags": [
      "JavaScript",
      "Асинхронность"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-abortcontroller",
    "title": "AbortController",
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/AbortController",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "reference",
    "estimatedMinutes": 10,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Отмена fetch и других операций через signal.",
    "learningGoal": "Отменять запросы и таймеры через AbortController.",
    "whySelected": "Официальная документация API.",
    "topics": [
      "JavaScript",
      "Browser"
    ],
    "tags": [
      "JavaScript",
      "Асинхронность"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "hello-algo-binary-search",
    "title": "Двоичный поиск — Hello Algo (ru)",
    "url": "https://www.hello-algo.com/ru/chapter_searching/binary_search/",
    "provider": "Hello Algo",
    "language": "ru",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Бинарный поиск на закрытом интервале, сложность O(log n), визуализации.",
    "learningGoal": "Реализовать бинарный поиск и его вариации на границы.",
    "whySelected": "Бесплатный русскоязычный учебник алгоритмов с анимациями.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Бинарный поиск"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-two-sum",
    "title": "Two Sum",
    "url": "https://leetcode.com/problems/two-sum/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 20,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Найти два индекса с суммой target.",
    "learningGoal": "Решить за O(n) с хеш-таблицей.",
    "whySelected": "Каноническая задача на frequency/hash map.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Hash map"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-group-anagrams",
    "title": "Group Anagrams",
    "url": "https://leetcode.com/problems/group-anagrams/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Сгруппировать анаграммы по ключу частот символов.",
    "learningGoal": "Строить ключ группировки за O(n·k).",
    "whySelected": "Классика на хеш-группировку.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Hash map"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-two-sum-ii",
    "title": "Two Sum II — Input Array Is Sorted",
    "url": "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 20,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Два указателя на отсортированном массиве.",
    "learningGoal": "Освоить паттерн двух указателей.",
    "whySelected": "Базовая задача на two pointers.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Two pointers"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-min-window-substring",
    "title": "Minimum Window Substring",
    "url": "https://leetcode.com/problems/minimum-window-substring/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 40,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Минимальное окно, содержащее все символы t.",
    "learningGoal": "Реализовать sliding window с частотной картой.",
    "whySelected": "Эталон сложной sliding window (доп. задача).",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Sliding window"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-valid-parentheses",
    "title": "Valid Parentheses",
    "url": "https://leetcode.com/problems/valid-parentheses/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 20,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Проверка корректности скобок стеком.",
    "learningGoal": "Использовать стек для сопоставления пар.",
    "whySelected": "Классика на стек.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Стек"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-climbing-stairs",
    "title": "Climbing Stairs",
    "url": "https://leetcode.com/problems/climbing-stairs/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 20,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Число способов подняться по лестнице — базовое DP.",
    "learningGoal": "Понять переход состояния в DP.",
    "whySelected": "Вводная задача в динамику.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Dynamic programming"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "leetcode-maximum-subarray",
    "title": "Maximum Subarray",
    "url": "https://leetcode.com/problems/maximum-subarray/",
    "provider": "LeetCode",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": true,
    "description": "Максимальная сумма подмассива (алгоритм Кадане).",
    "learningGoal": "Реализовать Кадане за O(n).",
    "whySelected": "Классическая DP-задача.",
    "topics": [
      "Algorithms"
    ],
    "tags": [
      "Алгоритмы",
      "Dynamic programming"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "reactdev-render-and-commit",
    "title": "Render and Commit",
    "url": "https://react.dev/learn/render-and-commit",
    "provider": "react.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Триггер, фаза render, фаза commit; как обновление состояния ставит рендер в очередь.",
    "learningGoal": "Различать фазы render и commit.",
    "whySelected": "Источник истины по React.",
    "topics": [
      "React"
    ],
    "tags": [
      "React",
      "Internals"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "reactdev-queueing-updates",
    "title": "Queueing a Series of State Updates",
    "url": "https://react.dev/learn/queueing-a-series-of-state-updates",
    "provider": "react.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Батчинг обновлений, updater-функции, обработка состояния после событий.",
    "learningGoal": "Объяснять batching и корректно использовать updater.",
    "whySelected": "Официальный разбор батчинга.",
    "topics": [
      "React"
    ],
    "tags": [
      "React",
      "Batching"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "reactdev-preserving-resetting-state",
    "title": "Preserving and Resetting State",
    "url": "https://react.dev/learn/preserving-and-resetting-state",
    "provider": "react.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Как позиция в дереве и key определяют сохранение/сброс состояния.",
    "learningGoal": "Управлять состоянием через key и позицию в дереве.",
    "whySelected": "Официальный разбор reconciliation и ключей.",
    "topics": [
      "React"
    ],
    "tags": [
      "React",
      "Reconciliation",
      "Keys"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "reactdev-react-compiler-1",
    "title": "React Compiler v1.0",
    "url": "https://react.dev/blog/2025/10/07/react-compiler-1",
    "provider": "react.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2025,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Стабильный релиз компилятора (07.10.2025): автоматическая мемоизация; useMemo/useCallback остаются escape hatch. Кейс Meta Quest Store: до +12% к загрузке и навигации, отдельные взаимодействия быстрее в >2.5 раза.",
    "learningGoal": "Объяснять, что компилятор автоматизирует и почему он opt-in.",
    "whySelected": "Официальный анонс актуального статуса компилятора.",
    "topics": [
      "React"
    ],
    "tags": [
      "React",
      "React Compiler"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "developerway-rerenders",
    "title": "React re-renders guide: everything, all at once",
    "url": "https://www.developerway.com/posts/react-re-renders-guide",
    "provider": "developerway.com (Nadia Makarevich)",
    "language": "en",
    "kind": "deep-dive",
    "estimatedMinutes": 30,
    "level": "advanced",
    "publishedYear": 2022,
    "status": "evergreen",
    "paywall": false,
    "registrationRequired": false,
    "description": "Систематический разбор причин ререндеров и паттернов их предотвращения.",
    "learningGoal": "Диагностировать и устранять лишние ререндеры.",
    "whySelected": "Лучший практический deep-dive по ререндерам.",
    "topics": [
      "React",
      "Performance"
    ],
    "tags": [
      "React",
      "Performance"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "ts-handbook-generics",
    "title": "TypeScript Handbook: Generics",
    "url": "https://www.typescriptlang.org/docs/handbook/2/generics.html",
    "provider": "typescriptlang.org",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 30,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Дженерики в функциях, интерфейсах, классах и ограничения.",
    "learningGoal": "Писать переиспользуемые типобезопасные абстракции.",
    "whySelected": "Официальный Handbook.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript",
      "Generics"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "ts-handbook-conditional-types",
    "title": "TypeScript Handbook: Conditional Types",
    "url": "https://www.typescriptlang.org/docs/handbook/2/conditional-types.html",
    "provider": "typescriptlang.org",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 30,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Условные типы, дистрибутивность над union, ключевое слово infer.",
    "learningGoal": "Извлекать типы через infer и строить условные типы.",
    "whySelected": "Официальный Handbook.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript",
      "Conditional types",
      "infer"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "ts-handbook-mapped-types",
    "title": "TypeScript Handbook: Mapped Types",
    "url": "https://www.typescriptlang.org/docs/handbook/2/mapped-types.html",
    "provider": "typescriptlang.org",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Отображаемые типы, модификаторы, ремаппинг ключей.",
    "learningGoal": "Строить утилиты вроде DeepReadonly.",
    "whySelected": "Официальный Handbook.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript",
      "Mapped types"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "type-challenges-warmup",
    "title": "Type Challenges: Hello World (warm-up 00013)",
    "url": "https://github.com/type-challenges/type-challenges/blob/main/questions/00013-warm-hello-world/README.md",
    "provider": "type-challenges",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 10,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Разминочная задача на систему типов.",
    "learningGoal": "Понять формат type-level assertions.",
    "whySelected": "Точка входа в type-challenges.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "type-challenges-pick",
    "title": "Type Challenges: Pick (easy 00004)",
    "url": "https://github.com/type-challenges/type-challenges/blob/main/questions/00004-easy-pick/README.md",
    "provider": "type-challenges",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 15,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Реализовать встроенный Pick через mapped type.",
    "learningGoal": "Освоить keyof и mapped types.",
    "whySelected": "Классическая easy-задача.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript",
      "Mapped types"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "type-challenges-readonly",
    "title": "Type Challenges: Readonly (easy 00007)",
    "url": "https://github.com/type-challenges/type-challenges/blob/main/questions/00007-easy-readonly/README.md",
    "provider": "type-challenges",
    "language": "en",
    "kind": "practice",
    "estimatedMinutes": 15,
    "level": "basic",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Реализовать Readonly; далее — DeepReadonly.",
    "learningGoal": "Модификаторы readonly в mapped types.",
    "whySelected": "База для DeepReadonly.",
    "topics": [
      "TypeScript"
    ],
    "tags": [
      "TypeScript",
      "Mapped types"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "webdev-vitals",
    "title": "Web Vitals",
    "url": "https://web.dev/articles/vitals",
    "provider": "web.dev (Google)",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "LCP, INP, CLS и их пороги «good».",
    "learningGoal": "Называть метрики и целевые значения.",
    "whySelected": "Первоисточник по Core Web Vitals.",
    "topics": [
      "Browser",
      "Performance"
    ],
    "tags": [
      "Performance",
      "Core Web Vitals"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "webdev-cwv-thresholds",
    "title": "How the Core Web Vitals metrics thresholds were defined",
    "url": "https://web.dev/articles/defining-core-web-vitals-thresholds",
    "provider": "web.dev (Google)",
    "language": "en",
    "kind": "deep-dive",
    "estimatedMinutes": 20,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Почему пороги именно такие: 75-й перцентиль, CrUX, 28-дневное окно; good/poor границы.",
    "learningGoal": "Обосновывать пороги и перцентили метрик.",
    "whySelected": "Первоисточник методологии порогов.",
    "topics": [
      "Browser",
      "Performance"
    ],
    "tags": [
      "Performance",
      "Core Web Vitals"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-crp",
    "title": "Critical rendering path",
    "url": "https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "DOM, CSSOM, render tree, layout, paint, composite.",
    "learningGoal": "Описывать критический путь рендеринга.",
    "whySelected": "Официальная документация платформы.",
    "topics": [
      "Browser",
      "Performance"
    ],
    "tags": [
      "Performance",
      "Browser"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-http-caching",
    "title": "HTTP caching",
    "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "reference",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Cache-Control, ETag, стратегии кэширования.",
    "learningGoal": "Проектировать стратегию кэширования ресурсов.",
    "whySelected": "Официальная документация HTTP.",
    "topics": [
      "Browser"
    ],
    "tags": [
      "Browser",
      "HTTP"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-cors",
    "title": "Cross-Origin Resource Sharing (CORS)",
    "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "CORS, preflight, credentials, заголовки.",
    "learningGoal": "Объяснять preflight и работу с cookies при кросс-доменных запросах.",
    "whySelected": "Официальная документация.",
    "topics": [
      "Browser"
    ],
    "tags": [
      "Browser",
      "CORS"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "feature-sliced-overview",
    "title": "Feature-Sliced Design: Overview",
    "url": "https://feature-sliced.design/docs/get-started/overview",
    "provider": "feature-sliced.design",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Слои, слайсы, сегменты; правила зависимостей.",
    "learningGoal": "Обосновывать разбиение по слоям и границы модулей.",
    "whySelected": "Официальная документация методологии (есть ru-версия).",
    "topics": [
      "Architecture"
    ],
    "tags": [
      "Архитектура",
      "FSD"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "patterns-dev-react",
    "title": "Patterns.dev — Design & Rendering Patterns",
    "url": "https://www.patterns.dev/",
    "provider": "patterns.dev",
    "language": "en",
    "kind": "deep-dive",
    "estimatedMinutes": 30,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Паттерны компонентов и рендеринга для современных приложений.",
    "learningGoal": "Выбирать паттерны компонентов осознанно.",
    "whySelected": "Качественный бесплатный ресурс по паттернам.",
    "topics": [
      "Architecture"
    ],
    "tags": [
      "Архитектура",
      "Паттерны"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "nx-dev-monorepo",
    "title": "Nx: Monorepo concepts",
    "url": "https://nx.dev/concepts/decisions/why-monorepos",
    "provider": "nx.dev",
    "language": "en",
    "kind": "reference",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Аргументы за монорепу и её trade-offs.",
    "learningGoal": "Сравнивать mono/polyrepo по критериям.",
    "whySelected": "Первоисточник по монорепам во фронтенде.",
    "topics": [
      "Architecture"
    ],
    "tags": [
      "Архитектура",
      "Монорепо"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "ozon-microfrontend",
    "title": "Микрофронтенд для самых маленьких",
    "url": "https://habr.com/ru/companies/ozontech/articles/782508/",
    "provider": "Ozon Tech (Habr)",
    "language": "ru",
    "kind": "case-study",
    "estimatedMinutes": 25,
    "level": "intermediate",
    "publishedYear": 2023,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "От iframe к Module Federation: когда микрофронты нужны, а когда нет.",
    "learningGoal": "Объяснять trade-offs микрофронтендов.",
    "whySelected": "Оригинальная инженерная статья инженера Ozon.",
    "topics": [
      "Architecture",
      "Interview"
    ],
    "tags": [
      "Архитектура",
      "Микрофронтенды"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "vk-fsd",
    "title": "Как мы приготовили Feature-Sliced Design в VK",
    "url": "https://habr.com/ru/companies/vk/articles/831148/",
    "provider": "VK (Habr)",
    "language": "ru",
    "kind": "case-study",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Кейс внедрения FSD во frontend-проекты VK.",
    "learningGoal": "Видеть, как FSD применяется в большой команде.",
    "whySelected": "Оригинальный кейс инженера VK.",
    "topics": [
      "Architecture",
      "Interview"
    ],
    "tags": [
      "Архитектура",
      "FSD"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "sber-perf-devtools",
    "title": "Тестируем производительность фронтенда через вкладку Performance в DevTools",
    "url": "https://habr.com/ru/companies/sberbank/articles/937334/",
    "provider": "Сбер / СберТех (Habr)",
    "language": "ru",
    "kind": "case-study",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2025,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Профилирование в Performance-панели; бюджет кадра ~16 мс, покадровый анализ.",
    "learningGoal": "Читать flame chart и находить long tasks.",
    "whySelected": "Оригинальная статья инженера Сбера.",
    "topics": [
      "Browser",
      "Performance",
      "Interview"
    ],
    "tags": [
      "Performance",
      "DevTools"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "testing-library-guiding",
    "title": "Testing Library: Guiding Principles",
    "url": "https://testing-library.com/docs/guiding-principles/",
    "provider": "testing-library.com",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Принцип: тесты должны напоминать реальное использование ПО.",
    "learningGoal": "Тестировать поведение, а не детали реализации.",
    "whySelected": "Официальная документация RTL.",
    "topics": [
      "Testing"
    ],
    "tags": [
      "Тестирование",
      "RTL"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "vitest-browser-mode",
    "title": "Vitest: Browser Mode",
    "url": "https://vitest.dev/guide/browser/",
    "provider": "vitest.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Запуск компонентных тестов в реальном браузере через Playwright-провайдер.",
    "learningGoal": "Настроить компонентное тестирование в браузере.",
    "whySelected": "Официальная документация Vitest.",
    "topics": [
      "Browser",
      "Testing"
    ],
    "tags": [
      "Тестирование",
      "Vitest"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "playwright-writing-tests",
    "title": "Playwright: Writing tests",
    "url": "https://playwright.dev/docs/writing-tests",
    "provider": "playwright.dev",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Локаторы, ассерты, автоожидания в e2e.",
    "learningGoal": "Писать устойчивые e2e-тесты по ролям.",
    "whySelected": "Официальная документация Playwright.",
    "topics": [
      "Testing"
    ],
    "tags": [
      "Тестирование",
      "Playwright"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "owasp-xss-prevention",
    "title": "Cross-Site Scripting Prevention Cheat Sheet",
    "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
    "provider": "OWASP Cheat Sheet Series",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Правила экранирования по контекстам вывода.",
    "learningGoal": "Предотвращать XSS через контекстное экранирование.",
    "whySelected": "Первоисточник по защите от XSS.",
    "topics": [
      "Security"
    ],
    "tags": [
      "Безопасность",
      "XSS"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "owasp-csrf-prevention",
    "title": "Cross-Site Request Forgery Prevention Cheat Sheet",
    "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
    "provider": "OWASP Cheat Sheet Series",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Synchronizer token, SameSite, Fetch Metadata; XSS обходит любую защиту от CSRF.",
    "learningGoal": "Проектировать анти-CSRF защиту.",
    "whySelected": "Первоисточник по CSRF.",
    "topics": [
      "Security"
    ],
    "tags": [
      "Безопасность",
      "CSRF"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "owasp-csp",
    "title": "Content Security Policy Cheat Sheet",
    "url": "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html",
    "provider": "OWASP Cheat Sheet Series",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Strict CSP с nonce/hash; CSP как второй слой защиты.",
    "learningGoal": "Составлять строгую CSP.",
    "whySelected": "Первоисточник по CSP.",
    "topics": [
      "Security"
    ],
    "tags": [
      "Безопасность",
      "CSP"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "yandex-frontend-interview",
    "title": "Как мы нанимаем фронтенд-разработчиков",
    "url": "https://yandex.ru/jobs/pages/frontend-interview",
    "provider": "Яндекс (официально)",
    "language": "ru",
    "kind": "reference",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Секции Платформа, Проверка навыков, Архитектура, Финалы; правила и советы.",
    "learningGoal": "Понимать формат интервью Яндекса и готовиться под него.",
    "whySelected": "Официальная страница найма.",
    "topics": [
      "Interview"
    ],
    "tags": [
      "Собеседования",
      "Яндекс"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "sber-frontend-interview",
    "title": "Как подготовиться к техническому интервью Frontend-разработчику",
    "url": "https://developers.sber.ru/kak-v-sbere/interview/frontend-developer",
    "provider": "Сбер (developers.sber.ru)",
    "language": "ru",
    "kind": "reference",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2026,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "5 этапов: HR, скрининг (live-coding база JS + нативные API), кодинг (алгоритмы), HR-ценности, финал.",
    "learningGoal": "Понимать формат найма Сбера.",
    "whySelected": "Официальный портал Сбера.",
    "topics": [
      "Interview"
    ],
    "tags": [
      "Собеседования",
      "Сбер"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "tbank-interview",
    "title": "Как проходят интервью в Т-Банке",
    "url": "https://education.tbank.ru/study/conspectus/interview/",
    "provider": "Т-Банк Образование",
    "language": "ru",
    "kind": "reference",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Секции по 1–2 часа, live-coding, камера, без подсказок.",
    "learningGoal": "Понимать формат интервью Т-Банка.",
    "whySelected": "Официальный образовательный портал банка.",
    "topics": [
      "Interview"
    ],
    "tags": [
      "Собеседования",
      "Т-Банк"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "avito-playbook-hiring",
    "title": "Avito Playbook: наём и офис",
    "url": "https://github.com/avito-tech/playbook/blob/master/recruitment-and-office.md",
    "provider": "Avito Tech (GitHub)",
    "language": "ru",
    "kind": "reference",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Техсобес 2–3 часа, секция Программирование (код, алгоритмы, сложность), live-coding.",
    "learningGoal": "Понимать формат найма Авито.",
    "whySelected": "Официальный playbook компании.",
    "topics": [
      "Interview"
    ],
    "tags": [
      "Собеседования",
      "Авито"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "feh-system-design",
    "title": "Front End System Design Interview Overview",
    "url": "https://www.frontendinterviewhandbook.com/front-end-system-design",
    "provider": "Front End Interview Handbook",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 25,
    "level": "advanced",
    "publishedYear": 2026,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Форматы вопросов, отличия от backend system design, критерии оценки.",
    "learningGoal": "Структурировать frontend system design.",
    "whySelected": "Один из немногих бесплатных первоисточников по FE system design.",
    "topics": [
      "Architecture",
      "Interview"
    ],
    "tags": [
      "System Design",
      "Собеседования"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "greatfrontend-radio",
    "title": "Front End System Design Playbook (RADIO)",
    "url": "https://www.greatfrontend.com/front-end-system-design-playbook",
    "provider": "GreatFrontEnd",
    "language": "en",
    "kind": "deep-dive",
    "estimatedMinutes": 30,
    "level": "advanced",
    "publishedYear": 2026,
    "status": "current",
    "paywall": true,
    "registrationRequired": false,
    "description": "Фреймворк RADIO для frontend system design (часть контента бесплатна, часть premium).",
    "learningGoal": "Вести system design по RADIO за 45 минут.",
    "whySelected": "Один из пионеров темы FE system design.",
    "topics": [
      "Architecture"
    ],
    "tags": [
      "System Design"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "mdn-memory-management",
    "title": "Memory management",
    "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management",
    "provider": "MDN Web Docs",
    "language": "en",
    "kind": "main",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2024,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Жизненный цикл памяти, mark-and-sweep, удержание ссылок.",
    "learningGoal": "Объяснять GC и причины утечек через замыкания.",
    "whySelected": "Официальная документация платформы.",
    "topics": [
      "JavaScript",
      "Performance"
    ],
    "tags": [
      "JavaScript",
      "GC"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "vk-frontend-perf-metrics",
    "title": "Производительность фронтенда: разбираем важные метрики",
    "url": "https://habr.com/ru/companies/vk/articles/454920/",
    "provider": "VK (Habr)",
    "language": "ru",
    "kind": "case-study",
    "estimatedMinutes": 20,
    "level": "intermediate",
    "publishedYear": 2019,
    "status": "historical",
    "paywall": false,
    "registrationRequired": false,
    "description": "Опыт VK (Почта Mail.ru): метрики реального пользователя, PerfKeeper.",
    "learningGoal": "Мыслить продуктовыми метриками производительности.",
    "whySelected": "Оригинальный инженерный кейс VK (historical, но evergreen идеи).",
    "topics": [
      "Performance",
      "Interview"
    ],
    "tags": [
      "Performance"
    ],
    "verifiedAt": "2026-08-04"
  },
  {
    "id": "wb-head-frontend-interview",
    "title": "Интервью с Head of Frontend Wildberries (системное мышление)",
    "url": "https://habr.com/ru/companies/rwb/posts/994480/",
    "provider": "Wildberries & Russ (Habr)",
    "language": "ru",
    "kind": "case-study",
    "estimatedMinutes": 15,
    "level": "intermediate",
    "publishedYear": 2025,
    "status": "current",
    "paywall": false,
    "registrationRequired": false,
    "description": "Александр Сырцов о системном мышлении и вынесении бизнес-логики на клиент ради скорости отрисовки.",
    "learningGoal": "Понимать продуктовые ожидания WB к frontend-инженеру.",
    "whySelected": "Прямая речь руководителя frontend WB.",
    "topics": [
      "Architecture",
      "Interview"
    ],
    "tags": [
      "Архитектура",
      "Собеседования"
    ],
    "verifiedAt": "2026-08-04"
  }
];
