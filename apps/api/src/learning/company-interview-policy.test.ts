import { describe, expect, it } from "vitest";

import { getCompanyInterviewPolicy } from "./company-interview-policy";

describe("company interview policies", () => {
  it("requires algorithms and design defense for Avito and T-Bank", () => {
    for (const company of ["avito", "tbank"] as const) {
      const policy = getCompanyInterviewPolicy(company);
      expect(policy.requireComplexityDefense).toBe(true);
      expect(policy.systemDesignMode).toBe("required");
      expect(policy.sectionWeights.coding).toBeGreaterThanOrEqual(1.5);
      expect(policy.sectionWeights.architecture).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("keeps MTS realtime skills vacancy-conditioned", () => {
    const policy = getCompanyInterviewPolicy("mts");
    expect(policy.vacancyConditionalSkills).toContain("websocket");
    expect(policy.requireComplexityDefense).toBe(false);
  });
});
