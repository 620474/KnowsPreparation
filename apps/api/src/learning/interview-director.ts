import type {
  InterviewClaim,
  InterviewConversationState,
  InterviewSessionKind,
  InterviewerAction,
} from "@prep/contracts";
import { createHash } from "node:crypto";
import type { CompanyInterviewPolicy } from "./company-interview-policy";

export const INTERVIEW_POLICY_VERSION = "interview-director-v3";
export const MAX_INTERVIEW_DEPTH = 5;

export interface InterviewActionProposal {
  action: InterviewerAction;
  prompt: string;
  nextQuestionId: string | null;
  score: number | null;
  confidence: "low" | "medium" | "high";
  strengths: string[];
  gaps: string[];
}

export interface InterviewPolicyInput {
  state: InterviewConversationState;
  proposal: InterviewActionProposal;
  kind: InterviewSessionKind;
  secondsRemaining: number;
  hasNextQuestion: boolean;
  companyPolicy?: CompanyInterviewPolicy;
}

export interface InterviewPolicyDecision extends InterviewActionProposal {
  forced: boolean;
  reason: string | null;
}

const HINT_PATTERNS = [
  /правильн(?:ый|ое|ая) ответ/i,
  /нужно написать/i,
  /готовое решение/i,
  /используй\s+(?:map|reduce|set|promise|memo)/i,
  /подумай\s+(?:о|об)\s+(?:microtask|promise|замыкан|прототип|memo)/i,
  /обрати внимание на (?:очеред|тип|ключ|зависимост)/i,
  /ключев(?:ое|ая) (?:слово|идея|часть ответа)/i,
  /начни с (?:map|reduce|set|promise|use)/i,
];

const NEGATION_PATTERN = /(?:^|[\s,.;:!?])(?:не|нет|нельзя|никогда|отсутствует|невозможно)(?=$|[\s,.;:!?])/i;
const STOP_WORDS = new Set(["это", "как", "что", "для", "при", "или", "его", "она", "они", "есть", "будет", "может", "потому"]);

const normalizeClaim = (value: string) => value
  .toLocaleLowerCase("ru-RU")
  .replace(/[^a-zа-яё0-9\s-]/gi, " ")
  .replace(/(?:^|[\s,.;:!?])(?:не|нет|нельзя|никогда|отсутствует|невозможно)(?=$|[\s,.;:!?])/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

const claimTokens = (value: string) => new Set(normalizeClaim(value)
  .split(" ")
  .filter((token) => token.length > 2 && !STOP_WORDS.has(token)));

const similarity = (left: string, right: string) => {
  const leftTokens = claimTokens(left);
  const rightTokens = claimTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.min(leftTokens.size, rightTokens.size);
};

export function extractInterviewClaims(answer: string, sourceTurnId: string): InterviewClaim[] {
  return answer
    .split(/(?:[.!?]\s+|\n+)/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 18)
    .slice(0, 6)
    .map((part) => ({
      claimId: createHash("sha256").update(`${sourceTurnId}:${part}`).digest("hex").slice(0, 20),
      normalizedClaim: part,
      sourceTurnId,
      confidence: 0.65,
      contradictedBy: [],
    }));
}

export function mergeInterviewClaims(existing: InterviewClaim[], incoming: InterviewClaim[]) {
  const claims = existing.map((claim) => ({ ...claim, contradictedBy: [...claim.contradictedBy] }));
  let contradictionCount = 0;
  for (const next of incoming) {
    for (const previous of claims) {
      const oppositePolarity = NEGATION_PATTERN.test(previous.normalizedClaim) !== NEGATION_PATTERN.test(next.normalizedClaim);
      if (oppositePolarity && similarity(previous.normalizedClaim, next.normalizedClaim) >= 0.6) {
        previous.contradictedBy.push(next.claimId);
        next.contradictedBy.push(previous.claimId);
        contradictionCount += 1;
      }
    }
    claims.push(next);
  }
  return { claims: claims.slice(-24), contradictionCount };
}

export function reduceInterviewAction({
  state,
  proposal,
  kind,
  secondsRemaining,
  hasNextQuestion,
  companyPolicy,
}: InterviewPolicyInput): InterviewPolicyDecision {
  const maxDepth = companyPolicy?.maxFollowUpDepth ?? MAX_INTERVIEW_DEPTH;
  if (secondsRemaining <= 90 || state.depth >= maxDepth) {
    return {
      ...proposal,
      action: "move_on",
      prompt: hasNextQuestion
        ? "Перейдём к следующему вопросу."
        : "Платформенная секция завершена. Перейдём к практической задаче.",
      forced: true,
      reason: secondsRemaining <= 90 ? "time_budget" : "depth_limit",
    };
  }

  if (proposal.action === "move_on") {
    return { ...proposal, forced: false, reason: null };
  }

  if (kind === "exam" && HINT_PATTERNS.some((pattern) => pattern.test(proposal.prompt))) {
    return {
      ...proposal,
      action: "challenge",
      prompt: "Обоснуй ответ без подсказок: назови правило, ограничение и возможный контрпример.",
      forced: true,
      reason: "exam_hint_blocked",
    };
  }

  return { ...proposal, forced: false, reason: null };
}

export function nextConversationState(
  state: InterviewConversationState,
  action: InterviewerAction,
  nextQuestionId: string | null,
): InterviewConversationState {
  if (action === "move_on" && nextQuestionId) {
    return {
      ...state,
      questionId: nextQuestionId,
      depth: 0,
      completedQuestions: state.completedQuestions + 1,
      turnCount: state.turnCount + 2,
      lastAction: action,
    };
  }
  return {
    ...state,
    depth: action === "move_on" ? state.depth : state.depth + 1,
    completedQuestions: action === "move_on"
      ? state.completedQuestions + 1
      : state.completedQuestions,
    turnCount: state.turnCount + 2,
    lastAction: action,
  };
}

export function nextConversationStateV3(input: {
  state: InterviewConversationState;
  action: InterviewerAction;
  nextQuestionId: string | null;
  answer: string;
  sourceTurnId: string;
  score: number | null;
  capabilities: string[];
  gaps: string[];
}): InterviewConversationState {
  const base = nextConversationState(input.state, input.action, input.nextQuestionId);
  const merged = mergeInterviewClaims(
    input.state.claimLedger ?? [],
    extractInterviewClaims(input.answer, input.sourceTurnId),
  );
  const coverage = new Map((input.state.capabilityCoverage ?? []).map((item) => [item.capability, item]));
  for (const capability of input.capabilities) {
    if (!["recall", "explain", "apply", "debug", "code", "design", "defend", "transfer", "resilience"].includes(capability)) continue;
    const key = capability as NonNullable<InterviewConversationState["capabilityCoverage"]>[number]["capability"];
    const current = coverage.get(key) ?? { capability: key, observed: 0, target: 2, uncertainty: 1 };
    coverage.set(key, {
      ...current,
      observed: current.observed + 1,
      uncertainty: Math.max(0.1, current.uncertainty - (input.score === null ? 0.05 : 0.2)),
    });
  }
  const difficultyBand = input.score === null
    ? input.state.difficultyBand ?? 2
    : input.score >= 80
      ? Math.min(5, (input.state.difficultyBand ?? 2) + 1)
      : input.score < 45
        ? Math.max(1, (input.state.difficultyBand ?? 2) - 1)
        : input.state.difficultyBand ?? 2;
  return {
    ...base,
    difficultyBand,
    claimLedger: merged.claims,
    capabilityCoverage: [...coverage.values()],
    unresolvedGaps: input.gaps.slice(0, 8),
    contradictionCount: (input.state.contradictionCount ?? 0) + merged.contradictionCount,
  };
}
