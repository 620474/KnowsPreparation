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
};

export const getQuestionTraining = (questionId: string) =>
  QUESTION_TRAINING[questionId] ?? null;
