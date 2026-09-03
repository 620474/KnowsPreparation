import { describe, expect, it } from "vitest";

import { QUESTION_BANK } from "./curriculum";
import { ASSESSMENT_MANIFEST, validateAssessmentManifest } from "./assessment-manifest";
import { getQuestionTraining } from "./question-training";

describe("assessment manifest", () => {
  it("contains unique explicit forms with normalized observation weights", () => {
    expect(validateAssessmentManifest()).toBe(true);
    expect(new Set(ASSESSMENT_MANIFEST.map((entry) => entry.itemId)).size).toBe(ASSESSMENT_MANIFEST.length);
    expect(new Set(ASSESSMENT_MANIFEST.map((entry) => `${entry.formFamilyId}:${entry.formId}`)).size).toBe(ASSESSMENT_MANIFEST.length);
  });

  it("references deterministic public exercises only", () => {
    for (const entry of ASSESSMENT_MANIFEST) {
      expect(QUESTION_BANK.some((question) => question.id === entry.itemId)).toBe(true);
      const training = getQuestionTraining(entry.itemId);
      expect(training).toBeTruthy();
      expect(training?.evaluator.mode).not.toBe("ai");
      expect(entry.difficulty).toBeGreaterThanOrEqual(1);
      expect(entry.difficulty).toBeLessThanOrEqual(5);
      expect(entry.observations.reduce((sum, observation) => sum + observation.weight, 0)).toBe(1);
    }
  });
});
