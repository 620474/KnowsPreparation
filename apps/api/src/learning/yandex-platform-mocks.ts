import type { YandexMockDayId } from "@prep/contracts";

export interface YandexPlatformMockQuestionDefinition {
  id: string;
  topic: string;
  prompt: string;
  code: string;
  expectedAnswer: string;
  explanation: string;
}

const daySeven: YandexPlatformMockQuestionDefinition[] = [
  {
    id: "d07-scope-01",
    topic: "Hoisting и TDZ",
    prompt: "Что произойдёт при выполнении? Назови тип ошибки и строку, на которой она возникнет.",
    code: `console.log(label);
const label = "ready";
console.log(label);`,
    expectedAnswer: "ReferenceError на первой строке; второй console.log не выполнится.",
    explanation: "Binding для const создаётся при входе в область, но до инициализации находится в TDZ. Это не undefined, как у var.",
  },
  {
    id: "d07-closure-02",
    topic: "Замыкания",
    prompt: "Предскажи точный массив и объясни, какое значение удерживает каждая функция.",
    code: `const readers = [];
for (var index = 0; index < 3; index += 1) {
  readers.push(() => index);
}
console.log(readers.map((read) => read()));`,
    expectedAnswer: "[3, 3, 3]",
    explanation: "Все стрелки замыкаются на один function-scoped binding index. После цикла его значение равно 3.",
  },
  {
    id: "d07-this-03",
    topic: "this",
    prompt: "Что выведут два вызова в строгом режиме и почему?",
    code: `"use strict";
const user = {
  name: "Ada",
  read() { return this?.name; },
};
const detached = user.read;
console.log(user.read());
console.log(detached());`,
    expectedAnswer: "Сначала Ada, затем undefined.",
    explanation: "Первый вызов имеет receiver user. Во втором функция отделена от объекта, поэтому this равен undefined; optional chaining предотвращает TypeError.",
  },
  {
    id: "d07-prototype-04",
    topic: "Prototype chain",
    prompt: "Назови точный вывод и объясни разницу между чтением и записью свойства.",
    code: `const base = { role: "base" };
const child = Object.create(base);
console.log(child.role, Object.hasOwn(child, "role"));
child.role = "child";
console.log(child.role, base.role, Object.hasOwn(child, "role"));`,
    expectedAnswer: "base false; затем child base true.",
    explanation: "Первое чтение находит role в прототипе. Присваивание создаёт собственное свойство child и затеняет base.role.",
  },
  {
    id: "d07-coercion-05",
    topic: "Преобразования типов",
    prompt: "Предскажи три результата и для каждого назови применённое преобразование.",
    code: `console.log([] + {});
console.log({} + []);
console.log("5" - 2, "5" + 2);`,
    expectedAnswer: "[object Object]; [object Object]; затем 3 и 52.",
    explanation: "В бинарном + объекты приводятся к примитивам, после чего строка вызывает конкатенацию. Оператор - приводит строку к числу, а + со строкой выполняет конкатенацию.",
  },
  {
    id: "d07-descriptor-06",
    topic: "Дескрипторы",
    prompt: "Что выведет код? Можно ли изменить значение и почему strict mode здесь важен?",
    code: `"use strict";
const state = {};
Object.defineProperty(state, "count", {
  value: 1,
  writable: false,
  enumerable: true,
});
state.count = 2;
console.log(state.count);`,
    expectedAnswer: "Возникнет TypeError на присваивании; console.log не выполнится.",
    explanation: "Свойство существует, но writable: false. В strict mode попытка записи приводит к TypeError вместо молчаливого игнорирования.",
  },
  {
    id: "d07-var-scope-07",
    topic: "Области видимости var",
    prompt: "Что выведется и почему переменная доступна за пределами блока?",
    code: `function read() {
  if (true) {
    var value = 7;
  }
  console.log(value);
}
read();`,
    expectedAnswer: "7",
    explanation: "var имеет функциональную, а не блочную область видимости. Объявление поднимается в начало функции read.",
  },
  {
    id: "d07-shadowing-08",
    topic: "Лексические области",
    prompt: "Что произойдёт при выполнении внутреннего блока?",
    code: `const value = 1;
{
  console.log(value);
  const value = 2;
}`,
    expectedAnswer: "ReferenceError на console.log.",
    explanation: "Внутренний const затеняет внешний value на всём блоке, но до строки инициализации находится в TDZ.",
  },
  {
    id: "d07-default-params-09",
    topic: "Параметры по умолчанию",
    prompt: "Вернёт ли функция значение или выбросит ошибку?",
    code: `const value = 10;
function read(value = value) {
  return value;
}
console.log(read());`,
    expectedAnswer: "ReferenceError при вычислении параметра по умолчанию.",
    explanation: "Параметр value создаёт собственный binding и затеняет внешний. Его правая часть обращается к этому же неинициализированному binding.",
  },
  {
    id: "d07-equality-10",
    topic: "Равенство и coercion",
    prompt: "Предскажи четыре булевых результата.",
    code: `console.log(null == undefined);
console.log(null == 0);
console.log(false == 0);
console.log([] == false);`,
    expectedAnswer: "true, false, true, true",
    explanation: "null неявно равен только undefined. false приводится к 0. Пустой массив превращается в пустую строку, затем в 0.",
  },
  {
    id: "d07-symbol-11",
    topic: "Symbol и перечисление",
    prompt: "Какие ключи попадут в каждый вывод?",
    code: `const token = Symbol("token");
const data = { visible: 1, [token]: 2 };
console.log(Object.keys(data));
console.log(Reflect.ownKeys(data));`,
    expectedAnswer: "Object.keys вернёт [\"visible\"]; Reflect.ownKeys вернёт [\"visible\", Symbol(token)].",
    explanation: "Object.keys перечисляет только собственные enumerable string-ключи. Reflect.ownKeys включает также символы.",
  },
  {
    id: "d07-freeze-12",
    topic: "Object.freeze",
    prompt: "Что выведется и почему заморозка не остановила изменение?",
    code: `const state = Object.freeze({ nested: { count: 1 } });
state.nested.count = 2;
console.log(state.nested.count);`,
    expectedAnswer: "2",
    explanation: "Object.freeze действует поверхностно: ссылка nested защищена от замены, но сам вложенный объект не заморожен.",
  },
  {
    id: "d07-getter-13",
    topic: "Геттеры и this",
    prompt: "Что выведет чтение свойства у наследника?",
    code: `const base = {
  value: 2,
  get doubled() { return this.value * 2; },
};
const child = Object.create(base);
child.value = 5;
console.log(child.doubled);`,
    expectedAnswer: "10",
    explanation: "Геттер найден в прототипе, но вызывается с receiver child, поэтому this.value равно 5.",
  },
  {
    id: "d07-delete-14",
    topic: "configurable",
    prompt: "Что произойдёт при удалении свойства в строгом режиме?",
    code: `"use strict";
const data = {};
Object.defineProperty(data, "id", { value: 1 });
delete data.id;
console.log(data.id);`,
    expectedAnswer: "TypeError на delete; console.log не выполнится.",
    explanation: "У defineProperty configurable по умолчанию false. В strict mode удаление такого свойства выбрасывает TypeError.",
  },
  {
    id: "d07-instanceof-15",
    topic: "instanceof",
    prompt: "Почему две проверки дадут разные результаты?",
    code: `function Box() {}
const first = new Box();
Box.prototype = {};
const second = new Box();
console.log(first instanceof Box, second instanceof Box);`,
    expectedAnswer: "false true",
    explanation: "instanceof ищет текущий Box.prototype в цепочке объекта. first связан со старым prototype, second — с новым.",
  },
  {
    id: "d07-array-holes-16",
    topic: "Разреженные массивы",
    prompt: "Сколько раз вызовется callback и какой массив получится?",
    code: `const source = [1, , 3];
let calls = 0;
const result = source.map((value) => {
  calls += 1;
  return value * 2;
});
console.log(calls, result.length, 1 in result);`,
    expectedAnswer: "2 3 false",
    explanation: "map пропускает отсутствующие элементы, но сохраняет длину и hole на той же позиции.",
  },
  {
    id: "d07-json-17",
    topic: "JSON-сериализация",
    prompt: "Какая строка получится после JSON.stringify?",
    code: `const value = {
  missing: undefined,
  list: [undefined, function run() {}, Symbol("x")],
};
console.log(JSON.stringify(value));`,
    expectedAnswer: "{\"list\":[null,null,null]}",
    explanation: "Непредставимые значения в объектах пропускаются, а в массивах заменяются на null для сохранения индексов.",
  },
];

const dayFourteen: YandexPlatformMockQuestionDefinition[] = [
  {
    id: "d14-loop-01",
    topic: "Event Loop",
    prompt: "Запиши точный порядок вывода.",
    code: `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
queueMicrotask(() => console.log("D"));
console.log("E");`,
    expectedAnswer: "A E C D B",
    explanation: "Синхронный код выполняется первым. Promise reaction и queueMicrotask попадают в одну FIFO-очередь микрозадач. Таймер выполняется следующей task.",
  },
  {
    id: "d14-await-02",
    topic: "async/await",
    prompt: "Запиши порядок вывода и объясни, где прерывается async-функция.",
    code: `async function run() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}
console.log(3);
run();
console.log(4);`,
    expectedAnswer: "3 1 4 2",
    explanation: "run выполняется синхронно до await. Продолжение после await ставится в очередь микрозадач.",
  },
  {
    id: "d14-chain-03",
    topic: "Promise chain",
    prompt: "Что выведется и какое значение получит последний then?",
    code: `Promise.resolve(2)
  .then((value) => value * 2)
  .then((value) => { throw new Error(String(value)); })
  .catch((error) => Number(error.message) + 1)
  .then((value) => console.log(value));`,
    expectedAnswer: "5",
    explanation: "Первый then возвращает 4. Исключение переводит цепочку в rejected. catch возвращает 5 и восстанавливает fulfilled-состояние.",
  },
  {
    id: "d14-finally-04",
    topic: "Promise.finally",
    prompt: "Что выведет код? Изменит ли finally итоговое значение?",
    code: `Promise.resolve("value")
  .finally(() => "replacement")
  .then((value) => console.log(value));`,
    expectedAnswer: "value",
    explanation: "Обычное возвращаемое значение finally игнорируется. Оно заменило бы исход только при исключении или rejected Promise.",
  },
  {
    id: "d14-timer-05",
    topic: "Таймеры",
    prompt: "Почему таймер не сработает через 10 мс и что будет выведено первым?",
    code: `const started = Date.now();
setTimeout(() => console.log("timer", Date.now() - started), 10);
while (Date.now() - started < 100) {}
console.log("sync");`,
    expectedAnswer: "Сначала sync, затем timer с задержкой не меньше примерно 100 мс.",
    explanation: "Задержка таймера — минимальное время до готовности callback. Пока текущая task блокирует поток, callback не может выполниться.",
  },
  {
    id: "d14-microtask-06",
    topic: "Microtask starvation",
    prompt: "Сможет ли выполниться setTimeout? Объясни риск этого кода.",
    code: `function repeat() {
  queueMicrotask(repeat);
}
setTimeout(() => console.log("timer"), 0);
repeat();`,
    expectedAnswer: "В обычной модели timer не получит управление, потому что checkpoint микрозадач никогда не завершится.",
    explanation: "Каждая микрозадача добавляет следующую. Очередь не опустошается, поэтому event loop не переходит к следующей task и рендерингу.",
  },
  {
    id: "d14-constructor-07",
    topic: "Promise constructor",
    prompt: "Запиши точный порядок вывода.",
    code: `console.log("A");
new Promise((resolve) => {
  console.log("B");
  resolve();
}).then(() => console.log("C"));
console.log("D");`,
    expectedAnswer: "A B D C",
    explanation: "Executor Promise вызывается синхронно. Callback then выполняется позже как микрозадача.",
  },
  {
    id: "d14-catch-08",
    topic: "Обработка ошибок Promise",
    prompt: "Будет ли ошибка обработана этим catch?",
    code: `Promise.reject(new Error("first"))
  .catch(() => { throw new Error("second"); })
  .then(
    () => console.log("ok"),
    (error) => console.log(error.message),
  );`,
    expectedAnswer: "Будет выведено second.",
    explanation: "Первый catch обрабатывает исходный reject, но сам выбрасывает новую ошибку. Следующий then получает её во второй обработчик.",
  },
  {
    id: "d14-thenable-09",
    topic: "Thenable assimilation",
    prompt: "Какое значение получит then и почему?",
    code: `const thenable = {
  then(resolve) {
    resolve(1);
    resolve(2);
  },
};
Promise.resolve(thenable).then(console.log);`,
    expectedAnswer: "1",
    explanation: "Promise принимает только первый переход состояния. Повторный вызов resolve игнорируется.",
  },
  {
    id: "d14-all-10",
    topic: "Promise.all",
    prompt: "Что попадёт в обработчики и дождётся ли Promise.all таймера?",
    code: `const slow = new Promise((resolve) => setTimeout(() => resolve("slow"), 20));
Promise.all([slow, Promise.reject("fail")])
  .then(console.log)
  .catch(console.log);`,
    expectedAnswer: "catch выведет fail, не дожидаясь выполнения slow.",
    explanation: "Promise.all отклоняется при первом rejected-элементе. Сам slow не отменяется и продолжит выполняться отдельно.",
  },
  {
    id: "d14-any-11",
    topic: "Promise.any",
    prompt: "Чем завершится операция и что содержит ошибка?",
    code: `Promise.any([
  Promise.reject("A"),
  Promise.reject("B"),
]).catch((error) => {
  console.log(error.name, error.errors);
});`,
    expectedAnswer: "AggregateError [\"A\", \"B\"]",
    explanation: "Promise.any отклоняется только когда отклонены все входы, и собирает причины в AggregateError.errors.",
  },
  {
    id: "d14-async-return-12",
    topic: "Возврат async-функции",
    prompt: "Что выведется и каким объектом является result?",
    code: `async function read() {
  return 5;
}
const result = read();
console.log(result instanceof Promise);
result.then(console.log);`,
    expectedAnswer: "Сначала true, затем 5.",
    explanation: "async-функция всегда возвращает Promise; обычное значение автоматически становится fulfilled-результатом.",
  },
  {
    id: "d14-await-reject-13",
    topic: "Ошибки async/await",
    prompt: "Какой вывод получится после отклонения Promise?",
    code: `async function run() {
  try {
    await Promise.reject("fail");
    console.log("after");
  } catch (error) {
    console.log(error);
  }
}
run();`,
    expectedAnswer: "fail",
    explanation: "Отклонённый Promise в await ведёт себя как throw. Строка after пропускается, управление переходит в catch.",
  },
  {
    id: "d14-nested-microtasks-14",
    topic: "Очередь микрозадач",
    prompt: "Запиши точный порядок вывода вложенных микрозадач.",
    code: `queueMicrotask(() => {
  console.log("A");
  queueMicrotask(() => console.log("C"));
});
Promise.resolve().then(() => console.log("B"));`,
    expectedAnswer: "A B C",
    explanation: "A уже стоит первой. Во время её выполнения C добавляется в конец очереди после ранее поставленной B.",
  },
  {
    id: "d14-timer-nesting-15",
    topic: "Tasks и microtasks",
    prompt: "Запиши порядок вывода двух таймеров и Promise.",
    code: `setTimeout(() => {
  console.log("timer 1");
  Promise.resolve().then(() => console.log("promise"));
}, 0);
setTimeout(() => console.log("timer 2"), 0);`,
    expectedAnswer: "timer 1, promise, timer 2",
    explanation: "После каждой task движок опустошает очередь микрозадач, поэтому promise выполняется до следующего таймера.",
  },
  {
    id: "d14-foreach-16",
    topic: "async callback в forEach",
    prompt: "Почему done выводится раньше чисел и ждёт ли forEach callback?",
    code: `[1, 2].forEach(async (value) => {
  await Promise.resolve();
  console.log(value);
});
console.log("done");`,
    expectedAnswer: "done, затем 1 и 2.",
    explanation: "forEach не использует возвращённые Promise. Оба callback доходят до await, а синхронный код продолжает выполнение.",
  },
  {
    id: "d14-race-17",
    topic: "Promise.race",
    prompt: "Какое значение победит, учитывая уже выполненный Promise?",
    code: `const timer = new Promise((resolve) => setTimeout(() => resolve("timer"), 0));
Promise.race([timer, Promise.resolve("ready")]).then(console.log);`,
    expectedAnswer: "ready",
    explanation: "Оба результата доставляются асинхронно, но reaction уже fulfilled Promise ставится в микрозадачи раньше callback таймера.",
  },
];

const dayTwentyOne: YandexPlatformMockQuestionDefinition[] = [
  {
    id: "d21-mixed-01",
    topic: "Scope + Event Loop",
    prompt: "Запиши точный порядок вывода.",
    code: `for (let index = 0; index < 2; index += 1) {
  setTimeout(() => console.log("timer", index), 0);
  Promise.resolve().then(() => console.log("promise", index));
}
console.log("done");`,
    expectedAnswer: "done; promise 0; promise 1; timer 0; timer 1.",
    explanation: "let создаёт binding на итерацию. Сначала синхронный done, затем микрозадачи в порядке добавления, после них таймеры.",
  },
  {
    id: "d21-this-02",
    topic: "this + callback",
    prompt: "Что вернут direct и callback? Предложи минимальное исправление callback.",
    code: `"use strict";
const counter = {
  value: 2,
  multiply(factor) { return this.value * factor; },
};
const direct = counter.multiply(3);
const callback = [4].map(counter.multiply);`,
    expectedAnswer: "direct равен 6; map выбросит TypeError при чтении value. Исправление: map(counter.multiply.bind(counter)) или стрелка.",
    explanation: "map вызывает callback без receiver counter. В strict mode this не указывает на counter.",
  },
  {
    id: "d21-prototype-03",
    topic: "Классы и прототипы",
    prompt: "Какие проверки вернут true и где физически хранится метод read?",
    code: `class Box {
  read() { return 1; }
}
const box = new Box();
console.log(
  Object.hasOwn(box, "read"),
  Object.hasOwn(Box.prototype, "read"),
  box.read === Box.prototype.read,
);`,
    expectedAnswer: "false true true; метод хранится в Box.prototype.",
    explanation: "Class syntax создаёт методы в prototype, а экземпляр получает к ним доступ через prototype chain.",
  },
  {
    id: "d21-copy-04",
    topic: "Ссылки и копирование",
    prompt: "Что выведется и почему spread не защитил вложенный объект?",
    code: `const original = { profile: { name: "Ada" } };
const copy = { ...original };
copy.profile.name = "Grace";
console.log(original.profile.name, copy.profile === original.profile);`,
    expectedAnswer: "Grace true",
    explanation: "Object spread выполняет поверхностное копирование. Оба верхнеуровневых объекта содержат одну ссылку на profile.",
  },
  {
    id: "d21-abort-05",
    topic: "AbortController",
    prompt: "Что гарантирует abort и означает ли он автоматическую отмену любой Promise?",
    code: `const controller = new AbortController();
const promise = new Promise((resolve) => {
  setTimeout(() => resolve("done"), 10);
});
controller.abort();
promise.then(console.log);`,
    expectedAnswer: "Будет выведено done. abort сам по себе не отменяет произвольный Promise.",
    explanation: "AbortController только меняет состояние signal и рассылает abort. Операция должна явно поддерживать signal и реагировать на него.",
  },
  {
    id: "d21-react-06",
    topic: "React и stale closure",
    prompt: "Почему три вызова обработчика могут установить только 1 и как исправить обновление?",
    code: `function Counter() {
  const [count, setCount] = useState(0);
  const increment = () => setCount(count + 1);
  const triple = () => {
    increment();
    increment();
    increment();
  };
}`,
    expectedAnswer: "Все вызовы используют count равный 0 и запрашивают значение 1. Нужно setCount((current) => current + 1).",
    explanation: "Каждый render создаёт снимок состояния для своих обработчиков. Functional updater последовательно получает актуальное промежуточное значение очереди обновлений.",
  },
  {
    id: "d21-batching-07",
    topic: "React batching",
    prompt: "Какое значение будет после клика и почему обновления не потеряются?",
    code: `function Counter() {
  const [count, setCount] = useState(0);
  const click = () => {
    setCount((value) => value + 1);
    setCount((value) => value + 1);
    setCount((value) => value + 1);
  };
}`,
    expectedAnswer: "После одного click значение станет 3.",
    explanation: "Functional updater получает результат предыдущего обновления в очереди: 0 → 1 → 2 → 3, даже если React объединяет рендеры.",
  },
  {
    id: "d21-effect-cleanup-08",
    topic: "React useEffect",
    prompt: "В каком порядке выполнятся effect и cleanup при смене id, а затем размонтировании?",
    code: `useEffect(() => {
  console.log("subscribe", id);
  return () => console.log("unsubscribe", id);
}, [id]);`,
    expectedAnswer: "Для первого id: subscribe. При смене: unsubscribe старого id, затем subscribe нового. При unmount: unsubscribe нового.",
    explanation: "Перед запуском нового effect React вызывает cleanup предыдущего, а при размонтировании очищает последний активный effect.",
  },
  {
    id: "d21-memo-09",
    topic: "React.memo",
    prompt: "Почему Child всё равно перерисуется при каждом рендере Parent?",
    code: `const Child = memo(function Child({ options }) {
  return <div>{options.limit}</div>;
});
function Parent() {
  const options = { limit: 10 };
  return <Child options={options} />;
}`,
    expectedAnswer: "На каждом рендере Parent создаётся новый объект options, поэтому поверхностное сравнение React.memo видит изменившийся prop.",
    explanation: "React.memo сравнивает ссылки. Стабилизировать объект можно useMemo, если повторный рендер Child действительно дорогой.",
  },
  {
    id: "d21-destructuring-10",
    topic: "Деструктуризация",
    prompt: "Какие значения будут у first и second?",
    code: `const { first = 1, second = 2 } = {
  first: null,
  second: undefined,
};
console.log(first, second);`,
    expectedAnswer: "null 2",
    explanation: "Значение по умолчанию применяется только при undefined. null считается явно переданным значением.",
  },
  {
    id: "d21-optional-chain-11",
    topic: "Optional chaining",
    prompt: "Чем различаются два выражения?",
    code: `const user = null;
console.log(user?.profile?.name);
console.log((user?.profile).name);`,
    expectedAnswer: "Первый console.log выведет undefined; второй выбросит TypeError.",
    explanation: "Непрерывная optional chain безопасно останавливается. Скобки завершают цепочку, после чего .name читается у undefined.",
  },
  {
    id: "d21-map-12",
    topic: "Map и идентичность ключей",
    prompt: "Что выведется и почему одинаковая форма объектов не делает ключи равными?",
    code: `const map = new Map();
map.set({ id: 1 }, "value");
console.log(map.get({ id: 1 }), map.size);`,
    expectedAnswer: "undefined 1",
    explanation: "Объектные ключи Map сравниваются по идентичности ссылки. Второй литерал создаёт другой объект.",
  },
  {
    id: "d21-set-13",
    topic: "Set и SameValueZero",
    prompt: "Какой размер Set и какие проверки истинны?",
    code: `const values = new Set([NaN, NaN, 0, -0]);
console.log(values.size, values.has(NaN), values.has(-0));`,
    expectedAnswer: "2 true true",
    explanation: "Set использует SameValueZero: NaN равен NaN, а +0 и -0 считаются одним значением.",
  },
  {
    id: "d21-private-14",
    topic: "Приватные поля классов",
    prompt: "Можно ли вызвать метод с чужим receiver?",
    code: `class Counter {
  #value = 1;
  read() { return this.#value; }
}
const counter = new Counter();
console.log(counter.read.call({}));`,
    expectedAnswer: "TypeError",
    explanation: "Доступ к #value выполняет brand check. Обычный объект не является экземпляром с приватным полем Counter.",
  },
  {
    id: "d21-proxy-15",
    topic: "Proxy и Reflect",
    prompt: "Что выведется и зачем передавать receiver в Reflect.get?",
    code: `const target = {
  value: 2,
  get doubled() { return this.value * 2; },
};
const proxy = new Proxy(target, {
  get(object, key, receiver) {
    return Reflect.get(object, key, receiver);
  },
});
proxy.value = 5;
console.log(proxy.doubled);`,
    expectedAnswer: "10",
    explanation: "Reflect.get вызывает геттер с receiver proxy. Поэтому this.value читается через proxy и равно 5.",
  },
  {
    id: "d21-clone-16",
    topic: "structuredClone",
    prompt: "Какие сравнения истинны после глубокого клонирования?",
    code: `const source = {
  date: new Date("2020-01-01"),
  nested: { value: 1 },
};
const copy = structuredClone(source);
console.log(
  copy !== source,
  copy.nested !== source.nested,
  copy.date instanceof Date,
);`,
    expectedAnswer: "true true true",
    explanation: "structuredClone создаёт новые вложенные объекты и сохраняет поддерживаемые встроенные типы, включая Date.",
  },
];

export const YANDEX_PLATFORM_MOCK_DAY_IDS = [
  "yandex-d07",
  "yandex-d14",
  "yandex-d21",
] as const satisfies readonly YandexMockDayId[];

export const YANDEX_PLATFORM_MOCKS: Record<
  YandexMockDayId,
  YandexPlatformMockQuestionDefinition[]
> = {
  "yandex-d07": daySeven,
  "yandex-d14": dayFourteen,
  "yandex-d21": dayTwentyOne,
};

export const getYandexPlatformMockQuestions = (dayId: YandexMockDayId) =>
  YANDEX_PLATFORM_MOCKS[dayId];

export const getYandexPlatformMockQuestion = (
  dayId: YandexMockDayId,
  questionId: string,
) => YANDEX_PLATFORM_MOCKS[dayId].find((question) => question.id === questionId);
