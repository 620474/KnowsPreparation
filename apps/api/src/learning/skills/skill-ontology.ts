import {
  SKILL_ONTOLOGY_VERSION,
  type SkillDefinition,
  type SkillKey,
} from "@prep/contracts";

const root = (
  skillId: SkillKey,
  label: string,
  description: string,
): SkillDefinition => ({
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  skillId,
  label,
  description,
  category: label,
  legacySkillKey: skillId,
  parentSkillId: null,
  prerequisites: [],
  relatedSkillIds: [],
});

const child = (
  skillId: string,
  label: string,
  description: string,
  legacySkillKey: SkillKey,
  prerequisites: string[] = [],
  relatedSkillIds: string[] = [],
): SkillDefinition => ({
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  skillId,
  label,
  description,
  category: ROOT_SKILL_LABELS[legacySkillKey],
  legacySkillKey,
  parentSkillId: legacySkillKey,
  prerequisites,
  relatedSkillIds,
});

const ROOT_SKILL_LABELS: Record<SkillKey, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  async: "Асинхронность",
  react: "React",
  browser: "Браузер",
  algorithms: "Алгоритмы",
  testing: "Тестирование",
  architecture: "Архитектура",
  "css-a11y": "CSS и доступность",
  ai: "AI Engineering",
};

export const SKILL_ONTOLOGY: SkillDefinition[] = [
  root("javascript", "JavaScript", "Модель языка, объекты, функции и выполнение кода."),
  root("typescript", "TypeScript", "Статическая модель типов поверх JavaScript."),
  root("async", "Асинхронность", "Event loop, Promise и конкурентные операции."),
  root("react", "React", "Компоненты, состояние и модель рендеринга React."),
  root("browser", "Браузер", "Web Platform, сеть, хранение и безопасность."),
  root("algorithms", "Алгоритмы", "Сложность, структуры данных и решение задач."),
  root("testing", "Тестирование", "Пирамида тестов и проверка frontend-приложений."),
  root("architecture", "Архитектура", "Проектирование поддерживаемых frontend-систем."),
  root("css-a11y", "CSS и доступность", "Адаптивная вёрстка и доступные интерфейсы."),
  root("ai", "AI Engineering", "Безопасное и проверяемое применение LLM."),

  child("javascript.types", "Типы и преобразования", "Примитивы, объекты, equality и coercion.", "javascript"),
  child("javascript.execution-context", "Контексты выполнения", "Execution context, scope и call stack.", "javascript"),
  child("javascript.closures", "Замыкания", "Лексическое окружение и жизненный цикл замыканий.", "javascript", ["javascript.execution-context"]),
  child("javascript.this", "this и binding", "Правила определения this, bind, call и apply.", "javascript", ["javascript.execution-context"]),
  child("javascript.prototypes", "Прототипы", "Prototype chain, классы и делегирование.", "javascript", ["javascript.types"]),
  child("javascript.collections", "Коллекции", "Array, Object, Map, Set и операции над данными.", "javascript", ["javascript.types"]),
  child("javascript.oop", "ООП и дизайн объектов", "Инкапсуляция, полиморфизм и композиция.", "javascript", ["javascript.prototypes"], ["architecture.design-principles"]),

  child("typescript.type-system", "Система типов", "Structural typing, unions и intersections.", "typescript", ["javascript.types"]),
  child("typescript.generics", "Дженерики", "Параметризация и ограничения типов.", "typescript", ["typescript.type-system"]),
  child("typescript.narrowing", "Narrowing", "Type guards, discriminated unions и exhaustive checks.", "typescript", ["typescript.type-system"]),

  child("async.event-loop", "Event loop", "Tasks, microtasks и порядок выполнения.", "async", ["javascript.execution-context"]),
  child("async.promises", "Promise", "Цепочки, ошибки и combinators.", "async", ["async.event-loop"]),
  child("async.cancellation", "Отмена и гонки", "AbortSignal, race conditions и stale responses.", "async", ["async.promises"]),
  child("async.realtime", "WebSocket и realtime", "Соединение, reconnect, heartbeat и ordering.", "async", ["async.event-loop"], ["browser.network"]),

  child("react.rendering", "Модель рендеринга", "Render, reconciliation, keys и commit phase.", "react", ["javascript.types"]),
  child("react.hooks", "React Hooks", "State, effects, refs и правила hooks.", "react", ["react.rendering", "javascript.closures"]),
  child("react.state", "Управление состоянием", "Локальное, серверное и глобальное состояние.", "react", ["react.hooks"]),
  child("react.performance", "Производительность React", "Профилирование, memoization и частые обновления.", "react", ["react.rendering", "react.hooks"]),
  child("react.forms", "Формы", "Controlled state, validation и доступные формы.", "react", ["react.hooks"], ["css-a11y.accessibility"]),

  child("browser.rendering", "Рендеринг браузера", "DOM, CSSOM, layout, paint и compositing.", "browser", ["css-a11y.layout"]),
  child("browser.performance-observability", "Web performance и observability", "Performance API, Core Web Vitals, long tasks, profiling, frontend-метрики и мониторинг runtime-ошибок.", "browser", ["browser.rendering", "browser.network"]),
  child("browser.network", "HTTP и сеть", "HTTP, REST, кеширование и диагностика Network.", "browser"),
  child("browser.storage", "Хранение данных", "Cookies, Web Storage, IndexedDB и cache.", "browser", ["browser.network"]),
  child("browser.security", "Web Security", "CORS, CSP, XSS, CSRF и безопасные контексты.", "browser", ["browser.network"]),

  child("algorithms.complexity", "Сложность", "Оценка времени и памяти через Big-O.", "algorithms"),
  child("algorithms.arrays-hashmaps", "Массивы и хеш-таблицы", "Two pointers, sliding window и frequency maps.", "algorithms", ["algorithms.complexity"]),
  child("algorithms.trees-graphs", "Деревья и графы", "DFS, BFS и обход структур.", "algorithms", ["algorithms.complexity"]),

  child("testing.unit-component", "Unit и component tests", "Vitest, test doubles и React Testing Library.", "testing", ["react.rendering"]),
  child("testing.integration", "Интеграционные тесты", "Проверка границ модулей и API через MSW.", "testing", ["testing.unit-component", "browser.network"]),
  child("testing.e2e", "E2E-тесты", "Playwright, пользовательские сценарии и борьба с flaky tests.", "testing", ["testing.integration"]),

  child("architecture.design-principles", "Принципы дизайна", "SOLID, DRY, KISS, cohesion и coupling.", "architecture"),
  child("architecture.frontend-system-design", "Frontend system design", "Границы модулей, данные и масштабирование UI.", "architecture", ["architecture.design-principles"]),

  child("css-a11y.layout", "CSS layout", "Flexbox, Grid, responsive layout и SCSS.", "css-a11y"),
  child("css-a11y.accessibility", "Доступность", "Семантика, клавиатура, focus и ARIA.", "css-a11y", ["css-a11y.layout"]),

  child("ai.prompting", "Работа с LLM", "Контекст, ограничения и проверка результата.", "ai"),
  child("ai.agents", "AI-агенты", "Tools, orchestration, evals и защита от prompt injection.", "ai", ["ai.prompting"]),
];

const definitionById = new Map(SKILL_ONTOLOGY.map((definition) => [definition.skillId, definition]));

export const getSkillDefinition = (skillId: string) => definitionById.get(skillId) ?? null;

export function validateSkillOntology(definitions = SKILL_ONTOLOGY) {
  const ids = new Set(definitions.map((definition) => definition.skillId));
  if (ids.size !== definitions.length) throw new Error("Skill ontology contains duplicate IDs");
  for (const definition of definitions) {
    const references = [definition.parentSkillId, ...definition.prerequisites, ...definition.relatedSkillIds]
      .filter((value): value is string => Boolean(value));
    for (const reference of references) {
      if (!ids.has(reference)) throw new Error(`Unknown skill reference: ${reference}`);
    }
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (skillId: string) => {
    if (visiting.has(skillId)) throw new Error(`Skill prerequisite cycle: ${skillId}`);
    if (visited.has(skillId)) return;
    visiting.add(skillId);
    const definition = definitions.find((item) => item.skillId === skillId);
    for (const prerequisite of definition?.prerequisites ?? []) visit(prerequisite);
    visiting.delete(skillId);
    visited.add(skillId);
  };
  for (const definition of definitions) visit(definition.skillId);
  return true;
}

validateSkillOntology();
