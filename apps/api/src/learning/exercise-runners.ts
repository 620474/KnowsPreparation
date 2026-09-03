import type { StudyExerciseRunner } from "./curriculum";

const runner = (
  starterCode: string,
  testCases: StudyExerciseRunner["testCases"],
): StudyExerciseRunner => ({ starterCode, testCases });

const groupAnagramsRunner = runner(
  `function groupAnagrams(words) {
  // Верни массив групп анаграмм
}`,
  [
    {
      title: "Группирует основной пример",
      expression: "groupAnagrams(['eat','tea','tan','ate','nat','bat']).map(group => [...group].sort().join(',')).sort()",
      expected: ["ate,eat,tea", "bat", "nat,tan"],
    },
    { title: "Обрабатывает пустую строку", expression: "groupAnagrams([''])", expected: [[""]] },
  ],
);

const runners = {
  "yandex-d01-algorithms": runner(
    `function findMostFrequent(numbers) {
  // Верни самый частый элемент или null
}`,
    [
      { title: "Находит частый элемент", expression: "findMostFrequent([1,2,2,3,3,3])", expected: 3 },
      { title: "Сохраняет первый при равенстве", expression: "findMostFrequent([4,4,2,2])", expected: 4 },
      { title: "Пустой массив", expression: "findMostFrequent([])", expected: null },
    ],
  ),
  "yandex-d02-algorithms": runner(
    `function countWords(words) {
  // Верни частотный словарь
}

function firstUniqueChar(text) {
  // Верни индекс первого уникального символа
}`,
    [
      { title: "Считает слова", expression: "countWords(['js','react','js'])", expected: { js: 2, react: 1 } },
      { title: "Ищет уникальный символ", expression: "firstUniqueChar('aabbcdde')", expected: 4 },
      { title: "Нет уникальных", expression: "firstUniqueChar('aabb')", expected: -1 },
    ],
  ),
  "yandex-d03-algorithms": runner(
    `function twoSum(numbers, target) {
  // Верни два индекса
}`,
    [
      { title: "Основной пример", expression: "twoSum([2,7,11,15], 9)", expected: [0, 1] },
      { title: "Не использует элемент дважды", expression: "twoSum([3,2,4], 6)", expected: [1, 2] },
    ],
  ),
  "yandex-d04-algorithms": groupAnagramsRunner,
  "yandex-d05-algorithms": runner(
    `function findSortedPair(numbers, target) {
  // Используй два указателя
}`,
    [
      { title: "Находит пару", expression: "findSortedPair([1,2,4,6,10], 8)", expected: [1, 3] },
      { title: "Пары нет", expression: "findSortedPair([1,2,3], 10)", expected: [-1, -1] },
    ],
  ),
  "yandex-d06-algorithms": runner(
    `function longestUniqueSubstring(text) {
  // Верни длину подстроки без повторов
}`,
    [
      { title: "Повторяющийся шаблон", expression: "longestUniqueSubstring('abcabcbb')", expected: 3 },
      { title: "Пустая строка", expression: "longestUniqueSubstring('')", expected: 0 },
    ],
  ),
  "yandex-d07-algorithms": runner(
    `function topKFrequentWords(words, k) {
  // Частота по убыванию, слово по возрастанию
}`,
    [
      { title: "Частые слова", expression: "topKFrequentWords(['i','love','js','i','love','code'], 2)", expected: ["i", "love"] },
      { title: "Лексикографический tie-break", expression: "topKFrequentWords(['b','a','c','b','a'], 2)", expected: ["a", "b"] },
    ],
  ),
  "yandex-d08-algorithms": runner(
    `class RecentCounter {
  constructor() {
    // Инициализируй очередь
  }

  ping(timestamp) {
    // Верни число запросов в [timestamp - 3000, timestamp]
  }
}`,
    [
      { title: "Считает скользящее окно", expression: "(() => { const counter = new RecentCounter(); return [1,100,3001,3002].map(value => counter.ping(value)); })()", expected: [1, 2, 3, 3] },
    ],
  ),
  "yandex-d09-algorithms": runner(
    `function isValidBrackets(text) {
  // Проверь скобочную последовательность
}`,
    [
      { title: "Корректные скобки", expression: "isValidBrackets('()[]{}')", expected: true },
      { title: "Нарушенный порядок", expression: "isValidBrackets('([)]')", expected: false },
      { title: "Пустая строка", expression: "isValidBrackets('')", expected: true },
    ],
  ),
  "yandex-d10-algorithms": runner(
    `async function fetchWithRetry(request, retries) {
  // Выполняй попытки последовательно
}`,
    [
      { title: "Успех после ошибок", expression: "(async () => { let calls = 0; const value = await fetchWithRetry(async () => { calls += 1; if (calls < 3) throw new Error('fail'); return 7; }, 2); return { value, calls }; })()", expected: { value: 7, calls: 3 } },
      { title: "Выбрасывает последнюю ошибку", expression: "fetchWithRetry(async () => { throw new Error('last'); }, 1)", expectedError: "last" },
    ],
  ),
  "yandex-d11-algorithms": runner(
    `function splitWordsBySeparator(words, separator) {
  // Верни плоский массив непустых частей
}`,
    [
      { title: "Разделяет слова", expression: "splitWordsBySeparator(['one.two','three.four'], '.')", expected: ["one", "two", "three", "four"] },
      { title: "Убирает пустые части", expression: "splitWordsBySeparator(['$easy$','$problem$'], '$')", expected: ["easy", "problem"] },
    ],
  ),
  "yandex-d12-algorithms": runner(
    `function createCounter(initialValue) {
  // Верни объект с increment, decrement, reset и getValue
}`,
    [
      { title: "Меняет и сбрасывает значение", expression: "(() => { const counter = createCounter(5); return [counter.increment(), counter.increment(), counter.decrement(), counter.reset(), counter.getValue()]; })()", expected: [6, 7, 6, 5, 5] },
      { title: "Метод не теряет состояние", expression: "(() => { const { increment } = createCounter(0); return increment(); })()", expected: 1 },
    ],
  ),
  "yandex-d13-algorithms": runner(
    `async function promiseSum(first, second) {
  // Верни Promise суммы
}`,
    [
      { title: "Складывает значения", expression: "promiseSum(Promise.resolve(2), Promise.resolve(3))", expected: 5 },
      { title: "Не скрывает ошибку", expression: "promiseSum(Promise.reject(new Error('fail')), Promise.resolve(3))", expectedError: "fail" },
    ],
  ),
  "yandex-d14-algorithms": runner(
    `function minWindow(source, target) {
  // Верни минимальное окно
}`,
    [
      { title: "Находит минимальное окно", expression: "minWindow('ADOBECODEBANC', 'ABC')", expected: "BANC" },
      { title: "Окна нет", expression: "minWindow('a', 'aa')", expected: "" },
    ],
  ),
  "yandex-d15-algorithms": runner(
    `function memoize(fn) {
  // Верни мемоизированную функцию
}`,
    [
      { title: "Не повторяет вычисление", expression: "(() => { let calls = 0; const add = memoize((a, b) => { calls += 1; return a + b; }); return { values: [add(2,3), add(2,3)], calls }; })()", expected: { values: [5, 5], calls: 1 } },
      { title: "Различает типы", expression: "(() => { let calls = 0; const value = memoize((item) => { calls += 1; return String(item); }); value(1); value('1'); return calls; })()", expected: 2 },
    ],
  ),
  "yandex-d16-algorithms": runner(
    `function maximumStringValue(values) {
  // Числовая строка даёт число, другая — длину
}`,
    [
      { title: "Сравнивает значения", expression: "maximumStringValue(['alic3','bob','3','4','00000'])", expected: 5 },
      { title: "Учитывает ведущие нули", expression: "maximumStringValue(['1','01','001','0001'])", expected: 1 },
    ],
  ),
  "yandex-d17-algorithms": runner(
    `function restoreRoute(tickets) {
  // Верни города от начала маршрута до конца
}`,
    [
      { title: "Восстанавливает маршрут", expression: "restoreRoute([['Москва','Париж'],['Берлин','Москва'],['Париж','Лондон']])", expected: ["Берлин", "Москва", "Париж", "Лондон"] },
      { title: "Один билет", expression: "restoreRoute([['A','B']])", expected: ["A", "B"] },
    ],
  ),
  "yandex-d18-algorithms": runner(
    `function replaceAll(source, search, replacement) {
  // Не используй String.prototype.replaceAll
}`,
    [
      { title: "Заменяет обычный текст", expression: "replaceAll('foo.bar.foo', 'foo', 'x')", expected: "x.bar.x" },
      { title: "Не пересекает вхождения", expression: "replaceAll('aaaa', 'aa', 'b')", expected: "bb" },
    ],
  ),
  "yandex-d19-algorithms": runner(
    `function mergeSorted(first, second) {
  // Слей массивы без sort
}

function binarySearch(numbers, target) {
  // Верни индекс или -1
}`,
    [
      { title: "Сливает массивы", expression: "mergeSorted([1,3,5], [2,4,6])", expected: [1, 2, 3, 4, 5, 6] },
      { title: "Находит элемент", expression: "binarySearch([1,3,5,7], 5)", expected: 2 },
      { title: "Элемента нет", expression: "binarySearch([1,3,5,7], 4)", expected: -1 },
    ],
  ),
  "yandex-d20-algorithms": runner(
    `function minMeetingRooms(intervals) {
  // Верни минимальное число комнат
}`,
    [
      { title: "Считает пересечения", expression: "minMeetingRooms([[0,30],[5,10],[15,20]])", expected: 2 },
      { title: "Граница не конфликтует", expression: "minMeetingRooms([[7,10],[10,12]])", expected: 1 },
    ],
  ),
  "yandex-d21-algorithms": runner(
    `function longestConsecutive(numbers) {
  // Средняя сложность O(n)
}`,
    [
      { title: "Находит последовательность", expression: "longestConsecutive([100,4,200,1,3,2])", expected: 4 },
      { title: "Игнорирует дубликаты", expression: "longestConsecutive([0,3,7,2,5,8,4,6,0,1])", expected: 9 },
      { title: "Пустой массив", expression: "longestConsecutive([])", expected: 0 },
    ],
  ),
  "w02-d04-practice": runner(
    `class EventEmitter {
  constructor() {
    // Создай закрытое для экземпляра хранилище обработчиков
  }

  on(event, handler) {
    // Добавь обработчик и верни функцию отписки
  }

  emit(event, ...args) {
    // Вызови актуальные обработчики
  }
}`,
    [
      { title: "Передаёт аргументы подписчикам", expression: "(() => { const emitter = new EventEmitter(); const values = []; emitter.on('data', (left, right) => values.push(left + right)); emitter.emit('data', 2, 3); return values; })()", expected: [5] },
      { title: "Отписывает только выбранный обработчик", expression: "(() => { const emitter = new EventEmitter(); const values = []; const unsubscribe = emitter.on('data', value => values.push('first:' + value)); emitter.on('data', value => values.push('second:' + value)); unsubscribe(); unsubscribe(); emitter.emit('data', 7); return values; })()", expected: ["second:7"] },
      { title: "Изолирует разные события", expression: "(() => { const emitter = new EventEmitter(); let calls = 0; emitter.on('open', () => calls += 1); emitter.emit('close'); return calls; })()", expected: 0 },
    ],
  ),
  "w02-d05-practice": runner(
    `class SocketClient {
  constructor(transport, retryPolicy) {
    // Сохрани зависимости и начальное состояние
  }

  connect() {
    // Переведи клиент в connecting и вызови transport.connect()
  }

  handleOpen() {
    // Зафиксируй успешное соединение
  }

  handleClose() {
    // Запланируй reconnect и верни задержку
  }

  getState() {
    // Верни текущее состояние
  }
}`,
    [
      { title: "Использует внедрённые зависимости", expression: "(() => { const events = []; const transport = { connect: () => events.push('connect'), schedule(callback, delay) { events.push(delay); this.pending = callback; } }; const retryPolicy = { next: attempt => (attempt + 1) * 100 }; const client = new SocketClient(transport, retryPolicy); client.connect(); client.handleOpen(); const delay = client.handleClose(); transport.pending(); return { delay, state: client.getState(), events }; })()", expected: { delay: 100, state: "connecting", events: ["connect", 100, "connect"] } },
      { title: "Увеличивает попытку и сбрасывает её после open", expression: "(() => { const transport = { connect() {}, schedule() {} }; const client = new SocketClient(transport, { next: attempt => attempt }); client.connect(); client.handleOpen(); const first = client.handleClose(); const second = client.handleClose(); client.handleOpen(); const afterOpen = client.handleClose(); return [first, second, afterOpen]; })()", expected: [0, 1, 0] },
    ],
  ),
  "w05-d07-practice": runner(
    `function socketReducer(state, event) {
  // Верни следующее состояние без мутации state
}`,
    [
      { title: "Проходит жизненный цикл соединения", expression: "(() => { let state = { status: 'closed', messages: [], error: null }; state = socketReducer(state, { type: 'connect' }); state = socketReducer(state, { type: 'open' }); state = socketReducer(state, { type: 'message', data: 'hello' }); return state; })()", expected: { status: "open", messages: ["hello"], error: null } },
      { title: "Не мутирует массив сообщений", expression: "(() => { const messages = ['first']; const state = { status: 'open', messages, error: null }; const next = socketReducer(state, { type: 'message', data: 'second' }); return { old: messages, next: next.messages, same: messages === next.messages }; })()", expected: { old: ["first"], next: ["first", "second"], same: false } },
      { title: "Сохраняет ссылку для неизвестного события", expression: "(() => { const state = { status: 'open', messages: [], error: null }; return socketReducer(state, { type: 'unknown' }) === state; })()", expected: true },
    ],
  ),
  "w08-d06-practice": runner(
    `function getReconnectDelay(attempt, baseDelay, maxDelay, jitter) {
  // Верни задержку exponential backoff с jitter ±20%
}`,
    [
      { title: "Удваивает задержку", expression: "getReconnectDelay(3, 500, 30000, 0)", expected: 4000 },
      { title: "Соблюдает верхний лимит", expression: "getReconnectDelay(10, 500, 30000, 0)", expected: 30000 },
      { title: "Применяет управляемый jitter", expression: "[getReconnectDelay(0, 500, 30000, -1), getReconnectDelay(0, 500, 30000, 1)]", expected: [400, 600] },
    ],
  ),
  "w09-d01-practice": runner(
    `class EventEmitter {
  constructor() {
    // Создай закрытое хранилище обработчиков
  }

  on(event, handler) {
    // Подпиши handler и верни идемпотентную функцию отписки
  }

  emit(event, ...args) {
    // Вызови снимок текущих обработчиков
  }
}`,
    [
      { title: "Инкапсулирует события", expression: "(() => { const emitter = new EventEmitter(); const values = []; emitter.on('data', value => values.push(value)); emitter.emit('data', 3); emitter.emit('other', 4); return values; })()", expected: [3] },
      { title: "Отписка идемпотентна", expression: "(() => { const emitter = new EventEmitter(); let calls = 0; const off = emitter.on('data', () => calls += 1); off(); off(); emitter.emit('data'); return calls; })()", expected: 0 },
      { title: "Безопасен при изменении подписок", expression: "(() => { const emitter = new EventEmitter(); const calls = []; let offSecond = () => {}; emitter.on('data', () => { calls.push('first'); offSecond(); }); offSecond = emitter.on('data', () => calls.push('second')); emitter.emit('data'); emitter.emit('data'); return calls; })()", expected: ["first", "second", "first"] },
    ],
  ),
  "w09-d02-practice": runner(
    `function createNotifier(channels) {
  // Верни объект с методом notify(channel, message)
}`,
    [
      { title: "Делегирует зарегистрированному каналу", expression: "(() => { const notifier = createNotifier({ email: message => 'email:' + message }); return notifier.notify('email', 'hello'); })()", expected: "email:hello" },
      { title: "Расширяется без изменения notifier", expression: "(() => { const notifier = createNotifier({ push: message => ({ kind: 'push', message }) }); return notifier.notify('push', 'update'); })()", expected: { kind: "push", message: "update" } },
      { title: "Отклоняет неизвестный канал", expression: "createNotifier({}).notify('sms', 'hello')", expectedError: "Unknown channel: sms" },
    ],
  ),
  "w09-d03-practice": runner(
    `function formatValue(value, formatter) {
  // Оставь минимальную абстракцию
}`,
    [
      { title: "Использует полиморфный callback", expression: "formatValue(10, value => value + ' ₽')", expected: "10 ₽" },
      { title: "Не изменяет объект", expression: "(() => { const source = { name: 'Ada' }; const result = formatValue(source, value => value.name.toUpperCase()); return [result, source.name]; })()", expected: ["ADA", "Ada"] },
      { title: "Возвращает результат formatter", expression: "formatValue(3, value => ({ doubled: value * 2 }))", expected: { doubled: 6 } },
    ],
  ),
  "w09-d04-practice": runner(
    `class SocketClient {
  constructor(transport, retryPolicy) {
    // Сохрани зависимости и начальное состояние
  }

  connect() {
    // Запусти соединение
  }

  handleOpen() {
    // Зафиксируй успешное открытие
  }

  handleClose() {
    // Запланируй reconnect и верни задержку
  }
}`,
    [
      { title: "Зависит от контрактов, а не WebSocket", expression: "(() => { const events = []; const transport = { connect: () => events.push('connect'), schedule(callback, delay) { events.push(delay); this.pending = callback; } }; const client = new SocketClient(transport, attempt => 100 * 2 ** attempt); client.connect(); client.handleOpen(); const delay = client.handleClose(); transport.pending(); return { delay, events }; })()", expected: { delay: 100, events: ["connect", 100, "connect"] } },
      { title: "Увеличивает попытки", expression: "(() => { const transport = { connect() {}, schedule() {} }; const client = new SocketClient(transport, attempt => attempt + 1); return [client.handleClose(), client.handleClose(), client.handleClose()]; })()", expected: [1, 2, 3] },
      { title: "Сбрасывает попытку после open", expression: "(() => { const transport = { connect() {}, schedule() {} }; const client = new SocketClient(transport, attempt => attempt); client.handleClose(); client.handleClose(); client.handleOpen(); return client.handleClose(); })()", expected: 0 },
    ],
  ),
  "ozon-d01-practice": runner(
    `function reverseInteger(value) {
  // Верни развёрнутое 32-битное число
}`,
    [
      { title: "Разворачивает число", expression: "reverseInteger(123)", expected: 321 },
      { title: "Сохраняет знак", expression: "reverseInteger(-120)", expected: -21 },
      { title: "Проверяет переполнение", expression: "reverseInteger(1534236469)", expected: 0 },
    ],
  ),
  "ozon-d02-practice": runner(
    `function findInvalidCharacters(text) {
  // Верни индексы недопустимых символов
}`,
    [
      { title: "Разрешённый ввод", expression: "findInvalidCharacters('Hello, world 42!')", expected: [] },
      { title: "Находит кириллицу", expression: "findInvalidCharacters('Hello, мир!')", expected: [7, 8, 9] },
    ],
  ),
  "ozon-d03-practice": runner(
    `const operation = (handler) => (right) => (left) => handler(left, right);
const plus = operation((left, right) => left + right);
const minus = operation((left, right) => left - right);
const times = operation((left, right) => left * right);
const dividedBy = operation((left, right) => Math.floor(left / right));

function number(value) {
  // Верни функцию-число
}

const zero = number(0);
const one = number(1);
const two = number(2);
const three = number(3);
const four = number(4);
const five = number(5);
const six = number(6);
const seven = number(7);
const eight = number(8);
const nine = number(9);`,
    [
      { title: "Умножает", expression: "seven(times(five()))", expected: 35 },
      { title: "Вычитает", expression: "four(plus(nine()))", expected: 13 },
      { title: "Округляет деление вниз", expression: "eight(dividedBy(three()))", expected: 2 },
    ],
  ),
  "ozon-d04-practice": runner(
    `function customObjectCreate(proto, descriptors) {
  // Не используй Object.create
}`,
    [
      { title: "Создаёт прототип", expression: "(() => { const value = customObjectCreate({ role: 'user' }, { id: { value: 1, enumerable: true } }); return { id: value.id, role: value.role, ownRole: Object.hasOwn(value, 'role') }; })()", expected: { id: 1, role: "user", ownRole: false } },
      { title: "Поддерживает null", expression: "Object.getPrototypeOf(customObjectCreate(null))", expected: null },
    ],
  ),
  "ozon-d05-practice": groupAnagramsRunner,
  "ozon-d06-practice": runner(
    `function executionOrder(operations) {
  // Сначала sync, затем microtask, затем task
}`,
    [
      { title: "Сохраняет порядок внутри очередей", expression: "executionOrder([{type:'sync',label:'A'},{type:'task',label:'B'},{type:'microtask',label:'C'},{type:'sync',label:'D'}])", expected: ["A", "D", "C", "B"] },
    ],
  ),
  "ozon-d07-practice": runner(
    `async function firstPositive(factory, maxAttempts) {
  // Верни первый положительный результат
}`,
    [
      { title: "Продолжает после ошибки", expression: "(async () => { const results = [-1, new Error('fail'), 5]; let index = 0; return firstPositive(async () => { const value = results[index++]; if (value instanceof Error) throw value; return value; }, 3); })()", expected: 5 },
      { title: "Завершает ошибкой", expression: "firstPositive(async () => -1, 2)", expectedError: "" },
    ],
  ),
  "ozon-d08-practice": runner(
    `function promiseAll(values) {
  // Не используй Promise.all
}`,
    [
      { title: "Сохраняет порядок", expression: "promiseAll([Promise.resolve(1), 2, Promise.resolve(3)])", expected: [1, 2, 3] },
      { title: "Пустой iterable", expression: "promiseAll([])", expected: [] },
      { title: "Отклоняется по ошибке", expression: "promiseAll([Promise.reject(new Error('fail'))])", expectedError: "fail" },
    ],
  ),
  "ozon-d09-practice": runner(
    `async function parallelLimit(tasks, concurrency) {
  // Верни результаты в исходном порядке
}`,
    [
      { title: "Сохраняет результаты", expression: "parallelLimit([() => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3)], 2)", expected: [1, 2, 3] },
      { title: "Соблюдает лимит", expression: "(async () => { let active = 0; let maximum = 0; const task = (value) => async () => { active += 1; maximum = Math.max(maximum, active); await Promise.resolve(); active -= 1; return value; }; const values = await parallelLimit([task(1),task(2),task(3),task(4)], 2); return { values, maximum }; })()", expected: { values: [1, 2, 3, 4], maximum: 2 } },
    ],
  ),
  "ozon-d14-practice": runner(
    `class LruCache {
  constructor(capacity) {
    // Инициализируй кеш
  }

  get(key) {
    // Верни значение и обнови свежесть
  }

  put(key, value) {
    // Добавь значение и вытесни старое
  }
}`,
    [
      { title: "Вытесняет старый ключ", expression: "(() => { const cache = new LruCache(2); cache.put('a',1); cache.put('b',2); cache.get('a'); cache.put('c',3); return cache.get('b') ?? null; })()", expected: null },
      { title: "Обновляет существующий ключ", expression: "(() => { const cache = new LruCache(1); cache.put('a',1); cache.put('a',2); return cache.get('a'); })()", expected: 2 },
    ],
  ),
} satisfies Record<string, StudyExerciseRunner>;

type StaticRunnerId = keyof typeof runners;

const groupAnagramsSolution = `function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    const group = groups.get(key) ?? [];
    group.push(word);
    groups.set(key, group);
  }
  return [...groups.values()];
}`;

const referenceSolutions: Record<StaticRunnerId, string> = {
  "yandex-d01-algorithms": `function findMostFrequent(numbers) {
  if (numbers.length === 0) return null;
  const counts = new Map();
  let answer = numbers[0];
  let maximum = 0;
  for (const number of numbers) {
    const count = (counts.get(number) ?? 0) + 1;
    counts.set(number, count);
    if (count > maximum) {
      maximum = count;
      answer = number;
    }
  }
  return answer;
}`,
  "yandex-d02-algorithms": `function countWords(words) {
  const counts = {};
  for (const word of words) counts[word] = (counts[word] ?? 0) + 1;
  return counts;
}

function firstUniqueChar(text) {
  const counts = new Map();
  for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);
  for (let index = 0; index < text.length; index += 1) {
    if (counts.get(text[index]) === 1) return index;
  }
  return -1;
}`,
  "yandex-d03-algorithms": `function twoSum(numbers, target) {
  const indices = new Map();
  for (let index = 0; index < numbers.length; index += 1) {
    const complement = target - numbers[index];
    if (indices.has(complement)) return [indices.get(complement), index];
    indices.set(numbers[index], index);
  }
  return [-1, -1];
}`,
  "yandex-d04-algorithms": groupAnagramsSolution,
  "yandex-d05-algorithms": `function findSortedPair(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left, right];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return [-1, -1];
}`,
  "yandex-d06-algorithms": `function longestUniqueSubstring(text) {
  const lastSeen = new Map();
  let left = 0;
  let maximum = 0;
  for (let right = 0; right < text.length; right += 1) {
    const previous = lastSeen.get(text[right]);
    if (previous !== undefined && previous >= left) left = previous + 1;
    lastSeen.set(text[right], right);
    maximum = Math.max(maximum, right - left + 1);
  }
  return maximum;
}`,
  "yandex-d07-algorithms": `function topKFrequentWords(words, k) {
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.keys()]
    .sort((left, right) => counts.get(right) - counts.get(left) || left.localeCompare(right))
    .slice(0, k);
}`,
  "yandex-d08-algorithms": `class RecentCounter {
  constructor() {
    this.timestamps = [];
  }

  ping(timestamp) {
    this.timestamps.push(timestamp);
    while (this.timestamps[0] < timestamp - 3000) this.timestamps.shift();
    return this.timestamps.length;
  }
}`,
  "yandex-d09-algorithms": `function isValidBrackets(text) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const character of text) {
    if (character === "(" || character === "[" || character === "{") stack.push(character);
    else if (stack.pop() !== pairs[character]) return false;
  }
  return stack.length === 0;
}`,
  "yandex-d10-algorithms": `async function fetchWithRetry(request, retries) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}`,
  "yandex-d11-algorithms": `function splitWordsBySeparator(words, separator) {
  return words.flatMap((word) => word.split(separator)).filter(Boolean);
}`,
  "yandex-d12-algorithms": `function createCounter(initialValue) {
  let value = initialValue;
  return {
    increment() { value += 1; return value; },
    decrement() { value -= 1; return value; },
    reset() { value = initialValue; return value; },
    getValue() { return value; },
  };
}`,
  "yandex-d13-algorithms": `async function promiseSum(first, second) {
  const [left, right] = await Promise.all([first, second]);
  return left + right;
}`,
  "yandex-d14-algorithms": `function minWindow(source, target) {
  if (!target || target.length > source.length) return "";
  const required = new Map();
  for (const character of target) required.set(character, (required.get(character) ?? 0) + 1);
  const windowCounts = new Map();
  let formed = 0;
  let left = 0;
  let bestStart = 0;
  let bestLength = Infinity;
  for (let right = 0; right < source.length; right += 1) {
    const character = source[right];
    windowCounts.set(character, (windowCounts.get(character) ?? 0) + 1);
    if (required.has(character) && windowCounts.get(character) === required.get(character)) formed += 1;
    while (formed === required.size) {
      if (right - left + 1 < bestLength) {
        bestStart = left;
        bestLength = right - left + 1;
      }
      const removed = source[left];
      windowCounts.set(removed, windowCounts.get(removed) - 1);
      if (required.has(removed) && windowCounts.get(removed) < required.get(removed)) formed -= 1;
      left += 1;
    }
  }
  return bestLength === Infinity ? "" : source.slice(bestStart, bestStart + bestLength);
}`,
  "yandex-d15-algorithms": `function memoize(fn) {
  const root = new Map();
  const resultKey = Symbol("result");
  return (...args) => {
    let node = root;
    for (const argument of args) {
      if (!node.has(argument)) node.set(argument, new Map());
      node = node.get(argument);
    }
    if (!node.has(resultKey)) node.set(resultKey, fn(...args));
    return node.get(resultKey);
  };
}`,
  "yandex-d16-algorithms": `function maximumStringValue(values) {
  return Math.max(...values.map((value) => /^\\d+$/.test(value) ? Number(value) : value.length));
}`,
  "yandex-d17-algorithms": `function restoreRoute(tickets) {
  const next = new Map(tickets);
  const destinations = new Set(tickets.map((ticket) => ticket[1]));
  let city = tickets.find((ticket) => !destinations.has(ticket[0]))[0];
  const route = [city];
  while (next.has(city)) {
    city = next.get(city);
    route.push(city);
  }
  return route;
}`,
  "yandex-d18-algorithms": `function replaceAll(source, search, replacement) {
  if (search === "") return source;
  return source.split(search).join(replacement);
}`,
  "yandex-d19-algorithms": `function mergeSorted(first, second) {
  const result = [];
  let left = 0;
  let right = 0;
  while (left < first.length || right < second.length) {
    if (right >= second.length || (left < first.length && first[left] <= second[right])) {
      result.push(first[left]);
      left += 1;
    } else {
      result.push(second[right]);
      right += 1;
    }
  }
  return result;
}

function binarySearch(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if (numbers[middle] === target) return middle;
    if (numbers[middle] < target) left = middle + 1;
    else right = middle - 1;
  }
  return -1;
}`,
  "yandex-d20-algorithms": `function minMeetingRooms(intervals) {
  if (intervals.length === 0) return 0;
  const starts = intervals.map((interval) => interval[0]).sort((a, b) => a - b);
  const ends = intervals.map((interval) => interval[1]).sort((a, b) => a - b);
  let endIndex = 0;
  let active = 0;
  let maximum = 0;
  for (const start of starts) {
    while (endIndex < ends.length && ends[endIndex] <= start) {
      active -= 1;
      endIndex += 1;
    }
    active += 1;
    maximum = Math.max(maximum, active);
  }
  return maximum;
}`,
  "yandex-d21-algorithms": `function longestConsecutive(numbers) {
  const values = new Set(numbers);
  let maximum = 0;
  for (const value of values) {
    if (values.has(value - 1)) continue;
    let length = 1;
    while (values.has(value + length)) length += 1;
    maximum = Math.max(maximum, length);
  }
  return maximum;
}`,
  "w02-d04-practice": `class EventEmitter {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    const handlers = this.handlers.get(event) ?? new Set();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(event);
    };
  }

  emit(event, ...args) {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) handler(...args);
  }
}`,
  "w02-d05-practice": `class SocketClient {
  constructor(transport, retryPolicy) {
    this.transport = transport;
    this.retryPolicy = retryPolicy;
    this.state = "closed";
    this.attempt = 0;
  }

  connect() {
    this.state = "connecting";
    this.transport.connect();
  }

  handleOpen() {
    this.state = "open";
    this.attempt = 0;
  }

  handleClose() {
    this.state = "reconnecting";
    const delay = this.retryPolicy.next(this.attempt);
    this.attempt += 1;
    this.transport.schedule(() => this.connect(), delay);
    return delay;
  }

  getState() {
    return this.state;
  }
}`,
  "w05-d07-practice": `function socketReducer(state, event) {
  switch (event.type) {
    case "connect":
      return { ...state, status: "connecting", error: null };
    case "open":
      return { ...state, status: "open", error: null };
    case "message":
      return { ...state, messages: [...state.messages, event.data], error: null };
    case "error":
      return { ...state, status: "error", error: event.error };
    case "close":
      return { ...state, status: event.retrying ? "reconnecting" : "closed" };
    default:
      return state;
  }
}`,
  "w08-d06-practice": `function getReconnectDelay(attempt, baseDelay, maxDelay, jitter) {
  const exponentialDelay = baseDelay * 2 ** Math.max(0, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  const jitterMultiplier = 1 + Math.max(-1, Math.min(1, jitter)) * 0.2;
  return Math.min(maxDelay, Math.round(cappedDelay * jitterMultiplier));
}`,
  "w09-d01-practice": `class EventEmitter {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    const handlers = this.handlers.get(event) ?? new Set();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(event);
    };
  }

  emit(event, ...args) {
    for (const handler of [...(this.handlers.get(event) ?? [])]) handler(...args);
  }
}`,
  "w09-d02-practice": `function createNotifier(channels) {
  return {
    notify(channel, message) {
      const handler = channels[channel];
      if (!handler) throw new Error("Unknown channel: " + channel);
      return handler(message);
    },
  };
}`,
  "w09-d03-practice": `function formatValue(value, formatter) {
  return formatter(value);
}`,
  "w09-d04-practice": `class SocketClient {
  constructor(transport, retryPolicy) {
    this.transport = transport;
    this.retryPolicy = retryPolicy;
    this.attempt = 0;
  }

  connect() {
    this.transport.connect();
  }

  handleOpen() {
    this.attempt = 0;
  }

  handleClose() {
    const delay = this.retryPolicy(this.attempt);
    this.attempt += 1;
    this.transport.schedule(() => this.connect(), delay);
    return delay;
  }
}`,
  "ozon-d01-practice": `function reverseInteger(value) {
  const reversed = Number(String(Math.abs(value)).split("").reverse().join("")) * Math.sign(value);
  return reversed < -(2 ** 31) || reversed > 2 ** 31 - 1 ? 0 : reversed;
}`,
  "ozon-d02-practice": `function findInvalidCharacters(text) {
  const indices = [];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 || code > 126) indices.push(index);
  }
  return indices;
}`,
  "ozon-d03-practice": `const operation = (handler) => (right) => (left) => handler(left, right);
const plus = operation((left, right) => left + right);
const minus = operation((left, right) => left - right);
const times = operation((left, right) => left * right);
const dividedBy = operation((left, right) => Math.floor(left / right));

function number(value) {
  return (handler) => handler ? handler(value) : value;
}

const zero = number(0);
const one = number(1);
const two = number(2);
const three = number(3);
const four = number(4);
const five = number(5);
const six = number(6);
const seven = number(7);
const eight = number(8);
const nine = number(9);`,
  "ozon-d04-practice": `function customObjectCreate(proto, descriptors) {
  function Temporary() {}
  Temporary.prototype = proto;
  const value = new Temporary();
  if (proto === null) Object.setPrototypeOf(value, null);
  if (descriptors) Object.defineProperties(value, descriptors);
  return value;
}`,
  "ozon-d05-practice": groupAnagramsSolution,
  "ozon-d06-practice": `function executionOrder(operations) {
  const order = { sync: 0, microtask: 1, task: 2 };
  return operations
    .map((operation, index) => ({ ...operation, index }))
    .sort((left, right) => order[left.type] - order[right.type] || left.index - right.index)
    .map((operation) => operation.label);
}`,
  "ozon-d07-practice": `async function firstPositive(factory, maxAttempts) {
  let lastError = new Error("Положительный результат не получен");
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const value = await factory();
      if (value > 0) return value;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}`,
  "ozon-d08-practice": `function promiseAll(values) {
  return new Promise((resolve, reject) => {
    const items = Array.from(values);
    if (items.length === 0) return resolve([]);
    const result = new Array(items.length);
    let completed = 0;
    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {
        result[index] = value;
        completed += 1;
        if (completed === items.length) resolve(result);
      }, reject);
    });
  });
}`,
  "ozon-d09-practice": `async function parallelLimit(tasks, concurrency) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}`,
  "ozon-d14-practice": `class LruCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map();
  }

  get(key) {
    if (!this.values.has(key)) return undefined;
    const value = this.values.get(key);
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.values.has(key)) this.values.delete(key);
    this.values.set(key, value);
    if (this.values.size > this.capacity) {
      this.values.delete(this.values.keys().next().value);
    }
  }
}`,
};

export const STATIC_EXERCISE_RUNNER_COUNT = Object.keys(runners).length;

export const getStaticRunnerValidationCases = () =>
  (Object.keys(runners) as StaticRunnerId[]).map((id) => ({
    id,
    runner: runners[id],
    referenceSolution: referenceSolutions[id],
  }));

export const getExerciseRunner = (blockId: string) =>
  (runners as Record<string, StudyExerciseRunner>)[blockId];
