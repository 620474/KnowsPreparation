import type {
  SkillCapability,
  SkillTransferLevel,
  TransferAssessmentItem,
} from "@prep/contracts";

interface TransferAssessmentDefinition {
  item: TransferAssessmentItem;
  skillId: string;
  capability: SkillCapability;
  transferLevel: SkillTransferLevel;
  evaluate: (answer: string) => { score: number; feedback: string[] };
}

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/[\s;]+/g, "")
  .replace(/[«»"']/g, "");

const exact = (expected: string, explanation: string) => (answer: string) => {
  const passed = normalize(answer).includes(normalize(expected));
  return {
    score: passed ? 100 : 20,
    feedback: passed
      ? ["Порядок указан верно.", explanation]
      : [`Ожидался порядок: ${expected}.`, explanation],
  };
};

const rubric = (criteria: Array<{ words: string[]; feedback: string }>) => (answer: string) => {
  const normalized = answer.toLowerCase();
  const matched = criteria.filter((criterion) =>
    criterion.words.some((word) => normalized.includes(word.toLowerCase())));
  const score = Math.round((matched.length / criteria.length) * 100);
  const missing = criteria.filter((criterion) => !matched.includes(criterion));
  return {
    score,
    feedback: [
      ...matched.map((criterion) => `Учтено: ${criterion.feedback}`),
      ...missing.map((criterion) => `Добавь: ${criterion.feedback}`),
    ],
  };
};

const definitions: TransferAssessmentDefinition[] = [
  {
    item: {
      id: "transfer-event-loop-1",
      familyId: "transfer:event-loop:ordering-a",
      format: "prediction",
      title: "Очереди event loop без запуска",
      prompt: "Назови точный порядок вывода и кратко объясни каждую смену очереди.",
      code: `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => {
  console.log("C");
  queueMicrotask(() => console.log("D"));
});
queueMicrotask(() => console.log("E"));
console.log("F");`,
      constraints: ["Код не запускать", "Указать порядок одной строкой"],
      answerPlaceholder: "A, F, ... Затем объяснение",
      expectedSeconds: 180,
    },
    skillId: "async.event-loop",
    capability: "apply",
    transferLevel: "near_transfer",
    evaluate: exact("A,F,C,E,D,B", "Сначала синхронный код, затем FIFO-очередь microtasks, после неё timer task."),
  },
  {
    item: {
      id: "transfer-event-loop-2",
      familyId: "transfer:event-loop:ordering-b",
      format: "prediction",
      title: "Вложенные microtasks",
      prompt: "Предскажи вывод без запуска и объясни, когда добавляются новые microtasks.",
      code: `Promise.resolve().then(() => {
  console.log("A");
  Promise.resolve().then(() => console.log("B"));
});
queueMicrotask(() => console.log("C"));
console.log("D");`,
      constraints: ["Не использовать DevTools"],
      answerPlaceholder: "D, ... Затем причинное объяснение",
      expectedSeconds: 150,
    },
    skillId: "async.event-loop",
    capability: "apply",
    transferLevel: "near_transfer",
    evaluate: exact("D,A,C,B", "Вложенная Promise reaction добавляется в конец уже существующей очереди microtasks."),
  },
  {
    item: {
      id: "transfer-react-effect-1",
      familyId: "transfer:react-effect:stale-request",
      format: "bug_triage",
      title: "Гонка запросов в useEffect",
      prompt: "Найди дефект, опиши сценарий воспроизведения и предложи минимальное исправление.",
      code: `useEffect(() => {
  fetch('/api/users/' + userId)
    .then((response) => response.json())
    .then(setUser);
}, [userId]);`,
      constraints: ["userId может быстро измениться", "Старый запрос может завершиться последним"],
      answerPlaceholder: "Дефект → сценарий → исправление → почему оно работает",
      expectedSeconds: 240,
    },
    skillId: "react.hooks",
    capability: "debug",
    transferLevel: "near_transfer",
    evaluate: rubric([
      { words: ["гонк", "race", "устар"], feedback: "назвать race condition или устаревший ответ" },
      { words: ["abort", "abortcontroller", "отмен"], feedback: "отменять предыдущий запрос через AbortController" },
      { words: ["cleanup", "очист"], feedback: "выполнять отмену в cleanup эффекта" },
      { words: ["signal"], feedback: "передать signal в fetch" },
    ]),
  },
  {
    item: {
      id: "transfer-react-effect-2",
      familyId: "transfer:react-effect:subscription",
      format: "bug_triage",
      title: "Утечка подписки React",
      prompt: "Объясни, почему обработчики накапливаются, и перепиши жизненный цикл подписки.",
      code: `useEffect(() => {
  socket.on('message', (message) => setMessages((items) => [...items, message]));
}, [roomId]);`,
      constraints: ["Компонент меняет roomId", "socket живёт дольше компонента"],
      answerPlaceholder: "Причина → cleanup → стабильный обработчик",
      expectedSeconds: 240,
    },
    skillId: "react.hooks",
    capability: "debug",
    transferLevel: "far_transfer",
    evaluate: rubric([
      { words: ["cleanup", "очист", "return"], feedback: "добавить cleanup эффекта" },
      { words: ["off", "remove", "отпис"], feedback: "отписаться от события" },
      { words: ["handler", "обработчик", "ссылк"], feedback: "использовать ту же ссылку на обработчик" },
      { words: ["roomid", "комнат"], feedback: "переподписываться при изменении комнаты" },
    ]),
  },
  {
    item: {
      id: "transfer-closures-1",
      familyId: "transfer:closures:loop",
      format: "prediction",
      title: "Замыкание внутри цикла",
      prompt: "Предскажи вывод и предложи два способа получить 0, 1, 2.",
      code: `const callbacks = [];
for (var index = 0; index < 3; index += 1) {
  callbacks.push(() => index);
}
console.log(callbacks.map((callback) => callback()));`,
      constraints: ["Объяснить через binding, а не только назвать var"],
      answerPlaceholder: "[...]. Причина. Исправления: ...",
      expectedSeconds: 180,
    },
    skillId: "javascript.closures",
    capability: "explain",
    transferLevel: "near_transfer",
    evaluate: rubric([
      { words: ["3,3,3", "[3,3,3]", "[3, 3, 3]"], feedback: "указать вывод [3, 3, 3]" },
      { words: ["одн", "общ", "binding", "привяз"], feedback: "объяснить общую binding var" },
      { words: ["let"], feedback: "предложить let с binding на итерацию" },
      { words: ["iife", "функц", "параметр"], feedback: "предложить отдельную область или параметр функции" },
    ]),
  },
  {
    item: {
      id: "transfer-closures-2",
      familyId: "transfer:closures:retention",
      format: "bug_triage",
      title: "Удержание данных замыканием",
      prompt: "Найди причину удержания памяти и предложи изменение, сохраняющее поведение.",
      code: `function mount() {
  const payload = new Array(1_000_000).fill('x');
  const onResize = () => console.log(payload.length);
  window.addEventListener('resize', onResize);
}
mount();`,
      constraints: ["mount может вызываться многократно"],
      answerPlaceholder: "Что удерживает payload и как освободить его",
      expectedSeconds: 180,
    },
    skillId: "javascript.closures",
    capability: "explain",
    transferLevel: "far_transfer",
    evaluate: rubric([
      { words: ["listener", "обработчик", "событ"], feedback: "указать корень достижимости через listener" },
      { words: ["removeeventlistener", "удал", "отпис"], feedback: "удалить обработчик" },
      { words: ["та же", "ссылк", "onresize"], feedback: "использовать ту же функцию при отписке" },
      { words: ["cleanup", "unmount", "dispose"], feedback: "вернуть или вызвать lifecycle cleanup" },
    ]),
  },
  {
    item: {
      id: "transfer-algorithms-1",
      familyId: "transfer:algorithms:stream-window",
      format: "constraint_flip",
      title: "Алгоритм при потоковом вводе",
      prompt: "Изначально максимум в окне можно было считать повторным проходом. Теперь значения приходят потоком, окно фиксировано, полный массив хранить нельзя. Защити новую структуру решения.",
      constraints: ["O(k) памяти", "Амортизированное O(1) на элемент", "Нельзя пересчитывать максимум обходом окна"],
      answerPlaceholder: "Структура данных → инвариант → сложность → крайние случаи",
      expectedSeconds: 300,
    },
    skillId: "algorithms.arrays-hashmaps",
    capability: "defend",
    transferLevel: "far_transfer",
    evaluate: rubric([
      { words: ["дек", "deque", "монотон"], feedback: "выбрать монотонную деку" },
      { words: ["индекс"], feedback: "хранить индексы для удаления вышедших элементов" },
      { words: ["o(1)", "амортиз"], feedback: "обосновать амортизированное O(1)" },
      { words: ["убыва", "инвариант"], feedback: "описать монотонный инвариант" },
    ]),
  },
  {
    item: {
      id: "transfer-algorithms-2",
      familyId: "transfer:algorithms:memory-limit",
      format: "constraint_flip",
      title: "Частоты при ограниченной памяти",
      prompt: "Нужно найти первый повтор в потоке. Раньше использовался Set, теперь объём потока больше доступной памяти. Объясни, как меняется контракт и какие компромиссы допустимы.",
      constraints: ["Поток нельзя перечитать", "Точный Set не помещается", "Допускается явно оговорённая вероятность ошибки"],
      answerPlaceholder: "Почему точное решение невозможно → структура → тип ошибки → параметры",
      expectedSeconds: 300,
    },
    skillId: "algorithms.arrays-hashmaps",
    capability: "defend",
    transferLevel: "far_transfer",
    evaluate: rubric([
      { words: ["невозмож", "памят"], feedback: "признать ограничение точного решения" },
      { words: ["bloom", "блум"], feedback: "предложить Bloom filter" },
      { words: ["ложнополож", "false positive"], feedback: "назвать ложноположительные ответы" },
      { words: ["вероят", "хеш", "размер"], feedback: "объяснить настройку вероятности ошибки" },
    ]),
  },
];

export const getTransferDefinitionsForSkill = (skillId: string) =>
  definitions.filter((definition) => definition.skillId === skillId);

export const getTransferDefinition = (itemId: string) =>
  definitions.find((definition) => definition.item.id === itemId) ?? null;

export const TRANSFER_LAB_SKILL_IDS = [...new Set(definitions.map((definition) => definition.skillId))];

