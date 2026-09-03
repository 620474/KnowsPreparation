import type { StudyExercise } from "./curriculum";
import { buildCompanySprint, type CompanySprintDayDefinition } from "./company-sprint-builder";

const codingExercise = (
  statement: string,
  signature: string,
  starterCode: string,
  testCases: NonNullable<StudyExercise["runner"]>["testCases"],
): StudyExercise => ({
  statement,
  signature,
  constraints: ["Проговори решение до кода", "Проверь крайние случаи", "Защити time/space complexity"],
  examples: [],
  runner: { starterCode, testCases },
});

const DAYS: CompanySprintDayDefinition[] = [
  {
    title: "Language/framework baseline",
    theory: { title: "Маршрут frontend-интервью Т-Банка", description: "Раздели подготовку на language/framework, algorithms, architecture и последующий team matching." },
    practice: { title: "JS + React screening", description: "Пройди короткий mixed mock: execution model, async, render/effect semantics и TypeScript contracts." },
    reflection: "Оцени готовность отдельно по трём официальным техническим направлениям.",
  },
  {
    title: "JavaScript и async depth",
    theory: { title: "Closures, prototypes и Promise", description: "Повтори causal model языка, обработку ошибок и конкурентные асинхронные сценарии." },
    practice: {
      title: "Promise scheduler",
      description: "Реализуй последовательный pipeline функций и корректно остановись на первой ошибке.",
      exercise: codingExercise(
        "Последовательно примени async-функции к значению и верни итог.",
        "pipeAsync(value: T, steps: Array<(value: T) => Promise<T>>): Promise<T>",
        "async function pipeAsync(value, steps) {\n  // Выполняй steps последовательно\n}",
        [
          { title: "Выполняет последовательно", expression: "pipeAsync(2, [async x => x + 1, async x => x * 3])", expected: 9 },
          { title: "Пустой pipeline", expression: "pipeAsync('x', [])", expected: "x" },
          { title: "Пробрасывает ошибку", expression: "pipeAsync(1, [async () => { throw new Error('stop'); }])", expectedError: "stop" },
        ],
      ),
    },
    reflection: "Объясни порядок выполнения и поведение при rejection.",
  },
  {
    title: "React framework section",
    theory: { title: "Rendering, hooks и state boundaries", description: "Разбери reconciliation, effects, refs, races, server state и причины лишних рендеров." },
    practice: { title: "Debugging компонента", description: "Исправь stale request, duplicated subscription и лишние рендеры; объясни каждое изменение." },
    reflection: "Защити, какие оптимизации ты намеренно не стал добавлять.",
  },
  {
    title: "Algorithms: arrays и hash maps",
    theory: { title: "Инварианты и complexity", description: "Повтори arrays/strings, hash map, два указателя и критерии выбора решения." },
    practice: {
      title: "Два индекса",
      description: "Реши задачу за O(n), затем защити память и обработку дублей.",
      exercise: codingExercise(
        "Верни индексы двух чисел с заданной суммой или [-1, -1].",
        "twoSum(values: number[], target: number): [number, number]",
        "function twoSum(values, target) {\n  // Реализуй за O(n)\n}",
        [
          { title: "Основной пример", expression: "twoSum([2,7,11,15], 9)", expected: [0, 1] },
          { title: "Дубликаты", expression: "twoSum([3,3], 6)", expected: [0, 1] },
          { title: "Нет решения", expression: "twoSum([1,2], 9)", expected: [-1, -1] },
        ],
      ),
    },
    reflection: "Сравни brute force и Map-решение по времени, памяти и простоте.",
  },
  {
    title: "Algorithms: stack и intervals",
    theory: { title: "Стек, сортировка и sweep line", description: "Повтори выбор структуры, корректность алгоритма и влияние сортировки на итоговую сложность." },
    practice: {
      title: "Слияние интервалов",
      description: "Реализуй merge intervals и подготовь защиту O(n log n).",
      exercise: codingExercise(
        "Слей пересекающиеся интервалы.",
        "mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]>",
        "function mergeIntervals(intervals) {\n  // Не изменяй входной массив\n}",
        [
          { title: "Сливает пересечения", expression: "mergeIntervals([[1,3],[2,6],[8,10],[15,18]])", expected: [[1,6],[8,10],[15,18]] },
          { title: "Соприкасающиеся интервалы", expression: "mergeIntervals([[1,4],[4,5]])", expected: [[1,5]] },
          { title: "Пустой список", expression: "mergeIntervals([])", expected: [] },
        ],
      ),
    },
    reflection: "Объясни, почему сортировка допустима и когда можно получить линейное решение.",
  },
  {
    title: "Coding endurance",
    theory: { title: "Работа под ограничением времени", description: "Собери шаблон: уточнения, примеры, решение, код, тесты, complexity и follow-up без потери темпа." },
    practice: { title: "60-минутный coding mock", description: "Реши две задачи в IDE без поиска; после каждой защити решение и отреагируй на изменение ограничения." },
    reflection: "Зафиксируй время по фазам и одну причину, из-за которой потерял темп.",
  },
  {
    title: "Architecture fundamentals",
    theory: { title: "Requirements, data и API", description: "Собери functional/NFR требования, data flow, contracts, state/cache и failure handling." },
    practice: { title: "История операций", description: "Спроектируй frontend истории транзакций: pagination, filters, cache, partial errors, privacy и observability." },
    reflection: "Защити модель данных, cache semantics и API boundary.",
  },
  {
    title: "Frontend architecture depth",
    theory: { title: "Scale, performance и resilience", description: "Разбери rendering strategy, code splitting, offline/retry, security, monitoring и migration constraints." },
    practice: { title: "Realtime dashboard", description: "Спроектируй обновляемый dashboard и сравни polling, SSE и WebSocket без преждевременного выбора." },
    reflection: "Объясни failure modes и план graceful degradation.",
  },
  {
    title: "Полный technical mock",
    theory: { title: "Language + algorithms", description: "Сымитируй независимые секции: JS/React follow-ups и алгоритмическая задача с complexity defense." },
    practice: { title: "Двухсекционная симуляция", description: "Пройди mock без AI-подсказок; после завершения сравни evidence по каждому capability." },
    reflection: "Составь remediation-план только по наблюдаемым ошибкам.",
  },
  {
    title: "Architecture и team matching",
    theory: { title: "Design defense и выбор команды", description: "Подготовь архитектурную секцию, истории влияния, предпочтения по продукту и вопросы будущей команде." },
    practice: { title: "Финальная симуляция", description: "Пройди design mock с изменением требований, затем team-match разговор о мотивации, опыте и ожиданиях." },
    reflection: "Сформулируй сильные стороны, риски и вопросы команде без общих фраз.",
  },
];

export const TBANK_SPRINT = buildCompanySprint("tbank", DAYS);
export const TBANK_SPRINT_AI_KEY = "tbank-sprint";
export const TBANK_SPRINT_AI_VERSION = 1;
