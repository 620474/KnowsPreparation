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
