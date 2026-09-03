import { describe, expect, it } from "vitest";

import {
  getBuiltinTargetRequirements,
  requirementsFromVacancy,
} from "./target-profile.service";

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

  it("matches confirmed company interview gates", () => {
    const avito = getBuiltinTargetRequirements("avito");
    const tbank = getBuiltinTargetRequirements("tbank");
    const mts = getBuiltinTargetRequirements("mts");

    expect(avito.find((item) => item.skillId === "algorithms")).toMatchObject({
      importance: 1.4,
      required: true,
    });
    expect(avito.find((item) => item.skillId === "architecture")?.importance).toBe(1.5);
    expect(tbank.find((item) => item.skillId === "algorithms")?.importance).toBe(1.5);
    expect(tbank.find((item) => item.skillId === "architecture")?.importance).toBe(1.5);
    expect(mts.find((item) => item.skillId === "async.realtime")).toMatchObject({
      importance: 0.8,
      required: false,
    });
  });

  it("promotes realtime when a vacancy explicitly requires it", () => {
    expect(requirementsFromVacancy("React и WebSocket reconnect").find(
      (item) => item.skillId === "async.realtime",
    )).toMatchObject({ importance: 1.3, required: true });
  });
});
