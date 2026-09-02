import type { SkillKey } from "@prep/contracts";

const ROOT_SKILL_BY_LEGACY: Record<SkillKey, string> = {
  javascript: "javascript",
  typescript: "typescript",
  async: "async",
  react: "react",
  browser: "browser",
  algorithms: "algorithms",
  testing: "testing",
  architecture: "architecture",
  "css-a11y": "css-a11y",
  ai: "ai",
};

const patterns: Array<[string, RegExp]> = [
  ["async.event-loop", /event.?loop|microtask|macrotask|queueMicrotask|таймер|очеред.*задач/i],
  ["async.promises", /promise|async.?await|allSettled|асинхрон/i],
  ["async.cancellation", /abort|cancel|race condition|гонк|stale/i],
  ["async.realtime", /websocket|socket|reconnect|heartbeat|real.?time/i],
  ["javascript.execution-context", /execution.?context|call.?stack|scope|област.*видим/i],
  ["javascript.closures", /closure|замыкан/i],
  ["javascript.this", /\bthis\b|bind|call\(|apply\(/i],
  ["javascript.prototypes", /prototype|прототип|class\b/i],
  ["javascript.oop", /\boop\b|ооп|инкапсул|полиморф|композиц/i],
  ["javascript.collections", /array|object|map|set|массив|коллекц|хеш/i],
  ["javascript.types", /typeof|coercion|тип.*javascript|primitive|примитив|equality/i],
  ["typescript.generics", /generic|дженерик/i],
  ["typescript.narrowing", /narrow|type.?guard|discriminated|сужен/i],
  ["typescript.type-system", /typescript|union|intersection|structural|интерфейс.*тип/i],
  ["react.performance", /memo|rerender|re-render|производительн|профилир/i],
  ["react.hooks", /hook|useState|useEffect|useMemo|useRef|хук/i],
  ["react.state", /state management|context api|redux|zustand|состояни/i],
  ["react.forms", /форм|controlled|validation/i],
  ["react.rendering", /react|reconcil|render|key prop|компонент/i],
  ["browser.security", /cors|csp|xss|csrf|безопасност/i],
  ["browser.storage", /indexeddb|localstorage|cookie|storage|кеш/i],
  ["browser.network", /http|rest|network|fetch|api|сеть/i],
  ["browser.rendering", /dom|cssom|layout|paint|composit/i],
  ["algorithms.complexity", /big.?o|сложност|o\(n/i],
  ["algorithms.trees-graphs", /tree|graph|dfs|bfs|дерев|граф/i],
  ["algorithms.arrays-hashmaps", /two pointers|sliding window|frequency|array|map|массив/i],
  ["testing.e2e", /playwright|cypress|e2e|end.?to.?end/i],
  ["testing.integration", /integration|msw|интеграц/i],
  ["testing.unit-component", /vitest|jest|testing library|unit|тест.*компонент/i],
  ["architecture.frontend-system-design", /system design|масштаб|архитектур.*frontend/i],
  ["architecture.design-principles", /solid|dry|kiss|coupling|cohesion|паттерн/i],
  ["css-a11y.accessibility", /a11y|aria|доступност|клавиатур|focus/i],
  ["css-a11y.layout", /css|scss|sass|flex|grid|bootstrap|в[её]рст/i],
  ["ai.agents", /agent|tool.?call|prompt injection|агент/i],
  ["ai.prompting", /llm|prompt|gpt|claude|ии/i],
];

const payloadText = (payload: Record<string, unknown>) =>
  Object.values(payload)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string")
    .join(" ");

export function resolveSkillIds(
  legacySkillKeys: SkillKey[],
  itemId: string | null,
  payload: Record<string, unknown>,
) {
  const haystack = `${itemId ?? ""} ${payloadText(payload)}`;
  const specific = patterns
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([skillId]) => skillId);
  const roots = legacySkillKeys.map((skillKey) => ROOT_SKILL_BY_LEGACY[skillKey]);
  return [...new Set([
    ...(specific.length ? specific : []),
    ...(roots.length ? roots : specific.length ? [] : ["javascript"]),
  ])];
}
