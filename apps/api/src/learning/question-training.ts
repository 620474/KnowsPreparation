import type {
  QuestionCapability,
  QuestionExercise,
  SkillKey,
  StudyExerciseRunner,
} from "@prep/contracts";

export type QuestionEvaluator =
  | { mode: "exact"; expected: string; explanation: string }
  | { mode: "choice"; correctIndex: number; explanation: string }
  | { mode: "runner"; runner: StudyExerciseRunner; referenceSolution: string; explanation: string }
  | { mode: "ai"; referencePoints: string[] };

export interface QuestionTrainingDefinition {
  skillKeys: SkillKey[];
  capabilities: QuestionCapability[];
  exercise: QuestionExercise;
  evaluator: QuestionEvaluator;
}

const choice = (
  skillKeys: SkillKey[],
  capabilities: QuestionCapability[],
  instructions: string,
  choices: string[],
  correctIndex: number,
  explanation: string,
  code?: string,
): QuestionTrainingDefinition => ({
  skillKeys,
  capabilities,
  exercise: {
    type: "multiple_choice",
    instructions,
    choices,
    ...(code ? { code } : {}),
    answerPlaceholder: "Выбери вариант и коротко объясни причину",
    expectedSeconds: 90,
    requiresExplanation: true,
  },
  evaluator: { mode: "choice", correctIndex, explanation },
});

const predict = (
  skillKeys: SkillKey[],
  code: string,
  expected: string,
  explanation: string,
): QuestionTrainingDefinition => ({
  skillKeys,
  capabilities: ["recall", "apply", "explain"],
  exercise: {
    type: "predict_output",
    instructions: "Не запускай код. Запиши вывод по порядку и объясни ключевой механизм.",
    code,
    answerPlaceholder: "Например: A, C, B. Затем объяснение…",
    expectedSeconds: 150,
    requiresExplanation: true,
  },
  evaluator: { mode: "exact", expected, explanation },
});

const coding = (
  skillKeys: SkillKey[],
  type: "bug_fix" | "live_coding",
  instructions: string,
  starterCode: string,
  testCases: StudyExerciseRunner["testCases"],
  referenceSolution: string,
  explanation: string,
): QuestionTrainingDefinition => ({
  skillKeys,
  capabilities: type === "bug_fix" ? ["debug", "code"] : ["apply", "code"],
  exercise: {
    type,
    instructions,
    starterCode,
    answerPlaceholder: "Напиши решение…",
    expectedSeconds: 300,
    requiresExplanation: false,
  },
  evaluator: {
    mode: "runner",
    runner: { starterCode, testCases },
    referenceSolution,
    explanation,
  },
});

const explain = (
  skillKeys: SkillKey[],
  instructions: string,
  code: string | undefined,
  referencePoints: string[],
): QuestionTrainingDefinition => ({
  skillKeys,
  capabilities: ["explain", "defend"],
  exercise: {
    type: "explain",
    instructions,
    ...(code ? { code } : {}),
    answerPlaceholder: "Дай причинное объяснение и назови ограничения…",
    expectedSeconds: 180,
    requiresExplanation: true,
  },
  evaluator: { mode: "ai", referencePoints },
});

export const QUESTION_TRAINING: Record<string, QuestionTrainingDefinition> = {
  "q-01": predict(
    ["javascript", "async"],
    `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => {
  console.log("C");
  queueMicrotask(() => console.log("D"));
}).then(() => console.log("E"));
queueMicrotask(() => console.log("F"));
console.log("G");`,
    "A,G,C,F,D,E,B",
    "Синхронный код выполняется первым. Promise reaction и queueMicrotask попадают в одну FIFO-очередь микрозадач; добавленные во время её очистки микрозадачи выполняются до следующей task.",
  ),
  "q-02": predict(
    ["javascript", "async"],
    `for (var i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0);
}
console.log("done");`,
    "done,3,3,3",
    "var создаёт одну общую binding. Таймеры выполняются после цикла и читают итоговое значение 3; let создал бы новую binding на итерацию.",
  ),
  "q-03": coding(
    ["javascript", "async"],
    "live_coding",
    "Реализуй debounce. В тестах используется внедрённый scheduler, поэтому решение не зависит от реального времени.",
    `function debounce(fn, delay, scheduler) {
  // scheduler.set(callback, delay) -> id
  // scheduler.clear(id)
}`,
    [
      {
        title: "Оставляет только последний вызов",
        expression: `(() => { const queued = new Map(); let id = 0; const scheduler = { set(fn) { const key = ++id; queued.set(key, fn); return key; }, clear(key) { queued.delete(key); } }; const calls = []; const debounced = debounce((...args) => calls.push(args), 100, scheduler); debounced(1); debounced(2, 3); [...queued.values()][0](); return calls; })()`,
        expected: [[2, 3]],
      },
      {
        title: "Сохраняет this",
        expression: `(() => { const queued = new Map(); let id = 0; const scheduler = { set(fn) { const key = ++id; queued.set(key, fn); return key; }, clear(key) { queued.delete(key); } }; const target = { value: 7, run: debounce(function () { return this.value; }, 10, scheduler) }; target.run(); return [...queued.values()][0](); })()`,
        expected: 7,
      },
    ],
    `function debounce(fn, delay, scheduler) {
  let timerId;
  return function (...args) {
    if (timerId !== undefined) scheduler.clear(timerId);
    const context = this;
    timerId = scheduler.set(() => fn.apply(context, args), delay);
  };
}`,
    "Debounce хранит id последнего таймера, отменяет его перед новым вызовом и вызывает исходную функцию через apply с сохранёнными this и аргументами.",
  ),
  "q-04": coding(
    ["javascript", "async"],
    "live_coding",
    "Реализуй аналог Promise.all: сохрани порядок результатов, поддержи обычные значения и отклонись при первой ошибке.",
    `function promiseAll(values) {
  // Верни Promise
}`,
    [
      { title: "Сохраняет порядок", expression: `promiseAll([Promise.resolve(2), 1, Promise.resolve(3)])`, expected: [2, 1, 3] },
      { title: "Работает с пустым массивом", expression: `promiseAll([])`, expected: [] },
      { title: "Отклоняется с исходной ошибкой", expression: `promiseAll([Promise.resolve(1), Promise.reject(new Error("boom"))])`, expectedError: "boom" },
    ],
    `function promiseAll(values) {
  return new Promise((resolve, reject) => {
    const items = Array.from(values);
    if (items.length === 0) return resolve([]);
    const result = new Array(items.length);
    let completed = 0;
    items.forEach((value, index) => {
      Promise.resolve(value).then((resolved) => {
        result[index] = resolved;
        completed += 1;
        if (completed === items.length) resolve(result);
      }, reject);
    });
  });
}`,
    "Нужен новый Promise, счётчик завершений и запись результата по исходному индексу; пустой массив разрешается сразу.",
  ),
  "q-05": coding(
    ["javascript"],
    "live_coding",
    "Реализуй curry(fn), который собирает аргументы до arity исходной функции.",
    `function curry(fn) {
  // Верни каррированную функцию
}`,
    [
      { title: "Поддерживает вызовы по одному аргументу", expression: `curry((a, b, c) => a + b + c)(1)(2)(3)`, expected: 6 },
      { title: "Поддерживает группы аргументов", expression: `curry((a, b, c) => a * b * c)(2, 3)(4)`, expected: 24 },
      { title: "Передаёт лишние аргументы", expression: `curry((a, b) => [a, b])(1, 2, 3)`, expected: [1, 2] },
    ],
    `function curry(fn) {
  function collect(collected) {
    return function (...args) {
      const all = [...collected, ...args];
      return all.length >= fn.length ? fn(...all.slice(0, fn.length)) : collect(all);
    };
  }
  return collect([]);
}`,
    "Каррированная функция накапливает аргументы и вызывает fn, когда их количество достигает fn.length.",
  ),
  "q-06": coding(
    ["javascript"],
    "live_coding",
    "Реализуй глубокое клонирование массивов и обычных объектов с поддержкой циклических ссылок.",
    `function deepClone(value, seen = new WeakMap()) {
  // Верни независимую копию
}`,
    [
      { title: "Клонирует вложенные структуры", expression: `(() => { const source = { nested: { value: 1 }, list: [1, 2] }; const copy = deepClone(source); copy.nested.value = 2; return [source.nested.value, copy.nested.value, copy.list === source.list]; })()`, expected: [1, 2, false] },
      { title: "Сохраняет цикл в копии", expression: `(() => { const source = { value: 1 }; source.self = source; const copy = deepClone(source); return [copy !== source, copy.self === copy]; })()`, expected: [true, true] },
    ],
    `function deepClone(value, seen = new WeakMap()) {
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}`,
    "WeakMap связывает исходный объект с копией до рекурсивного обхода и разрывает бесконечную рекурсию на циклах.",
  ),
  "q-07": choice(
    ["javascript"], ["recall", "apply"],
    "Какое утверждение корректно для обычной функции-конструктора User?",
    ["user.prototype указывает на User.prototype", "Object.getPrototypeOf(user) === User.prototype", "User.__proto__ === User.prototype", "prototype существует у любого объекта"],
    1,
    "Оператор new устанавливает внутренний [[Prototype]] экземпляра в объект User.prototype.",
    `function User() {}
const user = new User();`,
  ),
  "q-08": coding(
    ["javascript"],
    "bug_fix",
    "Исправь потерю контекста, не меняя функцию greet и объект user.",
    `function greet(prefix) {
  return prefix + ", " + this.name;
}
const user = { name: "Максим" };
const greetUser = greet;`,
    [
      { title: "Возвращает приветствие", expression: `greetUser("Привет")`, expected: "Привет, Максим" },
      { title: "Контекст закреплён", expression: `greetUser.call({ name: "Другой" }, "Здравствуйте")`, expected: "Здравствуйте, Максим" },
    ],
    `function greet(prefix) {
  return prefix + ", " + this.name;
}
const user = { name: "Максим" };
const greetUser = greet.bind(user);`,
    "bind создаёт новую функцию с закреплённым this; call/apply подходят для разового вызова, а стрелочная обёртка — ещё одна допустимая стратегия.",
  ),
  "q-09": coding(
    ["javascript"],
    "live_coding",
    "Реализуй упрощённый myBind без использования Function.prototype.bind.",
    `function myBind(fn, context, ...boundArgs) {
  // Верни функцию
}`,
    [
      { title: "Связывает контекст", expression: `myBind(function (x) { return this.value + x; }, { value: 4 })(3)`, expected: 7 },
      { title: "Объединяет аргументы", expression: `myBind(function (...args) { return args; }, null, 1, 2)(3, 4)`, expected: [1, 2, 3, 4] },
    ],
    `function myBind(fn, context, ...boundArgs) {
  return function (...args) {
    return fn.apply(context, [...boundArgs, ...args]);
  };
}`,
    "Возвращаемая функция вызывает fn через apply с заданным context и объединёнными аргументами.",
  ),
  "q-10": choice(
    ["javascript"], ["debug", "explain"],
    "Какое изменение действительно освобождает большой объект после unmount?",
    ["Обернуть callback в useMemo", "Удалить listener тем же callback в cleanup", "Заменить const на let", "Добавить объект в globalThis"],
    1,
    "Пока EventTarget хранит listener, замыкание и захваченные данные достижимы. Cleanup должен удалить именно ту же функцию.",
    `const largeData = new Array(1_000_000).fill("x");
const handler = () => console.log(largeData.length);
window.addEventListener("resize", handler);`,
  ),
  "q-11": choice(
    ["javascript"], ["recall", "explain"],
    "Какой объект сборщик мусора сможет удалить?",
    ["Объект в globalThis.cache", "Объект, доступный из активного listener", "Недостижимый цикл из двух объектов", "Объект в замыкании активного таймера"],
    2,
    "Mark-and-sweep удаляет недостижимые объекты, включая циклы. Важна достижимость от корней, а не наличие взаимных ссылок.",
  ),
  "q-12": predict(
    ["javascript"],
    `function* values() {
  yield 1;
  return 2;
}
const iterator = values();
console.log(iterator.next());
console.log(iterator.next());
console.log(iterator.next());`,
    "{value:1,done:false},{value:2,done:true},{value:undefined,done:true}",
    "yield приостанавливает генератор с done=false, return завершает его с done=true, последующие next остаются завершёнными.",
  ),
  "q-13": choice(
    ["typescript"], ["recall", "apply"],
    "Как безопаснее обработать неизвестный JSON до валидации?",
    ["const data: any = await response.json()", "const data: unknown = await response.json()", "const data: object = await response.json()", "const data: never = await response.json()"],
    1,
    "unknown запрещает использовать значение без narrowing или runtime-валидации, тогда как any отключает проверку типов.",
  ),
  "q-14": choice(
    ["typescript"], ["apply", "code"],
    "Какой тип корректно извлекает элемент массива?",
    ["type Element<T> = T extends (infer U)[] ? U : never", "type Element<T> = infer T[]", "type Element<T> = T[0]", "type Element<T> = keyof T"],
    0,
    "Условный тип проверяет массив и через infer связывает U с типом элемента.",
  ),
  "q-15": choice(
    ["typescript"], ["apply", "code"],
    "Как одновременно сделать все поля readonly и optional?",
    ["{ readonly [K in keyof T]?: T[K] }", "{ [K: keyof T]: readonly T[K] }", "Readonly<T | undefined>", "{ readonly K?: keyof T }"],
    0,
    "Mapped type перебирает keyof T, а модификаторы readonly и ? применяются к каждому свойству.",
  ),
  "q-16": choice(
    ["typescript"], ["apply", "code"],
    "Какое поле лучше всего делает состояния исчерпывающе различимыми?",
    ["message: string", "status: 'idle' | 'loading' | 'success' | 'error'", "data?: unknown", "loading: boolean"],
    1,
    "Литеральный discriminant позволяет TypeScript сузить union и проверить исчерпывающий switch.",
  ),
  "q-17": choice(
    ["typescript"], ["recall", "explain"],
    "Почему обработчик только Dog нельзя передать туда, где могут вызвать callback с Animal?",
    ["Из-за ковариантности return", "Он может получить Animal, не являющийся Dog", "Потому что interface номинальны", "Потому что функции всегда инвариантны"],
    1,
    "Параметры функций проверяются контравариантно: более узкий обработчик небезопасен в позиции, где возможен более широкий аргумент.",
  ),
  "q-18": choice(
    ["typescript"], ["apply", "debug"],
    "Что нужно сделать после получения ответа внешнего API?",
    ["Привести через as ApiResponse", "Проверить unknown runtime-схемой и получить тип из схемы", "Использовать any внутри service", "Описать interface — этого достаточно"],
    1,
    "TypeScript не валидирует сетевые данные во время выполнения. Нужна runtime-схема, например Zod, и вывод типа из неё.",
  ),
  "q-19": choice(
    ["react"], ["recall", "debug"],
    "Почему index часто является плохим key при перестановке списка?",
    ["React запрещает числовые key", "Состояние компонента может прикрепиться к другой сущности", "Увеличивается размер DOM", "key передаётся в props"],
    1,
    "Key задаёт идентичность между render. При перестановке индекс описывает позицию, а не сущность, поэтому локальное состояние может переехать.",
  ),
  "q-20": choice(
    ["react"], ["recall", "explain"],
    "В какой фазе допустим DOM side effect?",
    ["Render", "Reconciliation", "Commit/effect", "Во время вызова компонента"],
    2,
    "Render должен оставаться чистым и может прерываться. Изменения DOM и эффекты происходят после принятия результата в commit.",
  ),
  "q-21": choice(
    ["react"], ["recall", "debug"],
    "Почему условный вызов hook ломает компонент?",
    ["Hook нельзя вызывать внутри JSX", "React сопоставляет состояние по стабильному порядку вызовов", "Hook всегда асинхронный", "Условие вызывает лишний DOM"],
    1,
    "React хранит состояния hook по позиции вызова. Изменение порядка между render связывает значения не с теми hook.",
  ),
  "q-22": choice(
    ["react", "async"], ["apply", "debug"],
    "Что будет логироваться после трёх кликов и какое исправление наиболее прямое?",
    ["0; добавить count в dependencies", "3; убрать cleanup", "0; заменить setInterval на setTimeout", "1,2,3; обернуть callback в useMemo"],
    0,
    "Effect с пустыми dependencies замыкает count первого render. Добавление count пересоздаёт interval; ref подходит, если callback должен видеть несколько актуальных значений без пересоздания.",
    `useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);`,
  ),
  "q-23": explain(
    ["react"],
    "Список фильтруется при каждом вводе. На слабом телефоне UI тормозит, но фильтр дешёвый на коротких данных. Объясни, когда измерять и применять useMemo, а когда мемоизация ухудшит код.",
    `const visible = useMemo(() => filter(items, query), [items, query]);`,
    ["сначала измерить React Profiler", "useMemo не гарантирует ускорение", "стоимость вычисления и стабильность dependencies", "память и сложность", "memo для дочернего компонента — отдельное решение"],
  ),
  "q-24": choice(
    ["react"], ["recall", "apply"],
    "Что React 18 обычно делает с двумя setState внутри Promise callback?",
    ["Всегда два отдельных render", "Автоматически batching в один render", "Игнорирует второй update", "Работает только с class components"],
    1,
    "При createRoot React 18 автоматически группирует обновления и вне React event handlers, включая Promise и таймеры.",
  ),
  "q-25": choice(
    ["react"], ["apply", "explain"],
    "Что важнее всего для виртуализации списка?",
    ["Рендерить все элементы, но скрыть CSS", "Рендерить видимое окно и небольшой overscan", "Использовать только memo", "Хранить список в Context"],
    1,
    "Виртуализация сокращает количество одновременно смонтированных DOM-узлов, оставляя видимый диапазон и overscan.",
  ),
  "q-26": explain(
    ["react"],
    "Realtime Context получает десятки сообщений в секунду и перерисовывает всё приложение. Предложи план диагностики и два архитектурных исправления.",
    undefined,
    ["измерить Profiler", "разделить contexts", "стабилизировать value", "селекторы или внешний store", "буферизация/батчинг сообщений", "не применять memo вслепую"],
  ),
  "q-27": choice(
    ["react", "architecture"], ["apply", "explain"],
    "Где логичнее хранить кешируемые данные REST API?",
    ["Только useState корневого компонента", "TanStack Query как server state", "Context без кеш-политики", "localStorage как единственный источник истины"],
    1,
    "TanStack Query управляет server state: кешем, stale-time, повторными запросами и синхронизацией. Redux/Zustand полезнее для сложного client state.",
  ),
  "q-28": explain(
    ["react"],
    "Команда включила React Compiler. Нужно ли удалить все useMemo/useCallback? Дай правило миграции и способ доказать результат.",
    undefined,
    ["не удалять механически", "проверить поддержку и конфигурацию", "профилировать до и после", "сохранить семантически значимую стабильность", "проверить сторонние библиотеки"],
  ),
  "q-29": choice(
    ["browser"], ["recall", "explain"],
    "Какой порядок Critical Rendering Path наиболее точный?",
    ["Layout → HTML → CSSOM → DOM", "DOM/CSSOM → render tree → layout → paint → composite", "Paint → fetch → layout", "DOM → JavaScript → HTTP → CSSOM"],
    1,
    "Браузер строит DOM и CSSOM, формирует render tree, рассчитывает геометрию, рисует и композитит слои.",
  ),
  "q-30": choice(
    ["browser"], ["debug", "apply"],
    "Какое изменение чаще всего вызывает layout, а не только paint?",
    ["Изменение transform", "Изменение opacity", "Изменение width", "Изменение цвета фона"],
    2,
    "Width влияет на геометрию и обычно требует layout. Transform и opacity часто обрабатываются на этапе composite.",
  ),
  "q-127": choice(
    ["architecture", "react"], ["apply", "defend"],
    "Компонент загружает данные, форматирует DTO, управляет фильтрами и рисует таблицу. Какой первый рефакторинг лучше всего следует SRP?",
    ["Разнести каждую функцию в отдельный файл", "Выделить получение и преобразование данных в отдельный hook/service с явным контрактом", "Обернуть компонент в memo", "Заменить все функции классами"],
    1,
    "SRP требует не минимального размера файла, а одной причины изменения. Data-flow и отображение меняются по разным причинам и образуют полезную границу.",
  ),
  "q-128": choice(
    ["architecture", "react"], ["apply", "defend"],
    "Как добавить новый тип уведомления, не изменяя центральный switch при каждом расширении?",
    ["Добавить ещё один if", "Передать registry обработчиков по типу уведомления", "Создать глобальную переменную", "Скопировать компонент"],
    1,
    "Registry или strategy позволяют расширять набор обработчиков регистрацией новой реализации, сохраняя стабильным основной алгоритм.",
  ),
  "q-129": choice(
    ["architecture", "react"], ["apply", "debug"],
    "Button принимает disabled, но наследник LinkButton игнорирует disabled и всё равно выполняет переход. Какой принцип нарушен?",
    ["SRP", "OCP", "LSP", "DIP"],
    2,
    "LinkButton нельзя безопасно подставить вместо Button с тем же контрактом: он ослабляет гарантированное постусловие disabled.",
  ),
  "q-130": choice(
    ["architecture", "react"], ["apply", "defend"],
    "Что лучше соответствует ISP для Context с user, theme, featureFlags и realtimeMessages?",
    ["Один Context удобнее всегда", "Разделить контексты по потребителям и частоте изменений", "Передать объект через window", "Мемоизировать весь объект один раз"],
    1,
    "Потребители должны зависеть только от нужного контракта. Разделение также уменьшает лишние обновления от быстро меняющихся данных.",
  ),
  "q-131": choice(
    ["architecture", "async"], ["apply", "defend"],
    "Как применить DIP к WebSocketClient?",
    ["Создавать WebSocket внутри каждого метода", "Принимать transport и retryPolicy через конструктор", "Наследоваться от браузерного WebSocket", "Хранить socket в глобальной переменной"],
    1,
    "Высокоуровневая политика соединения зависит от небольших контрактов transport и retryPolicy, которые можно заменить в тестах.",
  ),
  "q-132": explain(
    ["architecture"],
    "Два похожих компонента расходятся в требованиях. Объясни, когда DRY поможет, а когда общая абстракция создаст связанность.",
    undefined,
    ["дублирование знания, а не текста", "совместная причина изменения", "ложная абстракция", "стоимость изменения общего API", "возможность временно оставить дублирование"],
  ),
  "q-133": choice(
    ["architecture", "testing"], ["recall", "apply"],
    "Почему DAMP часто предпочтительнее строгого DRY в тестах?",
    ["Тесты не нужно поддерживать", "Небольшая явная повторяемость делает сценарий читаемым и локальным", "DAMP запрещает helpers", "Так тесты выполняются быстрее"],
    1,
    "В тестах читаемость сценария и причины падения часто важнее устранения каждой повторяющейся строки.",
  ),
  "q-134": choice(
    ["architecture", "react"], ["apply", "defend"],
    "Для локально открытого accordion предлагают Redux store. Какой принцип помогает выбрать более простое решение?",
    ["LSP", "KISS", "OCP", "ISP"],
    1,
    "Если состояние локально и не разделяется, useState проще, прозрачнее и дешевле глобального хранилища.",
  ),
  "q-135": choice(
    ["architecture"], ["apply", "defend"],
    "Команда из трёх человек заранее строит микрофронтенды для одного приложения без независимых релизов. Что проверить первым?",
    ["YAGNI и реальные организационные ограничения", "Цвет дизайн-системы", "Количество hooks", "Версию TypeScript"],
    0,
    "Микрофронтенды решают организационное масштабирование ценой сложности. Без подтверждённой потребности это вероятное нарушение YAGNI.",
  ),
  "q-136": choice(
    ["architecture"], ["recall", "apply"],
    "Какой вариант описывает хороший модуль?",
    ["Низкая cohesion и высокая coupling", "Высокая cohesion и низкая coupling", "Низкая cohesion и нулевая типизация", "Высокая coupling и много re-export"],
    1,
    "Связанные обязанности должны находиться рядом, а зависимости между модулями — проходить через небольшие стабильные контракты.",
  ),
  "q-137": explain(
    ["architecture"],
    "Объясни роль composition root во frontend-приложении и приведи место, где можно собрать реальные и тестовые зависимости.",
    undefined,
    ["единая точка сборки зависимостей", "граница приложения или feature", "отделение создания от использования", "простая замена тестовыми реализациями"],
  ),
  "q-138": explain(
    ["architecture", "javascript"],
    "Сравни передачу зависимости параметром, factory-функцию, React Context и DI-контейнер. Выбери минимальный вариант для небольшого frontend-модуля.",
    undefined,
    ["явный параметр или factory как базовый выбор", "Context для дерева React", "контейнер только при подтверждённой сложности", "видимость зависимостей", "тестируемость"],
  ),
  "q-139": explain(
    ["architecture"],
    "Спроектируй public API feature-модуля так, чтобы внутренние папки можно было менять без массового обновления импортов.",
    undefined,
    ["одна публичная точка входа", "минимальный экспорт", "запрет deep imports", "направление зависимостей", "контрактные тесты или typecheck"],
  ),
  "q-140": choice(
    ["architecture", "react"], ["apply", "debug"],
    "Компонент имеет 14 boolean props и множество несовместимых комбинаций. Какой рефакторинг наиболее уместен?",
    ["Добавить ещё defaults", "Выделить явные варианты или композиционные компоненты", "Перенести props в localStorage", "Обернуть JSX в useMemo"],
    1,
    "Явные варианты или композиция уменьшают невозможные состояния и делают контракт компонента понятнее.",
  ),
  "q-141": choice(
    ["architecture", "javascript"], ["apply", "defend"],
    "Есть три алгоритма сортировки результата, выбираемые во время выполнения. Что обычно проще глубокой иерархии наследования?",
    ["Strategy/callback", "Singleton", "Decorator DOM", "Global event bus"],
    0,
    "Алгоритм можно передать как функцию или strategy-объект. Это сохраняет полиморфизм без жёсткой связи базового и дочерних классов.",
  ),
  "q-142": explain(
    ["architecture", "typescript"],
    "Почему DTO внешнего API не стоит напрямую использовать как доменную модель и состояние UI?",
    undefined,
    ["внешний контракт меняется независимо", "runtime validation", "нормализация", "UI-specific state отдельно", "явный mapper и тесты"],
  ),
  "q-143": choice(
    ["architecture"], ["apply", "debug"],
    "Какой признак сильнее всего указывает на преждевременную абстракцию?",
    ["Она скрывает стабильное правило", "У неё один пользователь, много параметров на будущее и неизвестная причина изменения", "Она покрыта тестами", "У неё короткое имя"],
    1,
    "Абстракция без нескольких реальных сценариев обычно кодирует предположения и создаёт API, который придётся ломать.",
  ),
  "q-144": explain(
    ["architecture"],
    "Приведи пример разумного нарушения SOLID ради маленькой и обратимой задачи. Назови условие, при котором решение нужно пересмотреть.",
    undefined,
    ["контекст и ограничения", "осознанный компромисс", "обратимость", "наблюдаемый триггер пересмотра", "отсутствие догматизма"],
  ),
  "q-145": explain(
    ["architecture"],
    "Проведи архитектурный code review без вкусовщины: как связать замечание с риском и проверяемым улучшением?",
    undefined,
    ["конкретный сценарий изменения", "стоимость или дефект", "минимальная альтернатива", "trade-off", "тест или метрика проверки"],
  ),
  "q-146": explain(
    ["architecture"],
    "Дай трёхминутный ответ про SOLID для frontend-интервью без перечисления учебниковых определений.",
    undefined,
    ["краткая цель принципов", "реальный frontend-пример", "компромисс", "осознанное нарушение", "способ проверить результат"],
  ),
  "q-147": choice(
    ["javascript", "architecture"], ["apply", "defend"],
    "Как лучше не раскрывать внутренний изменяемый массив подписчиков?",
    ["Вернуть массив из getter", "Возвращать копию или операции над коллекцией", "Записать массив в globalThis", "Назвать поле _private"],
    1,
    "Инкапсуляция защищает инварианты: вызывающий получает допустимые операции или снимок, но не ссылку на внутреннюю коллекцию.",
  ),
  "q-148": choice(
    ["javascript"], ["recall", "apply"],
    "Что делает new перед вызовом функции-конструктора?",
    ["Клонирует prototype", "Создаёт объект, связывает его [[Prototype]] и вызывает функцию с новым this", "Создаёт ES-модуль", "Замораживает экземпляр"],
    1,
    "new создаёт объект с нужным прототипом, вызывает конструктор с this и обычно возвращает созданный объект.",
  ),
  "q-149": choice(
    ["javascript"], ["recall", "explain"],
    "Какое утверждение о class в JavaScript корректно?",
    ["Это отдельная от прототипов модель", "Методы class размещаются в prototype, но синтаксис добавляет strict mode и особые правила", "class копирует методы в каждый объект", "class создаёт interface TypeScript"],
    1,
    "Классы используют прототипное делегирование, но не являются только текстовой заменой constructor function: у синтаксиса есть дополнительные семантические правила.",
  ),
  "q-150": choice(
    ["javascript", "architecture"], ["apply", "defend"],
    "Что является практическим полиморфизмом в JavaScript?",
    ["Только extends", "Работа с разными объектами через общий ожидаемый контракт", "Только function overload", "Изменение prototype глобальных объектов"],
    1,
    "Код может вызывать общий метод у разных реализаций, не зная их конкретный класс; structural typing TypeScript поддерживает такой подход.",
  ),
  "q-151": choice(
    ["javascript", "architecture"], ["apply", "defend"],
    "Когда композиция предпочтительнее наследования?",
    ["Когда поведение нужно независимо комбинировать и заменять", "Когда хочется больше уровней классов", "Когда нет тестов", "Всегда без исключений"],
    0,
    "Композиция полезна для ортогональных заменяемых поведений. Наследование уместно при настоящем отношении подтипов и стабильном контракте.",
  ),
  "q-152": choice(
    ["javascript", "typescript"], ["recall", "apply"],
    "Чем #field сильнее соглашения _field?",
    ["Только цветом в IDE", "Доступ к #field проверяется самим языком", "#field сериализуется автоматически", "#field доступен наследникам напрямую"],
    1,
    "Private field недоступен снаружи и даже наследникам напрямую; это runtime-механизм языка, а не соглашение об имени.",
  ),
  "q-153": choice(
    ["typescript", "architecture"], ["apply", "defend"],
    "Когда abstract class оправданнее interface?",
    ["Когда нужен только structural contract", "Когда нужны общий runtime-код, защищённое состояние или шаблон жизненного цикла", "Для любого DTO", "Чтобы избежать композиции"],
    1,
    "Interface описывает форму на уровне типов. Abstract class существует во время выполнения и может разделять реализацию и состояние.",
  ),
  "q-154": choice(
    ["architecture", "typescript"], ["apply", "debug"],
    "Метод базового класса принимает любое положительное число, а override принимает только чётное. Что произошло?",
    ["Усилено предусловие и нарушен LSP", "Ослаблено предусловие", "Нарушен только DRY", "Применён ISP"],
    0,
    "Клиент базового контракта вправе передать нечётное положительное число, поэтому более строгое предусловие делает подтип невзаимозаменяемым.",
  ),
  "q-155": explain(
    ["javascript", "architecture"],
    "Объясни, как EventEmitter должен вести себя, если первый обработчик удаляет второй во время emit.",
    undefined,
    ["явно определить семантику", "снимок списка для текущего emit", "изменение влияет на следующий emit", "идемпотентная отписка", "тест граничного случая"],
  ),
  "q-156": explain(
    ["architecture", "typescript"],
    "Когда value object полезнее передачи нескольких строк и чисел между frontend-модулями?",
    undefined,
    ["единый инвариант", "семантическое имя", "валидация при создании", "неизменяемость", "не применять к каждому примитиву"],
  ),
  "q-157": choice(
    ["javascript", "architecture"], ["apply", "defend"],
    "Нужно один раз выбрать функцию форматирования по настройке. Какое решение минимально?",
    ["Иерархия из пяти классов", "Map/объект функций или factory, возвращающая callback", "Микрофронтенд", "Глобальный event bus"],
    1,
    "Простой registry функций сохраняет расширяемость и не вводит жизненный цикл и наследование без необходимости.",
  ),
  "q-158": explain(
    ["javascript", "testing"],
    "Как тестировать объект с приватным состоянием, не привязываясь к структуре его полей?",
    undefined,
    ["публичное поведение", "входы и наблюдаемые выходы", "инварианты", "не обращаться к приватным полям", "контрактные сценарии"],
  ),
};

export const getQuestionTraining = (questionId: string) =>
  QUESTION_TRAINING[questionId] ?? null;
