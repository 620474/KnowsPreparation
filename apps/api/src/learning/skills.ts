import { SKILL_KEYS, type SkillKey } from "@prep/contracts";

export const SKILL_DEFINITIONS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  async: "Асинхронность",
  react: "React",
  browser: "Браузер",
  algorithms: "Алгоритмы",
  testing: "Тестирование",
  architecture: "Архитектура",
  "css-a11y": "CSS и доступность",
  ai: "AI-инструменты",
} satisfies Record<SkillKey, string>;

const skillPatterns: Array<[SkillKey, RegExp]> = [
  ["typescript", /typescript|типизац|generic|дженерик|type guard|infer\b/i],
  ["async", /асинхрон|event loop|promise|microtask|таймер|abort|fetch|очеред/i],
  ["react", /react|jsx|компонент|hook|рендер|state|props|memo|fiber/i],
  ["browser", /браузер|dom\b|web api|хранилищ|cookie|http|сеть|cors|кеш/i],
  ["algorithms", /алгоритм|big-o|сложност|массив|строк|граф|дерев|поиск|сортиров/i],
  ["testing", /тест|vitest|jest|playwright|testing library|mock|stub|coverage/i],
  ["architecture", /архитект|solid|dry|kiss|паттерн|design|модуль|api contract/i],
  ["css-a11y", /css|верст|layout|grid|flex|доступност|a11y|aria|focus/i],
  ["ai", /\bai\b|ии|llm|rag|prompt|агент|модел/i],
  ["javascript", /javascript|\bjs\b|замыкан|прототип|тип данных|scope|this|област/i],
];

export function inferSkillKeys(...values: Array<string | null | undefined>): SkillKey[] {
  const text = values.filter(Boolean).join(" ");
  const matched = skillPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);
  return matched.length > 0
    ? [...new Set(matched)]
    : ["javascript"];
}

export const isSkillKey = (value: string): value is SkillKey =>
  (SKILL_KEYS as readonly string[]).includes(value);
