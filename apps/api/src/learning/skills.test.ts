import { describe, expect, it } from "vitest";

import { inferSkillKeys } from "./skills";

describe("inferSkillKeys", () => {
  it("detects multiple skills from learning content", () => {
    expect(inferSkillKeys("React hooks", "тест компонента в Vitest")).toEqual([
      "react",
      "testing",
    ]);
  });

  it("uses JavaScript as a safe fallback", () => {
    expect(inferSkillKeys("Неизвестная тема")).toEqual(["javascript"]);
  });
});
