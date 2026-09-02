import type {
  InterviewConversationState,
  InterviewSessionKind,
  InterviewerAction,
} from "@prep/contracts";

export const INTERVIEW_POLICY_VERSION = "interview-director-v1";
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
];

export function reduceInterviewAction({
  state,
  proposal,
  kind,
  secondsRemaining,
  hasNextQuestion,
}: InterviewPolicyInput): InterviewPolicyDecision {
  if (secondsRemaining <= 90 || state.depth >= MAX_INTERVIEW_DEPTH) {
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
