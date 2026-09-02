import type {
  AssessmentObservationV2,
  SkillCapability,
} from "@prep/contracts";

export interface AssessmentCriterionDraft {
  criterionId: string;
  rubricVersion: string;
  capability: SkillCapability;
  score: number;
  reliability: number;
  weight?: number;
}

export const buildAssessmentObservations = (
  skillIds: string[],
  criteria: AssessmentCriterionDraft[],
): AssessmentObservationV2[] => [...new Set(skillIds)].flatMap((skillId) =>
  criteria.map((criterion) => ({
    ...criterion,
    skillId,
    score: Math.max(0, Math.min(100, Math.round(criterion.score))),
    reliability: Math.max(0, Math.min(1, criterion.reliability)),
    weight: criterion.weight ?? 1,
  })));
