import { z } from "zod";

import { evidenceEventSchema } from "./evidence";
import { SKILL_ONTOLOGY_VERSION, skillCapabilitySchema, skillDefinitionSchema } from "./skills";

export const masteryConfidenceSchema = z.enum(["low", "medium", "high"]);

export const capabilityMasterySchema = z.object({
  capability: skillCapabilitySchema,
  estimate: z.number().min(0).max(100).nullable(),
  lower: z.number().min(0).max(100).nullable(),
  upper: z.number().min(0).max(100).nullable(),
  evidenceCount: z.number().int().min(0),
  independentFamilyCount: z.number().int().min(0),
  transferEvidenceCount: z.number().int().min(0),
  noAiEvidenceCount: z.number().int().min(0),
  latestEvidenceAt: z.string().nullable(),
  confidence: masteryConfidenceSchema,
});

export const skillMasterySchema = z.object({
  skillId: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  estimate: z.number().min(0).max(100).nullable(),
  lower: z.number().min(0).max(100).nullable(),
  upper: z.number().min(0).max(100).nullable(),
  evidenceCount: z.number().int().min(0),
  independentFamilyCount: z.number().int().min(0),
  transferEvidenceCount: z.number().int().min(0),
  noAiEvidenceCount: z.number().int().min(0),
  latestEvidenceAt: z.string().nullable(),
  confidence: masteryConfidenceSchema,
  capabilities: z.array(capabilityMasterySchema),
});

export const targetReadinessSchema = z.object({
  targetId: z.string().min(1),
  targetLabel: z.string().min(1),
  estimate: z.number().min(0).max(100).nullable(),
  lower: z.number().min(0).max(100).nullable(),
  upper: z.number().min(0).max(100).nullable(),
  coverage: z.number().min(0).max(100),
  integrityCoverage: z.number().min(0).max(100),
  evidenceCount: z.number().int().min(0),
  confidence: masteryConfidenceSchema,
});

export const knowledgeOverviewSchema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  masteryModelVersion: z.string().min(1),
  generatedAt: z.string(),
  readiness: targetReadinessSchema,
  skills: z.array(skillMasterySchema),
});

export const skillDetailSchema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  definition: skillDefinitionSchema,
  mastery: skillMasterySchema,
  evidence: z.array(evidenceEventSchema),
});

export type MasteryConfidence = z.infer<typeof masteryConfidenceSchema>;
export type CapabilityMastery = z.infer<typeof capabilityMasterySchema>;
export type SkillMastery = z.infer<typeof skillMasterySchema>;
export type TargetReadiness = z.infer<typeof targetReadinessSchema>;
export type KnowledgeOverview = z.infer<typeof knowledgeOverviewSchema>;
export type SkillDetail = z.infer<typeof skillDetailSchema>;
