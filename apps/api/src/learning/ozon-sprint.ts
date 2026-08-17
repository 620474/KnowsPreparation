import type { StudyBlock, StudyBlockKind, StudyDay, StudyExercise } from "./curriculum";

interface SprintBlockDefinition {
  title: string;
  description: string;
  resourceIds: string[];
  exercise?: StudyExercise;
}

interface SprintDayDefinition {
  title: string;
  theory: SprintBlockDefinition;
  practice: SprintBlockDefinition;
  mock?: boolean;
}

const task = (
  statement: string,
  signature: string,
  constraints: string[],
  examples: StudyExercise["examples"],
): StudyExercise => ({ statement, signature, constraints, examples });

const SPRINT_DAYS: SprintDayDefinition[] = [
  {
    title: "Типы и преобразования",
    theory: {
      title: "Примитивы, объекты и coercion",
      description: "Разбери типы JavaScript, ссылки, упаковку примитивов, сравнения и неявные преобразования.",
      resourceIds: ["js-types", "js-comparisons"],
    },
    practice: {
      title: "Разворот 32-битного числа",
      description: "Разверни цифры целого числа, корректно обработав знак и переполнение.",
      resourceIds: ["hello-algo"],
      exercise: task(
        "Верни число с цифрами в обратном порядке. Если результат выходит за диапазон 32-битного знакового целого, верни 0.",
        "reverseInteger(value: number): number",
        ["-2^31 ≤ value ≤ 2^31 - 1", "Не используй BigInt", "Сохрани знак числа"],
        [
          { input: "123", output: "321" },
          { input: "-120", output: "-21" },
          { input: "1534236469", output: "0" },
        ],
      ),
    },
  },
  {
    title: "Scope, hoisting и TDZ",
    theory: {
      title: "Области видимости и объявления",
      description: "Предскажи вывод кода с var, let, const, function declaration и замыканиями.",
      resourceIds: ["js-var", "js-closure"],
    },
    practice: {
      title: "Валидация английского ввода",
      description: "Проверь строку и верни позиции символов, не входящих в разрешённый набор.",
      resourceIds: ["frontend-handbook"],
      exercise: task(
        "Верни индексы символов, которые не являются латинскими буквами, цифрами, пробелами или знаками .,!?.",
        "findInvalidCharacters(text: string): number[]",
        ["0 ≤ text.length ≤ 100 000", "Индексы считаются по UTF-16 code units", "Не изменяй строку"],
        [
          { input: "'Hello, world 42!'", output: "[]" },
          { input: "'Hello, мир!'", output: "[7, 8, 9]" },
        ],
      ),
    },
  },
  {
    title: "this, call, apply и bind",
    theory: {
      title: "Правила привязки this",
      description: "Разбери вызов метода, потерю контекста, стрелочные функции и явную привязку.",
      resourceIds: ["js-this", "js-call-apply", "js-bind"],
    },
    practice: {
      title: "Функциональный калькулятор",
      description: "Собери выражения из функций-чисел и функций-операций без eval.",
      resourceIds: ["js-closure"],
      exercise: task(
        "Реализуй функции zero–nine и plus, minus, times, dividedBy так, чтобы seven(times(five())) возвращало 35.",
        "seven(operation?: (value: number) => number): number",
        ["Операция применяется слева направо", "Деление округляется вниз", "Не используй eval или Function"],
        [
          { input: "seven(times(five()))", output: "35" },
          { input: "four(plus(nine()))", output: "13" },
        ],
      ),
    },
  },
  {
    title: "Прототипы и дескрипторы",
    theory: {
      title: "Prototype chain и свойства объектов",
      description: "Объясни поиск свойств, shadowing, class, Object.create и флаги дескрипторов.",
      resourceIds: ["js-prototype", "mdn-object-descriptors"],
    },
    practice: {
      title: "Собственный Object.create",
      description: "Реализуй упрощённый аналог Object.create с поддержкой дескрипторов.",
      resourceIds: ["js-prototype", "mdn-object-descriptors"],
      exercise: task(
        "Создай объект с переданным прототипом и опционально определи свойства из descriptors.",
        "customObjectCreate(proto: object | null, descriptors?: PropertyDescriptorMap): object",
        ["proto может быть null", "Некорректный proto приводит к TypeError", "Не используй Object.create"],
        [{ input: "customObjectCreate({role:'user'}, {id:{value:1, enumerable:true}})", output: "own id=1, inherited role='user'" }],
      ),
    },
  },
  {
    title: "Мок №1: JavaScript internals",
    mock: true,
    theory: {
      title: "Секция по устройству JavaScript",
      description: "60 минут отвечай вслух на вопросы по типам, scope, this, прототипам и дескрипторам.",
      resourceIds: ["js-types", "js-this", "js-prototype"],
    },
    practice: {
      title: "Задача под таймер",
      description: "Уточни требования, реализуй решение, назови сложность и проверь крайние случаи.",
      resourceIds: ["hello-algo"],
      exercise: task(
        "Сгруппируй слова-анаграммы. Порядок групп не важен, порядок слов внутри группы сохрани.",
        "groupAnagrams(words: string[]): string[][]",
        ["0 ≤ words.length ≤ 100 000", "Строчные латинские буквы", "Суммарная длина ≤ 1 000 000"],
        [{ input: "['eat','tea','tan','ate','nat','bat']", output: "[['eat','tea','ate'],['tan','nat'],['bat']]" }],
      ),
    },
  },
  {
    title: "Event Loop",
    theory: {
      title: "Стек, задачи, микрозадачи и рендер",
      description: "Предскажи порядок синхронного кода, Promise, таймеров и requestAnimationFrame.",
      resourceIds: ["js-event-loop", "js-event-loop-deep", "mdn-microtask-guide"],
    },
    practice: {
      title: "Очередь выполнения",
      description: "Смоделируй порядок событий в упрощённой модели одного оборота Event Loop.",
      resourceIds: ["js-event-loop-deep"],
      exercise: task(
        "Функция получает sync, microtask и task операции. Верни порядок их выполнения.",
        "executionOrder(operations: Array<{ type: 'sync' | 'microtask' | 'task'; label: string }>): string[]",
        ["Сначала весь sync", "Затем все microtask", "После этого task", "Порядок внутри типа сохраняется"],
        [{ input: "sync:A, task:B, microtask:C, sync:D", output: "['A','D','C','B']" }],
      ),
    },
  },
  {
    title: "async/await и retry",
    theory: {
      title: "Ошибки, последовательность и параллельность",
      description: "Сравни Promise chains и async/await, разбери try/catch и повторные попытки.",
      resourceIds: ["js-async-await", "js-promises", "learnjs-async"],
    },
    practice: {
      title: "Первый успешный результат",
      description: "Последовательно вызывай фабрику Promise до подходящего результата или лимита попыток.",
      resourceIds: ["js-async-await"],
      exercise: task(
        "Верни первый положительный результат. Ошибка или неположительное число считается неудачей; после maxAttempts выброси ошибку.",
        "firstPositive(factory: () => Promise<number>, maxAttempts: number): Promise<number>",
        ["Попытки строго последовательны", "maxAttempts ≥ 1", "Успех сразу завершает функцию"],
        [{ input: "результаты: -1, ошибка, 5; maxAttempts=3", output: "5" }],
      ),
    },
  },
  {
    title: "Promise API",
    theory: {
      title: "all, allSettled, race и any",
      description: "Сравни методы по порядку результатов, поведению при ошибках и пустому вводу.",
      resourceIds: ["js-promise-api", "js-promises"],
    },
    practice: {
      title: "Реализовать Promise.all",
      description: "Напиши полифил с сохранением порядка и ранним отклонением.",
      resourceIds: ["js-promise-api"],
      exercise: task(
        "Верни Promise с результатами входных значений в исходном порядке или отклонись по первой ошибке.",
        "promiseAll<T>(values: Iterable<T | PromiseLike<T>>): Promise<T[]>",
        ["Поддержи обычные значения", "Пустой iterable даёт []", "Не используй Promise.all"],
        [{ input: "[Promise.resolve(1), 2, Promise.resolve(3)]", output: "Promise<[1,2,3]>" }],
      ),
    },
  },
  {
    title: "Ограничение параллельности",
    theory: {
      title: "Пулы задач и кеширование Promise",
      description: "Разбери bounded concurrency, очередь фабрик и мемоизацию выполняющегося запроса.",
      resourceIds: ["js-promises", "js-memory-mdn"],
    },
    practice: {
      title: "Параллельный запуск с лимитом",
      description: "Выполни фабрики Promise, не превышая число одновременных операций.",
      resourceIds: ["js-promises"],
      exercise: task(
        "Запусти задачи с лимитом concurrency и верни результаты в исходном порядке.",
        "parallelLimit<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]>",
        ["concurrency ≥ 1", "После первой ошибки новые задачи не запускаются", "Запущенные задачи отменять не требуется"],
        [{ input: "4 задачи по 100мс, concurrency=2", output: "Не более двух активных задач одновременно" }],
      ),
    },
  },
  {
    title: "HTTP, CORS и cookies",
    theory: {
      title: "Граница React-клиента и API",
      description: "Разбери HTTP-статусы, сетевые ошибки, preflight, credentials, SameSite и CSRF.",
      resourceIds: ["developer-fetch", "mdn-cors", "mdn-cookies"],
    },
    practice: {
      title: "Надёжный JSON-запрос",
      description: "Напиши обёртку fetch с проверкой статуса, отменой и понятной ошибкой.",
      resourceIds: ["developer-fetch", "mdn-cors"],
      exercise: task(
        "Получи JSON по URL. При не-2xx выброси HttpError со status, а по timeoutMs отмени запрос.",
        "fetchJson<T>(url: string, timeoutMs: number): Promise<T>",
        ["timeoutMs > 0", "Очисти таймер в любом исходе", "Не скрывай AbortError", "Проверь Content-Type"],
        [{ input: "ответ 404", output: "HttpError со status=404" }],
      ),
    },
  },
  {
    title: "Рендеринг и DOM-события",
    theory: {
      title: "Layout, paint, compositing и bubbling",
      description: "Объясни critical rendering path, requestAnimationFrame, фазы событий и делегирование.",
      resourceIds: ["mdn-crp", "mdn-request-animation-frame", "mdn-event-bubbling"],
    },
    practice: {
      title: "Делегированный обработчик",
      description: "Определи ближайший интерактивный элемент и безопасно извлеки его идентификатор.",
      resourceIds: ["mdn-event-bubbling"],
      exercise: task(
        "Верни data-id ближайшей кнопки внутри контейнера или null.",
        "getDelegatedId(event: Event, container: HTMLElement): string | null",
        ["Клик может прийти по вложенному элементу", "Игнорируй кнопки вне container", "Используй closest"],
        [{ input: "клик по svg внутри button[data-id='42']", output: "'42'" }],
      ),
    },
  },
  {
    title: "React: состояние и эффекты",
    theory: {
      title: "Render, commit, key, batching и effects",
      description: "Разбери идентичность состояния, очередь обновлений, stale closure и причины ререндеров.",
      resourceIds: ["react-render-commit", "react-preserving-state", "developer-key", "react-effect-lifecycle", "developer-rerenders"],
    },
    practice: {
      title: "Последний запрос побеждает",
      description: "Предотврати запись устаревшего ответа при быстрой смене параметра React-хука.",
      resourceIds: ["react-effect-lifecycle", "developer-fetch"],
      exercise: task(
        "Реализуй хук загрузки, который отменяет прошлый запрос при смене query и не обновляет состояние после unmount.",
        "useLatestRequest<T>(query: string, load: (query: string, signal: AbortSignal) => Promise<T>): RequestState<T>",
        ["Учитывай loading, data и error", "Используй AbortController", "AbortError не показывается пользователю"],
        [{ input: "query меняется A → B до ответа A", output: "Состояние содержит только ответ B" }],
      ),
    },
  },
  {
    title: "TypeScript, GraphQL и CSS",
    theory: {
      title: "Практический code review React-кода",
      description: "Повтори narrowing, функции, GraphQL-контракт и выбор Flex/Grid на примере интерфейса.",
      resourceIds: ["ts-narrowing", "ts-functions", "graphql-learn", "web-css"],
    },
    practice: {
      title: "Нормализация GraphQL union",
      description: "Преобразуй union-ответ в типизированную модель строки списка.",
      resourceIds: ["ts-narrowing", "graphql-learn"],
      exercise: task(
        "Преобразуй SearchResult с __typename User | Team | NotFound в модель интерфейса без any и небезопасных assertions.",
        "toSearchRow(result: SearchResult): { id: string; title: string; kind: 'user' | 'team' } | null",
        ["Используй discriminated union", "NotFound даёт null", "Все варианты проверяются компилятором"],
        [{ input: "{__typename:'User',id:'1',name:'Max'}", output: "{id:'1',title:'Max',kind:'user'}" }],
      ),
    },
  },
  {
    title: "Полное мок-интервью Ozon",
    mock: true,
    theory: {
      title: "Платформа и React",
      description: "60 минут отвечай вслух на вопросы по JS, браузеру, сети, React и TypeScript.",
      resourceIds: ["frontend-handbook", "react-render-commit", "ts-narrowing"],
    },
    practice: {
      title: "Финальная задача и защита решения",
      description: "Уточни требования, реализуй, протестируй, назови Big-O и обсуди альтернативы.",
      resourceIds: ["hello-algo", "ai-assisted-31"],
      exercise: task(
        "Реализуй LRU-кеш фиксированной ёмкости с операциями get и put за O(1).",
        "class LruCache<K, V> { get(key: K): V | undefined; put(key: K, value: V): void }",
        ["capacity ≥ 1", "get делает элемент самым свежим", "put вытесняет самый старый", "Обе операции O(1) в среднем"],
        [{ input: "capacity=2; put(a,1); put(b,2); get(a); put(c,3); get(b)", output: "undefined" }],
      ),
    },
  },
];

const AI_BLOCK: SprintBlockDefinition = {
  title: "Разобрать решение с AI",
  description: "Сначала реши самостоятельно, затем попроси AI проверить крайние случаи, сложность и объяснение.",
  resourceIds: ["ai-assisted-03", "ai-assisted-31"],
};

const createBlock = (
  dayId: string,
  suffix: string,
  kind: StudyBlockKind,
  minutes: number,
  definition: SprintBlockDefinition,
): StudyBlock => ({
  id: `${dayId}-${suffix}`,
  kind,
  title: definition.title,
  description: definition.description,
  minutes,
  resourceIds: [...definition.resourceIds],
  exercise: definition.exercise,
});

export const OZON_SPRINT: StudyDay[] = SPRINT_DAYS.map((definition, index) => {
  const dayNumber = index + 1;
  const dayId = `ozon-d${String(dayNumber).padStart(2, "0")}`;
  const blocks: StudyBlock[] = definition.mock
    ? [
        createBlock(dayId, "theory", "theory", 60, definition.theory),
        createBlock(dayId, "practice", "practice", 60, definition.practice),
      ]
    : [
        createBlock(dayId, "theory", "theory", 40, definition.theory),
        createBlock(dayId, "practice", "practice", 50, definition.practice),
        createBlock(dayId, "ai", "ai", 20, AI_BLOCK),
        {
          id: `${dayId}-review`,
          kind: "review",
          title: "Зафиксировать результат",
          description: "Запиши ошибку, один сильный ответ вслух и следующий конкретный шаг.",
          minutes: 10,
          resourceIds: [],
        },
      ];

  return { id: dayId, dayNumber, offset: index, title: definition.title, blocks };
});

export const OZON_SPRINT_AI_KEY = "ozon-sprint";
export const OZON_SPRINT_AI_VERSION = 1;
export const OZON_TASK_IDS = new Set(
  OZON_SPRINT.flatMap((day) => day.blocks.map((block) => block.id)),
);
