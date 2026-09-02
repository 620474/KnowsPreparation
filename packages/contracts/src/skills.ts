import { z } from "zod";

export const SKILL_ONTOLOGY_VERSION = "frontend-v1" as const;

export const skillCapabilitySchema = z.enum([
  "recall",
  "explain",
  "apply",
  "debug",
  "code",
  "defend",
]);

export const skillTransferLevelSchema = z.enum([
  "familiar",
  "near_transfer",
  "far_transfer",
]);

export const skillEdgeTypeSchema = z.enum([
  "subskill_of",
  "requires",
  "related_to",
]);

export const skillDefinitionSchema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  skillId: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  legacySkillKey: z.string().min(1),
  parentSkillId: z.string().nullable(),
  prerequisites: z.array(z.string()),
  relatedSkillIds: z.array(z.string()).default([]),
});

export const skillGraphSchema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  skills: z.array(skillDefinitionSchema),
});

export type SkillCapability = z.infer<typeof skillCapabilitySchema>;
export type SkillTransferLevel = z.infer<typeof skillTransferLevelSchema>;
export type SkillEdgeType = z.infer<typeof skillEdgeTypeSchema>;
export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;
export type SkillGraph = z.infer<typeof skillGraphSchema>;
