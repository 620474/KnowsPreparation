import { z } from "zod";

export const agentRoleKeySchema = z.enum(["content_author", "evaluator", "reviewer", "researcher", "interviewer"]);
export const agentPermissionSchema = z.enum(["web_search", "read_context", "produce_structured_output", "propose_actions"]);

export const agentRoleDefinitionV1Schema = z.object({
  role: agentRoleKeySchema,
  version: z.string().min(1),
  purpose: z.string().min(1),
  permissions: z.array(agentPermissionSchema),
  maximumSteps: z.number().int().positive(),
  maximumOutputTokens: z.number().int().positive(),
  humanApprovalRequired: z.boolean(),
});

export const agentRunEnvelopeV1Schema = z.object({
  runId: z.string().min(1),
  operation: z.string().min(1),
  role: agentRoleKeySchema,
  roleVersion: z.string().min(1),
  model: z.string().min(1),
  permissions: z.array(agentPermissionSchema),
  budget: z.object({ maximumSteps: z.number().int().positive(), maximumOutputTokens: z.number().int().positive() }),
  humanApprovalRequired: z.boolean(),
  createdAt: z.string(),
});

export type AgentRoleKey = z.infer<typeof agentRoleKeySchema>;
export type AgentPermission = z.infer<typeof agentPermissionSchema>;
export type AgentRoleDefinitionV1 = z.infer<typeof agentRoleDefinitionV1Schema>;
export type AgentRunEnvelopeV1 = z.infer<typeof agentRunEnvelopeV1Schema>;
