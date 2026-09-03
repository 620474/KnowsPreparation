import { randomUUID } from "node:crypto";

import { agentRoleDefinitionV1Schema, agentRunEnvelopeV1Schema, type AgentRoleDefinitionV1, type AgentRoleKey } from "@prep/contracts";

export const AGENT_ROLE_REGISTRY: Record<AgentRoleKey, AgentRoleDefinitionV1> = {
  content_author: agentRoleDefinitionV1Schema.parse({ role: "content_author", version: "1.0.0", purpose: "Создавать учебный контент по заданному контракту", permissions: ["read_context", "produce_structured_output"], maximumSteps: 4, maximumOutputTokens: 12_000, humanApprovalRequired: false }),
  evaluator: agentRoleDefinitionV1Schema.parse({ role: "evaluator", version: "1.0.0", purpose: "Оценивать ответы по явной рубрике", permissions: ["read_context", "produce_structured_output"], maximumSteps: 3, maximumOutputTokens: 4_000, humanApprovalRequired: false }),
  reviewer: agentRoleDefinitionV1Schema.parse({ role: "reviewer", version: "1.0.0", purpose: "Проверять факты, логику и качество результатов", permissions: ["web_search", "read_context", "produce_structured_output"], maximumSteps: 6, maximumOutputTokens: 8_000, humanApprovalRequired: false }),
  researcher: agentRoleDefinitionV1Schema.parse({ role: "researcher", version: "1.0.0", purpose: "Собирать и синтезировать проверяемые источники", permissions: ["web_search", "read_context", "produce_structured_output", "propose_actions"], maximumSteps: 12, maximumOutputTokens: 12_000, humanApprovalRequired: true }),
  interviewer: agentRoleDefinitionV1Schema.parse({ role: "interviewer", version: "1.0.0", purpose: "Вести адаптивное техническое интервью", permissions: ["read_context", "produce_structured_output"], maximumSteps: 4, maximumOutputTokens: 4_000, humanApprovalRequired: false }),
};

export function roleForOperation(operation: string): AgentRoleKey {
  if (operation.includes("research")) return "researcher";
  if (operation.includes("interview")) return operation.includes("evaluation") || operation.includes("assess") ? "evaluator" : "interviewer";
  if (operation.includes("review") || operation.includes("verification") || operation.includes("audit")) return "reviewer";
  if (operation.includes("evaluation") || operation.includes("assess")) return "evaluator";
  return "content_author";
}

export function createAgentRunEnvelope(operation: string, model: string, requestedOutputTokens: number) {
  const definition = AGENT_ROLE_REGISTRY[roleForOperation(operation)];
  return agentRunEnvelopeV1Schema.parse({
    runId: randomUUID(), operation, role: definition.role, roleVersion: definition.version, model,
    permissions: definition.permissions,
    budget: { maximumSteps: definition.maximumSteps, maximumOutputTokens: Math.min(requestedOutputTokens, definition.maximumOutputTokens) },
    humanApprovalRequired: definition.humanApprovalRequired,
    createdAt: new Date().toISOString(),
  });
}
