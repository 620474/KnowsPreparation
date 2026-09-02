import type { SkillCapability } from "@prep/contracts";

const CAPABILITY_MAP: Record<string, SkillCapability> = {
  recall: "recall",
  apply: "apply",
  debug: "debug",
  code: "code",
  explain: "explain",
  defend: "defend",
  comprehension: "explain",
  prediction: "apply",
  debugging: "debug",
  application: "apply",
  transfer: "apply",
  tradeoff: "defend",
};

export const normalizeSkillCapability = (value: unknown) =>
  CAPABILITY_MAP[String(value)] ?? null;

export const normalizeSkillCapabilities = (values: unknown[]) => [
  ...new Set(values
    .map(normalizeSkillCapability)
    .filter((value): value is SkillCapability => Boolean(value))),
];
