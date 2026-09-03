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
  constraints: [
    "Сначала проговори подход и крайние случаи",
    "Не используй готовый метод, решающий задачу целиком",
    "После решения назови сложность по времени и памяти",
  ],
  examples: [],
  runner: { starterCode, testCases },
});

const DAYS: CompanySprintDayDefinition[] = [
  {
    title: "Scoring и JS baseline",
    theory: { title: "Как устроен технический маршрут Avito", description: "Разбери scoring, Programming, Platform, Design и final; зафиксируй критерии прохождения каждой секции." },
    practice: { title: "Быстрый JS-screening", description: "Ответь вслух на короткие вопросы по scope, this, прототипам и async, затем проверь слабые места в AI-разборе." },
    reflection: "Запиши три пробела, которые могут остановить уже на scoring.",
  },
  {
    title: "Programming: массивы и Map",
    theory: { title: "Декомпозиция и Big-O", description: "Повтори инварианты, оценку сложности и выбор Map/Set вместо вложенных проходов." },
    practice: {
      title: "Частый элемент без удобных helpers",
      description: "Реализуй линейное решение и защити выбор структуры данных.",
      exercise: codingExercise(
        "Верни первый из наиболее частых элементов массива или null для пустого массива.",
        "mostFrequent(values: number[]): number | null",
        "function mostFrequent(values) {\n  // Реализуй за O(n) времени\n}",
        [
          { title: "Находит максимум", expression: "mostFrequent([1,2,2,3,3,3])", expected: 3 },
          { title: "Сохраняет первый при равенстве", expression: "mostFrequent([4,4,2,2])", expected: 4 },
          { title: "Пустой ввод", expression: "mostFrequent([])", expected: null },
        ],
      ),
    },
    reflection: "Защити time/space complexity и назови альтернативу без Map.",
  },
  {
    title: "Programming: строки и ограничения",
    theory: { title: "Edge cases до кода", description: "Научись уточнять формат, допустимые символы, регистр, пустой ввод и ограничения памяти до реализации." },
    practice: {
      title: "Первая уникальная позиция",
      description: "Реши задачу без indexOf/lastIndexOf и подготовь adversarial-тесты.",
      exercise: codingExercise(
        "Верни индекс первого уникального символа или -1.",
        "firstUniqueIndex(text: string): number",
        "function firstUniqueIndex(text) {\n  // Не используй indexOf/lastIndexOf\n}",
        [
          { title: "Находит символ", expression: "firstUniqueIndex('aabbcdde')", expected: 4 },
          { title: "Нет уникального", expression: "firstUniqueIndex('aabb')", expected: -1 },
          { title: "Один символ", expression: "firstUniqueIndex('x')", expected: 0 },
        ],
      ),
    },
    reflection: "Назови допущения и объясни, как изменится решение для Unicode grapheme clusters.",
  },
  {
    title: "Platform: объекты и прототипы",
    theory: { title: "this, descriptors и prototype chain", description: "Разбери lookup, shadowing, bind и отличие class syntax от модели прототипов." },
    practice: { title: "Runtime-разбор", description: "Предскажи вывод пяти фрагментов, затем исправь потерю контекста и объясни каждое изменение." },
    reflection: "Сформулируй одно точное правило про this и один контрпример.",
  },
  {
    title: "Platform: Event Loop",
    theory: { title: "Tasks, microtasks и rendering", description: "Разбери Promise jobs, timers, queueMicrotask, requestAnimationFrame и starvation интерфейса." },
    practice: {
      title: "Ограничитель параллельности",
      description: "Реализуй запуск асинхронных задач с лимитом и корректным порядком результатов.",
      exercise: codingExercise(
        "Запусти фабрики Promise максимум по limit одновременно и верни результаты в исходном порядке.",
        "runLimited(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]>",
        "async function runLimited(tasks, limit) {\n  // Сохрани порядок результатов\n}",
        [
          { title: "Сохраняет порядок", expression: "runLimited([() => Promise.resolve(1), () => Promise.resolve(2)], 1)", expected: [1, 2] },
          { title: "Пустой список", expression: "runLimited([], 2)", expected: [] },
        ],
      ),
    },
    reflection: "Объясни, где в решении возникает backpressure и как обрабатывается rejection.",
  },
  {
    title: "Browser и production platform",
    theory: { title: "Rendering, network и storage", description: "Свяжи DOM/events, layout/paint/composite, HTTP cache, CORS, storage и основные угрозы безопасности." },
    practice: { title: "Диагностика медленного интерфейса", description: "Построй план расследования long task и лишних layout; укажи метрики до и после исправления." },
    reflection: "Назови наблюдаемую метрику, инструмент и критерий успешной оптимизации.",
  },
  {
    title: "React и TypeScript production",
    theory: { title: "Rendering, effects и contracts", description: "Повтори причины рендера, stale closure, race conditions и дискриминированные состояния API." },
    practice: { title: "Исправить request race", description: "Разбери компонент с двумя конкурирующими запросами, добавь отмену и типобезопасное состояние." },
    reflection: "Защити границу между server state, локальным state и URL.",
  },
  {
    title: "Design: требования и границы",
    theory: { title: "От product problem к контрактам", description: "Собери functional/NFR требования, данные, API, component boundaries и failure modes." },
    practice: { title: "Спроектировать выдачу объявлений", description: "Нарисуй frontend архитектуру поиска: фильтры, URL, cache, pagination, partial errors и observability." },
    reflection: "Защити три ключевых решения и одно осознанно отложенное NFR.",
  },
  {
    title: "Design: автономные команды",
    theory: { title: "Module boundaries и совместимость", description: "Разбери microfrontends, shared contracts, version skew, design system и независимые релизы." },
    practice: { title: "Платформа виджетов", description: "Спроектируй host/remote contracts, rollout, fallback и мониторинг без обязательного выбора microfrontends." },
    reflection: "Сначала аргументируй, почему microfrontends могут быть неправильным выбором.",
  },
  {
    title: "Production quality и NFR",
    theory: { title: "Надёжность, безопасность и тестирование", description: "Свяжи observability, rollout, backward compatibility, test pyramid и incident response." },
    practice: { title: "Защитить план релиза", description: "Подготовь rollout критичной функции с feature flag, метриками, rollback и миграцией API." },
    reflection: "Расскажи production-историю по схеме сигнал → причина → исправление → профилактика.",
  },
  {
    title: "Полный technical mock",
    theory: { title: "Programming + Platform", description: "Подготовь 120-минутную симуляцию без AI-подсказок: код, сложность, JS/runtime и browser follow-ups." },
    practice: { title: "Мок под таймер", description: "Реши новую задачу, затем пройди Platform-разбор; AI используй только после фиксации ответов." },
    reflection: "Оцени отдельно correctness, complexity defense, platform depth и коммуникацию.",
  },
  {
    title: "Design и final",
    theory: { title: "Grade defense", description: "Повтори структуру design-секции и подготовь истории ownership, неопределённости и сложного инженерного решения." },
    practice: { title: "Финальная симуляция", description: "Проведи design mock с изменением требований, затем ответь на вопросы hiring manager о мотивации и влиянии." },
    reflection: "Составь итоговый список рисков перед интервью и план последнего повторения.",
  },
];

export const AVITO_SPRINT = buildCompanySprint("avito", DAYS);
export const AVITO_SPRINT_AI_KEY = "avito-sprint";
export const AVITO_SPRINT_AI_VERSION = 1;
