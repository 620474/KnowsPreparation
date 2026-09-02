import { z } from "zod";

import { EVIDENCE_EVENT_VERSION, evidenceEventV2Schema } from "./evidence-v2";
import { masteryConfidenceSchema } from "./mastery";
import {
  SKILL_ONTOLOGY_VERSION,
  skillCapabilitySchema,
  skillDefinitionSchema,
} from "./skills";

export const MASTERY_MODEL_V2_VERSION = "evidence-native-v2" as const;

export const capabilityMasteryV2Schema = z.object({
  capability: skillCapabilitySchema,
  required: z.boolean(),
  estimate: z.number().min(0).max(100).nullable(),
  lower: z.number().min(0).max(100),
  upper: z.number().min(0).max(100),
  evidenceCount: z.number().int().min(0),
  independentFamilyCount: z.number().int().min(0),
  transferEvidenceCount: z.number().int().min(0),
  noAiEvidenceCount: z.number().int().min(0),
  latestEvidenceAt: z.string().nullable(),
  confidence: masteryConfidenceSchema,
});

export const skillMasteryV2Schema = z.object({
  skillId: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  estimate: z.number().min(0).max(100),
  lower: z.number().min(0).max(100),
  upper: z.number().min(0).max(100),
  capabilityCoverage: z.number().min(0).max(100),
  requiredCapabilities: z.array(skillCapabilitySchema).min(1),
  unknownCapabilities: z.array(skillCapabilitySchema),
  evidenceCount: z.number().int().min(0),
  independentFamilyCount: z.number().int().min(0),
  transferEvidenceCount: z.number().int().min(0),
  noAiEvidenceCount: z.number().int().min(0),
  latestEvidenceAt: z.string().nullable(),
  confidence: masteryConfidenceSchema,
  capabilities: z.array(capabilityMasteryV2Schema),
});

export const targetReadinessV2Schema = z.object({
  targetId: z.string().min(1),
  targetLabel: z.string().min(1),
  estimate: z.number().min(0).max(100),
  lower: z.number().min(0).max(100),
  upper: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  transferCoverage: z.number().min(0).max(100),
  integrityCoverage: z.number().min(0).max(100),
  evidenceCount: z.number().int().min(0),
  unknownSkillCount: z.number().int().min(0),
  confidence: masteryConfidenceSchema,
});

export const knowledgeOverviewV2Schema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  evidenceVersion: z.literal(EVIDENCE_EVENT_VERSION),
  masteryModelVersion: z.literal(MASTERY_MODEL_V2_VERSION),
  generatedAt: z.string(),
  readiness: targetReadinessV2Schema,
  skills: z.array(skillMasteryV2Schema),
});

export const skillDetailV2Schema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  evidenceVersion: z.literal(EVIDENCE_EVENT_VERSION),
  definition: skillDefinitionSchema,
  mastery: skillMasteryV2Schema,
  evidence: z.array(evidenceEventV2Schema),
});

export const masteryShadowComparisonSchema = z.object({
  targetId: z.string().min(1),
  generatedAt: z.string(),
  readiness: z.object({
    v1Estimate: z.number().min(0).max(100).nullable(),
    v2Estimate: z.number().min(0).max(100),
    estimateDelta: z.number().nullable(),
    v1Coverage: z.number().min(0).max(100),
    v2Coverage: z.number().min(0).max(100),
    v2TransferCoverage: z.number().min(0).max(100),
  }),
  skills: z.array(z.object({
    skillId: z.string().min(1),
    v1Estimate: z.number().min(0).max(100).nullable(),
    v2Estimate: z.number().min(0).max(100),
    estimateDelta: z.number().nullable(),
    v2CapabilityCoverage: z.number().min(0).max(100),
    unknownCapabilities: z.array(skillCapabilitySchema),
  })),
});

export type CapabilityMasteryV2 = z.infer<typeof capabilityMasteryV2Schema>;
export type SkillMasteryV2 = z.infer<typeof skillMasteryV2Schema>;
export type TargetReadinessV2 = z.infer<typeof targetReadinessV2Schema>;
export type KnowledgeOverviewV2 = z.infer<typeof knowledgeOverviewV2Schema>;
export type SkillDetailV2 = z.infer<typeof skillDetailV2Schema>;
export type MasteryShadowComparison = z.infer<typeof masteryShadowComparisonSchema>;
