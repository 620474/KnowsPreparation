import { createHash } from "node:crypto";

import {
  SKILL_ONTOLOGY_VERSION,
  type EvidenceAssistanceMode,
  type EvidenceEvaluatorType,
  type EvidenceSourceKind,
  type SkillCapability,
  type SkillTransferLevel,
} from "@prep/contracts";

import { readinessScoresForSignal } from "../readiness";
import type { LearningSignal } from "../schemas/learning-signal.schema";
import { resolveSkillIds } from "../skills/skill-resolver";
import { normalizeSkillCapabilities } from "./evidence-capabilities";

const sourceKind = (signal: LearningSignal): EvidenceSourceKind => {
  if (signal.type === "question_reviewed") return "question_review";
  if (signal.type === "question_attempted") return "question_attempt";
  if (signal.type === "quiz_submitted") return "quiz_attempt";
  if (signal.type === "practice_attempted") return "practice_attempt";
  return signal.payload.interviewSession === true ? "interview_session" : "mock_interview";
};

const assistanceMode = (signal: LearningSignal): EvidenceAssistanceMode => {
  if (signal.payload.aiAssisted === true) return "ai_assisted";
  if (signal.payload.aiAssisted === false) return "no_ai";
  if (signal.type === "question_reviewed") return "normal";
  return "unknown";
};

const evaluatorType = (signal: LearningSignal): EvidenceEvaluatorType => {
  const source = signal.payload.assessmentSource;
  if (source === "ai") return "ai";
  if (source === "mixed") return "mixed";
  if (source === "deterministic") return "deterministic";
  if (signal.payload.reliability === 0.6) return "ai";
  return "deterministic";
};

const transferLevel = (signal: LearningSignal): SkillTransferLevel => {
  const value = signal.payload.transferLevel;
  if (value === "near_transfer" || value === "far_transfer") return value;
  return "familiar";
};

const reliabilityForSignal = (signal: LearningSignal) => {
  if (signal.type === "question_reviewed") return 0.2;
  const value = signal.payload.reliability;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0.1, Math.min(1, value))
    : 1;
};

const itemFamilyId = (signal: LearningSignal) => {
  const explicit = signal.payload.itemFamilyId;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const itemId = signal.itemId ?? signal.operationId;
  return `${signal.type}:${itemId.replace(/:(core|deep)$/u, "")}`;
};

const capabilitiesForSignal = (signal: LearningSignal): SkillCapability[] => {
  const explicit = Array.isArray(signal.payload.capabilities)
    ? normalizeSkillCapabilities(signal.payload.capabilities)
    : [];
  if (explicit.length) return explicit;
  if (signal.type === "practice_attempted") return ["code"];
  if (signal.type === "mock_completed") return ["explain", "defend"];
  return ["recall"];
};

const scoreByCapability = (signal: LearningSignal) => {
  const legacyScores = readinessScoresForSignal(signal);
  const fallback = Object.values(legacyScores).find(
    (score): score is number => typeof score === "number",
  ) ?? null;
  const scores = new Map<SkillCapability, number>();
  for (const capability of capabilitiesForSignal(signal)) {
    const legacyDimension = capability === "apply" ? "recall"
      : capability === "debug" ? "code"
        : capability;
    const score = legacyScores[legacyDimension];
    if (typeof score === "number") scores.set(capability, score);
    else if (fallback !== null) scores.set(capability, fallback);
  }
  return scores;
};

export function mapSignalToEvidence(signal: LearningSignal) {
  if (signal.type === "recommendation_skipped") return null;
  const skillIds = resolveSkillIds(signal.skillKeys, signal.itemId, signal.payload);
  const scores = scoreByCapability(signal);
  if (!scores.size) return null;
  const reliability = reliabilityForSignal(signal);
  const eventId = createHash("sha256")
    .update(`${SKILL_ONTOLOGY_VERSION}:${signal.operationId}`)
    .digest("hex");
  return {
    eventId,
    operationId: signal.operationId,
    ontologyVersion: SKILL_ONTOLOGY_VERSION,
    source: {
      kind: sourceKind(signal),
      entityId: signal.operationId,
      itemId: signal.itemId ?? null,
      itemVersion: typeof signal.payload.itemVersion === "string"
        ? signal.payload.itemVersion
        : "legacy-v1",
      itemFamilyId: itemFamilyId(signal),
      track: signal.track ?? null,
    },
    observations: skillIds.flatMap((skillId) =>
      [...scores.entries()].map(([capability, score]) => ({
        skillId,
        capability,
        score,
        reliability,
      }))),
    transferLevel: transferLevel(signal),
    assistance: {
      mode: assistanceMode(signal),
      hintCount: typeof signal.payload.hintCount === "number" ? signal.payload.hintCount : 0,
      solutionViewed: signal.payload.solutionViewed === true,
    },
    evaluator: {
      type: evaluatorType(signal),
      evaluatorVersion: "learning-signal-mapper-v1",
      model: typeof signal.payload.model === "string" ? signal.payload.model : null,
      promptVersion: typeof signal.payload.promptVersion === "string" ? signal.payload.promptVersion : null,
      schemaVersion: typeof signal.payload.schemaVersion === "string" ? signal.payload.schemaVersion : null,
    },
    occurredAt: signal.occurredAt ?? signal.createdAt ?? new Date(),
  };
}
