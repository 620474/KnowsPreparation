import type { StudyBlock, StudyBlockKind, StudyDay } from "./curriculum";

interface SprintBlockDefinition {
  title: string;
  description: string;
  resourceIds: string[];
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
      resourceIds: ["yandex-coderun-frontend-2026", "js-promise-api"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "js-this"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "js-promise-api"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "js-memory-mdn"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "yandex-algorithms"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "hello-algo"],
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
      resourceIds: ["yandex-coderun-frontend-2026", "learn-js"],
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

const createBlock = (
  dayId: string,
  idSuffix: string,
  kind: StudyBlockKind,
  minutes: number,
  definition: SprintBlockDefinition,
): StudyBlock => ({
  id: `${dayId}-${idSuffix}`,
  kind,
  title: definition.title,
  description: definition.description,
  minutes,
  resourceIds: [...definition.resourceIds],
});

export const YANDEX_SPRINT: StudyDay[] = SPRINT_DAYS.map((definition, index) => {
  const dayNumber = index + 1;
  const dayId = `yandex-d${String(dayNumber).padStart(2, "0")}`;
  const blocks: StudyBlock[] = definition.ai
    ? [
        createBlock(dayId, "platform", "theory", 40, definition.platform),
        createBlock(dayId, "algorithms", "practice", 50, definition.algorithms),
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
        createBlock(dayId, "algorithms", "practice", 60, definition.algorithms),
      ];

  return {
    id: dayId,
    dayNumber,
    offset: index,
    title: definition.title,
    blocks,
  };
});

export const YANDEX_TASK_IDS = new Set(
  YANDEX_SPRINT.flatMap((day) => day.blocks.map((block) => block.id)),
);
