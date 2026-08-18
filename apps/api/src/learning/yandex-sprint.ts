import type { StudyBlock, StudyBlockKind, StudyDay, StudyExercise } from "./curriculum";
import { getExerciseRunner } from "./exercise-runners";

interface SprintBlockDefinition {
  title: string;
  description: string;
  resourceIds: string[];
  exercise?: StudyExercise;
}

interface SprintDayDefinition {
  title: string;
  platform: SprintBlockDefinition;
  algorithms: SprintBlockDefinition;
  ai?: SprintBlockDefinition;
}

const SPRINT_DAYS: SprintDayDefinition[] = [
  {
    title: "Big-O и базовые структуры",
    platform: {
      title: "Контексты выполнения и стек вызовов",
      description: "Разбери создание execution context, работу call stack и порядок выполнения вложенных вызовов.",
      resourceIds: ["js-execution-model", "ydkjs", "yandex-frontend-interview"],
    },
    algorithms: {
      title: "Сложность Array, Object, Map и Set",
      description: "Составь таблицу операций, оцени время и память, затем реши задачу на подсчёт частот.",
      resourceIds: ["hello-algo", "yandex-algorithms", "yandex-coderun-frontend-2026"],
    },
    ai: {
      title: "Получить задачу без решения",
      description: "Попроси AI придумать JS-задачу, вернуть только условие, ограничения и примеры без подсказок к решению.",
      resourceIds: ["ai-assisted-03"],
    },
  },
  {
    title: "Типы и преобразования",
    platform: {
      title: "Типы, coercion и сравнения",
      description: "Предскажи результаты выражений с ==, ===, Boolean, Number и строковым преобразованием до запуска кода.",
      resourceIds: ["js-types", "js-comparisons", "yandex-frontend-interview"],
    },
    algorithms: {
      title: "Frequency map",
      description: "Реши две задачи на частотный словарь и для каждой назови сложность по времени и памяти.",
      resourceIds: ["yandex-algorithms", "hello-algo"],
    },
    ai: {
      title: "Уточнить ограничения",
      description: "Перед решением попроси AI отвечать только на уточняющие вопросы как интервьюер и зафиксируй ограничения задачи.",
      resourceIds: ["ai-assisted-01"],
    },
  },
  {
    title: "Scope, hoisting и TDZ",
    platform: {
      title: "Области видимости и объявления",
      description: "Разбери фрагменты с var, let, const, function declaration и function expression, объясняя каждый вывод.",
      resourceIds: ["js-var", "js-closure", "ydkjs"],
    },
    algorithms: {
      title: "Two Sum через хэш-таблицу",
      description: "Сначала предложи brute force, затем оптимизируй решение и проверь дубликаты, отрицательные числа и пустой ввод.",
      resourceIds: ["leetcode-two-sum", "hello-algo"],
    },
    ai: {
      title: "AI-review после решения",
      description: "Реши задачу самостоятельно, затем попроси AI найти ошибки, пропущенные случаи и проверить заявленный Big-O.",
      resourceIds: ["ai-assisted-03"],
    },
  },
  {
    title: "Замыкания",
    platform: {
      title: "Лексическое окружение и closures",
      description: "Объясни сохранение окружения, цикл с var и setTimeout, фабрики функций и риск удержания памяти.",
      resourceIds: ["js-closure", "ydkjs", "js-memory-mdn"],
    },
    algorithms: {
      title: "Группировка анаграмм",
      description: "Сравни сортировку и frequency key, реализуй выбранный вариант и защити оценку сложности.",
      resourceIds: ["leetcode-group-anagrams", "yandex-algorithms"],
    },
    ai: {
      title: "Сравнить альтернативы",
      description: "Попроси AI предложить другое решение, сравни компромиссы и выбери вариант, который защитишь на интервью.",
      resourceIds: ["ai-assisted-31"],
    },
  },
  {
    title: "this и привязка контекста",
    platform: {
      title: "this, call, apply и bind",
      description: "Предскажи this для обычных и стрелочных функций, методов, callback и явно привязанных функций.",
      resourceIds: ["js-this", "js-call-apply", "js-bind"],
    },
    algorithms: {
      title: "Два указателя",
      description: "Найди пару в отсортированном массиве без дополнительной памяти и объясни инвариант движения указателей.",
      resourceIds: ["leetcode-two-sum-ii", "hello-algo"],
    },
    ai: {
      title: "Сгенерировать граничные тесты",
      description: "Дай AI только сигнатуру и требования, собери набор adversarial-тестов и проверь ими своё решение.",
      resourceIds: ["ai-assisted-03"],
    },
  },
  {
    title: "Прототипы и классы",
    platform: {
      title: "Prototype chain и class syntax",
      description: "Разбери prototype, [[Prototype]], наследование, shadowing свойств и поведение методов класса.",
      resourceIds: ["js-prototype", "js-class", "ydkjs"],
    },
    algorithms: {
      title: "Скользящее окно",
      description: "Найди самую длинную подстроку без повторов и проговори, почему левый указатель не двигается назад.",
      resourceIds: ["leetcode-longest-substring", "hello-algo"],
    },
    ai: {
      title: "Защитить AI-код",
      description: "Получи короткую реализацию от AI и объясни каждую строку, состояние, сложность и возможные ошибки без подсказок.",
      resourceIds: ["ai-assisted-31"],
    },
  },
  {
    title: "Мок №1: JS core",
    platform: {
      title: "Секция «Фронтенд-платформа»",
      description: "60 минут без AI и поиска: решай небольшие JS-фрагменты вслух, затем запускай и дебажь в DevTools.",
      resourceIds: ["yandex-frontend-interview", "learn-js", "js-execution-model"],
    },
    algorithms: {
      title: "Секция решения задач",
      description: "60 минут без AI: реши одну задачу, сформулируй подход до кода, назови Big-O и проверь крайние случаи.",
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
    },
  },
  {
    title: "Event Loop",
    platform: {
      title: "Задачи, очереди и браузер",
      description: "Объясни стек, Web API, очередь задач и момент, когда браузер получает возможность отрисовать кадр.",
      resourceIds: ["js-event-loop", "js-event-loop-deep", "yandex-frontend-interview"],
    },
    algorithms: {
      title: "Стек и очередь",
      description: "Реализуй базовые операции, назови их сложность и объясни выбор структуры для двух практических сценариев.",
      resourceIds: ["hello-algo", "yandex-algorithms"],
    },
    ai: {
      title: "Explore перед изменениями",
      description: "Дай агенту небольшой проект и потребуй сначала найти релевантные файлы, команды и ограничения без изменения кода.",
      resourceIds: ["ai-assisted-01"],
    },
  },
  {
    title: "Микрозадачи и рендер",
    platform: {
      title: "Promise jobs, timers и rendering",
      description: "Разбери смешанные примеры с Promise, queueMicrotask, setTimeout и requestAnimationFrame до запуска.",
      resourceIds: ["mdn-microtask-guide", "js-event-loop-deep", "js-async-habr"],
    },
    algorithms: {
      title: "Валидные скобки",
      description: "Реши задачу через стек, проверь неожиданные символы и докажи корректность алгоритма.",
      resourceIds: ["leetcode-valid-parentheses", "hello-algo"],
    },
    ai: {
      title: "Собрать минимальный контекст",
      description: "Передай агенту только найденные файлы и требования, затем проверь, достаточно ли контекста для корректного плана.",
      resourceIds: ["ai-assisted-16"],
    },
  },
  {
    title: "Promise chains",
    platform: {
      title: "Состояния Promise и обработка ошибок",
      description: "Предскажи результаты цепочек then, catch и finally, включая возврат значения, Promise и выброс ошибки.",
      resourceIds: ["js-promises", "js-promise-api", "learnjs-async"],
    },
    algorithms: {
      title: "CodeRun: Запрос с повтором",
      description: "Реши задачу из официальной подборки и отдельно разбери количество попыток, ошибки и асинхронные границы.",
      resourceIds: ["coderun-fetch-with-retry", "js-promise-api"],
    },
    ai: {
      title: "Получить план реализации",
      description: "Попроси агента составить пошаговый план с файлами, рисками и проверками, затем найди в нём лишние действия.",
      resourceIds: ["ai-assisted-29"],
    },
  },
  {
    title: "async/await",
    platform: {
      title: "await, ошибки и параллельность",
      description: "Разбери преобразование async-функции в Promise, try/catch и разницу последовательного и параллельного ожидания.",
      resourceIds: ["js-async-await", "js-async-habr", "learnjs-async"],
    },
    algorithms: {
      title: "CodeRun: Разбиение строк",
      description: "Реализуй разбор строки по разделителю без скрытых допущений и протестируй пустые части и крайние разделители.",
      resourceIds: ["coderun-split-words-by-separator", "yandex-algorithms"],
    },
    ai: {
      title: "Реализовать один шаг",
      description: "Разреши агенту выполнить только первый согласованный шаг, затем самостоятельно проверь diff перед продолжением.",
      resourceIds: ["ai-assisted-18"],
    },
  },
  {
    title: "Promise API",
    platform: {
      title: "all, allSettled, race и any",
      description: "Сравни методы, их поведение при пустом массиве и отказах, затем набросай Promise.all без подсказок.",
      resourceIds: ["js-promise-api", "js-promises", "yandex-frontend-interview"],
    },
    algorithms: {
      title: "CodeRun: Объект счётчика",
      description: "Реализуй требуемый объект, проверь состояние и контекст методов, затем предложи альтернативный API.",
      resourceIds: ["coderun-counter-object", "js-this"],
    },
    ai: {
      title: "Проверить тесты и diff",
      description: "Запусти проверки, попроси AI объяснить каждое изменение и самостоятельно найди минимум один риск или пробел.",
      resourceIds: ["ai-assisted-03"],
    },
  },
  {
    title: "Таймеры и debounce",
    platform: {
      title: "Timers, debounce и сохранение this",
      description: "Объясни минимальную задержку таймера и реализуй debounce с аргументами, контекстом и отменой.",
      resourceIds: ["developer-debounce", "js-bind", "js-event-loop"],
    },
    algorithms: {
      title: "CodeRun: Сложение промисов",
      description: "Реши официальную задачу, сравни последовательное и параллельное решение и оцени время выполнения.",
      resourceIds: ["coderun-promise-sum", "js-promise-api"],
    },
    ai: {
      title: "Провести AI code review",
      description: "Попроси AI проверить корректность и читаемость, но каждое замечание верифицируй кодом, тестом или документацией.",
      resourceIds: ["ai-assisted-32"],
    },
  },
  {
    title: "Мок №2: асинхронность",
    platform: {
      title: "Секция по Event Loop и Promise",
      description: "60 минут без AI и поиска: разбирай смешанные асинхронные фрагменты и проверяй ответы в DevTools только после объяснения.",
      resourceIds: ["yandex-frontend-interview", "js-async-habr", "js-promise-api"],
    },
    algorithms: {
      title: "Секция задачи под таймер",
      description: "60 минут без AI: реши новую задачу, проговори решение, реализуй, оцени Big-O и протестируй вручную.",
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
    },
  },
  {
    title: "Смешанный JS",
    platform: {
      title: "Scope, this, prototypes и async вместе",
      description: "Разбери несколько коротких фрагментов, где смешаны замыкания, контекст, прототипы и микрозадачи.",
      resourceIds: ["yandex-frontend-interview", "ydkjs", "js-event-loop-deep"],
    },
    algorithms: {
      title: "CodeRun: Мемоизация",
      description: "Реши задачу, выбери ключ кеша, обсуди удержание памяти и поведение для разных аргументов.",
      resourceIds: ["coderun-memoize", "js-memory-mdn"],
    },
    ai: {
      title: "Сформулировать большое задание",
      description: "Возьми задачу на несколько файлов, зафиксируй требования, ограничения и критерии готовности до обращения к агенту.",
      resourceIds: ["ai-assisted-29", "ai-assisted-30"],
    },
  },
  {
    title: "Code review и оптимизация",
    platform: {
      title: "Найти ошибки в чужом JS-коде",
      description: "Проведи review неэффективного фрагмента: найди функциональные ошибки, сложность, мутации и неясные контракты.",
      resourceIds: ["google-code-review-complexity", "yandex-frontend-interview", "learn-js"],
    },
    algorithms: {
      title: "CodeRun: Максимальное значение строки",
      description: "Реши сложную задачу по этапам: примеры, brute force, оптимизация, доказательство и тестирование.",
      resourceIds: ["coderun-max-string-value", "yandex-algorithms"],
    },
    ai: {
      title: "Explore и plan большой задачи",
      description: "Дай агенту исследовать проект и подготовить план, затем проверь границы задачи и исключи лишние изменения.",
      resourceIds: ["ai-assisted-16", "ai-assisted-01"],
    },
  },
  {
    title: "Асинхронный code review",
    platform: {
      title: "Ошибки, гонки и отмена операций",
      description: "Найди потерянные ошибки, лишнюю последовательность, гонки и отсутствие отмены в асинхронном коде.",
      resourceIds: ["js-async-habr", "mdn-abortcontroller", "google-code-review-complexity"],
    },
    algorithms: {
      title: "CodeRun: Авиабилеты",
      description: "Построй решение сложной задачи, явно зафиксируй модель данных и проверяй сложность после каждого улучшения.",
      resourceIds: ["coderun-airline-tickets", "hello-algo"],
    },
    ai: {
      title: "Реализация с coding agent",
      description: "Разреши агенту реализовать согласованный план небольшими шагами, проверяя каждый diff и не принимая код вслепую.",
      resourceIds: ["ai-assisted-18", "ai-assisted-31"],
    },
  },
  {
    title: "Полифилы и границы API",
    platform: {
      title: "Контракты встроенных методов",
      description: "Разбери требования к простому полифилу: типы входа, мутации, исключения, Unicode и совместимость поведения.",
      resourceIds: ["mdn-js-guide", "learn-js", "yandex-frontend-interview"],
    },
    algorithms: {
      title: "CodeRun: Полифил replaceAll",
      description: "Реализуй задачу из подборки, перечисли ограничения решения и проверь повторяющиеся и пустые совпадения.",
      resourceIds: ["coderun-replace-all-polyfill", "learn-js"],
    },
    ai: {
      title: "Тесты и исправление AI-кода",
      description: "Запусти typecheck и тесты, локализуй ошибки, а затем исправь их вместе с агентом, сохраняя понимание причин.",
      resourceIds: ["ai-assisted-03", "ai-assisted-18"],
    },
  },
  {
    title: "Закрытие слабых мест",
    platform: {
      title: "Повтор двух слабых тем",
      description: "Выбери темы по результатам моков, объясни каждую за пять минут и реши по два фрагмента без подсказок.",
      resourceIds: ["yandex-frontend-interview", "yandex-prep", "frontend-handbook"],
    },
    algorithms: {
      title: "Две случайные лёгкие задачи",
      description: "Реши две новые задачи по 25 минут: условие, примеры, подход, код, Big-O и ручные тесты.",
      resourceIds: ["yandex-coderun-frontend-2026", "leetcode-plan"],
    },
    ai: {
      title: "Аудит итогового diff",
      description: "Проверь с AI корректность, безопасность, сложность и лишние изменения, затем составь собственный итоговый review.",
      resourceIds: ["ai-assisted-32", "ai-assisted-03"],
    },
  },
  {
    title: "Генеральная репетиция",
    platform: {
      title: "Платформа без запуска первых 30 минут",
      description: "Разбирай JS-фрагменты вслух, сначала моделируя выполнение в уме, затем проверяй ответы в DevTools.",
      resourceIds: ["yandex-frontend-interview", "ydkjs", "js-async-habr"],
    },
    algorithms: {
      title: "Задача за 50 минут",
      description: "Реши незнакомую задачу по интервью-процессу и оставь последние минуты на Big-O и тестирование.",
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
    },
    ai: {
      title: "Устная защита AI-решения",
      description: "Без помощи AI объясни сгенерированный код, архитектуру, тесты, компромиссы и три вещи, которые изменил бы сам.",
      resourceIds: ["ai-assisted-31", "ai-assisted-29"],
    },
  },
  {
    title: "Финальный мок",
    platform: {
      title: "Яндекс: платформа",
      description: "60 минут с демонстрацией экрана, без AI и поиска. Интервьюер задаёт JS-вопросы и просит объяснять результат выполнения.",
      resourceIds: ["yandex-frontend-interview", "js-execution-model", "js-async-habr"],
    },
    algorithms: {
      title: "Яндекс: решение задачи",
      description: "60 минут с демонстрацией экрана, без AI и поиска. Уточни условие, предложи решение, напиши код, назови Big-O и тесты.",
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
    },
  },
];

const SPRINT_EXERCISES: StudyExercise[] = [
  {
    statement: "Реализуй функцию, которая возвращает самый частый элемент массива. Если несколько элементов встречаются одинаково часто, верни тот, который встретился раньше. Для пустого массива верни null.",
    signature: "findMostFrequent(numbers: number[]): number | null",
    constraints: ["0 ≤ numbers.length ≤ 100 000", "Элементы — целые числа", "Не изменяй исходный массив"],
    examples: [
      { input: "[1, 2, 2, 3, 3, 3]", output: "3" },
      { input: "[4, 4, 2, 2]", output: "4", explanation: "Частоты равны, но 4 встретилась раньше." },
      { input: "[]", output: "null" },
    ],
  },
  {
    statement: "Выполни две функции: первая строит частотный словарь слов, вторая возвращает индекс первого неповторяющегося символа строки или -1.",
    signature: "countWords(words: string[]): Record<string, number>\nfirstUniqueChar(text: string): number",
    constraints: ["Сравнение чувствительно к регистру", "Не сортируй входные данные", "Обоснуй сложность обеих функций"],
    examples: [
      { input: "countWords(['js', 'react', 'js'])", output: "{ js: 2, react: 1 }" },
      { input: "firstUniqueChar('aabbcdde')", output: "4", explanation: "Первый уникальный символ — c." },
    ],
  },
  {
    statement: "Дан массив чисел и целевая сумма. Верни индексы двух разных элементов, сумма которых равна target. Гарантируется ровно одно решение.",
    signature: "twoSum(numbers: number[], target: number): [number, number]",
    constraints: ["2 ≤ numbers.length ≤ 100 000", "Нельзя использовать один элемент дважды", "Сначала опиши полный перебор, затем оптимизацию"],
    examples: [
      { input: "numbers = [2, 7, 11, 15], target = 9", output: "[0, 1]" },
      { input: "numbers = [3, 2, 4], target = 6", output: "[1, 2]" },
    ],
  },
  {
    statement: "Сгруппируй строки-анаграммы. Порядок групп и строк внутри групп не важен.",
    signature: "groupAnagrams(words: string[]): string[][]",
    constraints: ["Все слова состоят из строчных латинских букв", "Суммарная длина строк ≤ 100 000", "Сравни два способа построения ключа"],
    examples: [
      { input: "['eat', 'tea', 'tan', 'ate', 'nat', 'bat']", output: "[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]" },
      { input: "['']", output: "[['']]" },
    ],
  },
  {
    statement: "В отсортированном по возрастанию массиве найди индексы двух разных элементов с суммой target. Дополнительная память должна быть O(1). Если пары нет, верни [-1, -1].",
    signature: "findSortedPair(numbers: number[], target: number): [number, number]",
    constraints: ["Массив уже отсортирован", "0 ≤ numbers.length ≤ 100 000", "Индексы нумеруются с нуля"],
    examples: [
      { input: "numbers = [1, 2, 4, 6, 10], target = 8", output: "[1, 3]" },
      { input: "numbers = [1, 2, 3], target = 10", output: "[-1, -1]" },
    ],
  },
  {
    statement: "Верни длину самой длинной подстроки без повторяющихся символов.",
    signature: "longestUniqueSubstring(text: string): number",
    constraints: ["0 ≤ text.length ≤ 100 000", "Учитывай пробелы и регистр", "Подстрока должна быть непрерывной"],
    examples: [
      { input: "'abcabcbb'", output: "3", explanation: "Например, abc." },
      { input: "'bbbbb'", output: "1" },
      { input: "''", output: "0" },
    ],
  },
  {
    statement: "Верни k самых частых слов. Слова с большей частотой идут раньше; при равной частоте раньше идёт лексикографически меньшее слово.",
    signature: "topKFrequentWords(words: string[], k: number): string[]",
    constraints: ["1 ≤ words.length ≤ 100 000", "1 ≤ k ≤ числу уникальных слов", "Сначала проговори решение, затем пиши код"],
    examples: [
      { input: "words = ['i', 'love', 'js', 'i', 'love', 'code'], k = 2", output: "['i', 'love']" },
      { input: "words = ['b', 'a', 'c', 'b', 'a'], k = 2", output: "['a', 'b']" },
    ],
  },
  {
    statement: "Реализуй счётчик недавних запросов. Метод ping(t) добавляет запрос в момент t и возвращает число запросов за интервал [t - 3000, t].",
    signature: "class RecentCounter { ping(timestamp: number): number }",
    constraints: ["Временные метки приходят строго по возрастанию", "1 ≤ timestamp ≤ 1 000 000 000", "До 100 000 вызовов"],
    examples: [
      { input: "ping(1), ping(100), ping(3001), ping(3002)", output: "1, 2, 3, 3" },
    ],
  },
  {
    statement: "Проверь корректность скобочной последовательности из символов (), [] и {}. Каждая закрывающая скобка должна соответствовать последней незакрытой.",
    signature: "isValidBrackets(text: string): boolean",
    constraints: ["0 ≤ text.length ≤ 100 000", "Строка содержит только скобки", "Пустая строка считается корректной"],
    examples: [
      { input: "'()[]{}'", output: "true" },
      { input: "'([)]'", output: "false" },
      { input: "'{[]}'", output: "true" },
    ],
  },
  {
    statement: "Реализуй обёртку над асинхронным запросом. При ошибке она повторяет вызов не более retries раз и после последней неудачи выбрасывает последнюю ошибку.",
    signature: "fetchWithRetry<T>(request: () => Promise<T>, retries: number): Promise<T>",
    constraints: ["retries — число повторных попыток после первого вызова", "Не запускай попытки параллельно", "Успешный результат сразу завершает функцию"],
    examples: [
      { input: "request падает дважды и успешно завершается, retries = 2", output: "Успешный результат после 3 вызовов" },
      { input: "request всегда падает, retries = 1", output: "Последняя ошибка после 2 вызовов" },
    ],
  },
  {
    statement: "Раздели каждую строку массива по заданному разделителю и верни плоский массив непустых частей, сохраняя исходный порядок.",
    signature: "splitWordsBySeparator(words: string[], separator: string): string[]",
    constraints: ["separator — непустая строка", "Пустые части результата нужно удалить", "Не изменяй входной массив"],
    examples: [
      { input: "words = ['one.two', 'three.four'], separator = '.'", output: "['one', 'two', 'three', 'four']" },
      { input: "words = ['$easy$', '$problem$'], separator = '$'", output: "['easy', 'problem']" },
    ],
  },
  {
    statement: "Создай объект-счётчик с методами increment, decrement и reset. Метод reset возвращает значение к начальному, а текущее значение доступно через getValue.",
    signature: "createCounter(initialValue: number): { increment(): number; decrement(): number; reset(): number; getValue(): number }",
    constraints: ["Каждый изменяющий метод возвращает новое значение", "Экземпляры не должны делить состояние", "Методы должны работать после передачи в отдельную переменную"],
    examples: [
      { input: "counter = createCounter(5); increment(); increment(); decrement(); reset()", output: "6, 7, 6, 5" },
    ],
  },
  {
    statement: "Даны два промиса с числами. Верни промис их суммы. Оба исходных промиса должны начать ожидаться одновременно; при отклонении любого верни отклонённый промис.",
    signature: "promiseSum(first: Promise<number>, second: Promise<number>): Promise<number>",
    constraints: ["Не извлекай значения вне промисной цепочки", "Не скрывай ошибки", "Объясни разницу последовательного и параллельного ожидания"],
    examples: [
      { input: "Promise.resolve(2), Promise.resolve(3)", output: "Promise, выполняющийся со значением 5" },
      { input: "Promise.reject(new Error('fail')), Promise.resolve(3)", output: "Отклонённый Promise с ошибкой fail" },
    ],
  },
  {
    statement: "Найди минимальную подстроку source, содержащую все символы target с учётом их количества. Если такой подстроки нет, верни пустую строку.",
    signature: "minWindow(source: string, target: string): string",
    constraints: ["1 ≤ source.length ≤ 100 000", "1 ≤ target.length ≤ source.length", "Регистр символов имеет значение"],
    examples: [
      { input: "source = 'ADOBECODEBANC', target = 'ABC'", output: "'BANC'" },
      { input: "source = 'a', target = 'aa'", output: "''" },
    ],
  },
  {
    statement: "Реализуй memoize для функции с произвольным числом примитивных аргументов. Повторный вызов с теми же аргументами должен вернуть сохранённый результат без вызова исходной функции.",
    signature: "memoize<T extends (...args: unknown[]) => unknown>(fn: T): T",
    constraints: ["Аргументы: string, number, boolean, null или undefined", "Сохраняй значение this", "Различай типы аргументов"],
    examples: [
      { input: "memoizedAdd(2, 3), memoizedAdd(2, 3)", output: "5, 5; исходная функция вызвана один раз" },
    ],
  },
  {
    statement: "Для каждой строки вычисли значение: если она состоит только из цифр — числовое значение, иначе её длину. Верни максимальное значение среди всех строк.",
    signature: "maximumStringValue(values: string[]): number",
    constraints: ["1 ≤ values.length ≤ 100 000", "Строки непустые", "Числовые строки помещаются в безопасный диапазон Number"],
    examples: [
      { input: "['alic3', 'bob', '3', '4', '00000']", output: "5" },
      { input: "['1', '01', '001', '0001']", output: "1" },
    ],
  },
  {
    statement: "Даны билеты [откуда, куда], образующие один непрерывный маршрут без ветвлений. Восстанови порядок городов от начального до конечного.",
    signature: "restoreRoute(tickets: Array<[string, string]>): string[]",
    constraints: ["Каждый билет используется ровно один раз", "Начальный город не встречается в поле куда", "1 ≤ tickets.length ≤ 100 000"],
    examples: [
      { input: "[['Москва', 'Париж'], ['Берлин', 'Москва'], ['Париж', 'Лондон']]", output: "['Берлин', 'Москва', 'Париж', 'Лондон']" },
    ],
  },
  {
    statement: "Реализуй упрощённый полифил replaceAll: замени в строке все непересекающиеся вхождения search на replacement и верни новую строку.",
    signature: "replaceAll(source: string, search: string, replacement: string): string",
    constraints: ["search — непустая строка", "Не используй String.prototype.replaceAll", "Учитывай специальные символы как обычный текст"],
    examples: [
      { input: "source = 'foo.bar.foo', search = 'foo', replacement = 'x'", output: "'x.bar.x'" },
      { input: "source = 'aaaa', search = 'aa', replacement = 'b'", output: "'bb'" },
    ],
  },
  {
    statement: "Реши две задачи: (1) слей два отсортированных массива в один; (2) найди индекс target в отсортированном массиве бинарным поиском или верни -1.",
    signature: "mergeSorted(first: number[], second: number[]): number[]\nbinarySearch(numbers: number[], target: number): number",
    constraints: ["Не используй sort", "Оба массива отсортированы по возрастанию", "Для binarySearch требуется O(log n) времени"],
    examples: [
      { input: "mergeSorted([1, 3, 5], [2, 4, 6])", output: "[1, 2, 3, 4, 5, 6]" },
      { input: "binarySearch([1, 3, 5, 7], 5)", output: "2" },
    ],
  },
  {
    statement: "Даны интервалы встреч [start, end). Верни минимальное количество переговорных, необходимое для проведения всех встреч без конфликтов.",
    signature: "minMeetingRooms(intervals: Array<[number, number]>): number",
    constraints: ["0 ≤ intervals.length ≤ 100 000", "start < end", "Встреча, заканчивающаяся в t, не конфликтует с начинающейся в t"],
    examples: [
      { input: "[[0, 30], [5, 10], [15, 20]]", output: "2" },
      { input: "[[7, 10], [10, 12]]", output: "1" },
    ],
  },
  {
    statement: "Верни длину самой длинной последовательности последовательных целых чисел в неотсортированном массиве. Требуемая средняя сложность — O(n).",
    signature: "longestConsecutive(numbers: number[]): number",
    constraints: ["0 ≤ numbers.length ≤ 100 000", "Элементы могут повторяться", "Не изменяй исходный массив"],
    examples: [
      { input: "[100, 4, 200, 1, 3, 2]", output: "4", explanation: "Последовательность: 1, 2, 3, 4." },
      { input: "[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]", output: "9" },
    ],
  },
];

const createBlock = (
  dayId: string,
  idSuffix: string,
  kind: StudyBlockKind,
  minutes: number,
  definition: SprintBlockDefinition,
  exercise = definition.exercise,
): StudyBlock => {
  const id = `${dayId}-${idSuffix}`;
  return {
    id,
    kind,
    title: definition.title,
    description: definition.description,
    minutes,
    resourceIds: [...definition.resourceIds],
    exercise: exercise ? { ...exercise, runner: getExerciseRunner(id) } : undefined,
  };
};

export const YANDEX_SPRINT: StudyDay[] = SPRINT_DAYS.map((definition, index) => {
  const dayNumber = index + 1;
  const dayId = `yandex-d${String(dayNumber).padStart(2, "0")}`;
  const blocks: StudyBlock[] = definition.ai
    ? [
        createBlock(dayId, "platform", "theory", 40, definition.platform),
        createBlock(dayId, "algorithms", "practice", 50, definition.algorithms, SPRINT_EXERCISES[index]),
        createBlock(dayId, "ai", "ai", 20, definition.ai),
        {
          id: `${dayId}-review`,
          kind: "review",
          title: "Зафиксировать результат",
          description: "Запиши ошибки, Big-O, один вывод по JS и следующий конкретный шаг.",
          minutes: 10,
          resourceIds: [],
        },
      ]
    : [
        createBlock(dayId, "platform", "theory", 60, definition.platform),
        createBlock(dayId, "algorithms", "practice", 60, definition.algorithms, SPRINT_EXERCISES[index]),
      ];

  return {
    id: dayId,
    dayNumber,
    offset: index,
    title: definition.title,
    blocks,
  };
});

export const YANDEX_SPRINT_AI_KEY = "yandex-sprint";
export const YANDEX_SPRINT_AI_VERSION = 1;

export const YANDEX_TASK_IDS = new Set(
  YANDEX_SPRINT.flatMap((day) => day.blocks.map((block) => block.id)),
);
