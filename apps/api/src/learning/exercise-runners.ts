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

const runners: Record<string, StudyExerciseRunner> = {
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
      { title: "Соблюдает лимит", expression: "(async () => { let active = 0; let maximum = 0; const task = (value) => async () => { active += 1; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 5)); active -= 1; return value; }; const values = await parallelLimit([task(1),task(2),task(3),task(4)], 2); return { values, maximum }; })()", expected: { values: [1, 2, 3, 4], maximum: 2 } },
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
};

export const getExerciseRunner = (blockId: string) => runners[blockId];
