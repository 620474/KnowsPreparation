import { describe, expect, it } from "vitest";

import { requirementsFromVacancy } from "./target-profile.service";

describe("target profile vacancy mapper", () => {
  it("extracts realtime, React and testing requirements", () => {
    const requirements = requirementsFromVacancy(
      "React, TypeScript, WebSocket reconnect, Vitest и system design",
    );

    expect(requirements.map((item) => item.skillId)).toEqual(expect.arrayContaining([
      "react",
      "typescript",
      "async.realtime",
      "testing",
      "architecture",
    ]));
    expect(requirements.find((item) => item.skillId === "async.realtime")?.capabilities)
      .toContain("resilience");
  });

  it("falls back to the general frontend profile", () => {
    expect(requirementsFromVacancy("обычная вакансия").length).toBeGreaterThan(3);
  });
});
