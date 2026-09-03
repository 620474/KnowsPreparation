import { describe, expect, it } from "vitest";

import {
  INTERVIEW_POLICY_VERSION,
  mergeInterviewClaims,
  nextConversationState,
  nextConversationStateV3,
  reduceInterviewAction,
  type InterviewActionProposal,
} from "./interview-director";

const proposal: InterviewActionProposal = {
  action: "probe",
  prompt: "Почему этот порядок гарантирован?",
  nextQuestionId: "q-2",
  score: 70,
  confidence: "medium",
  strengths: ["Названо основное правило"],
  gaps: ["Нет контрпримера"],
};

const state = {
  questionId: "q-1",
  depth: 0,
  completedQuestions: 0,
  turnCount: 1,
  lastAction: null,
  policyVersion: INTERVIEW_POLICY_VERSION,
} as const;

describe("interview director policy", () => {
  it("accepts a safe adaptive probe", () => {
    expect(reduceInterviewAction({
      state,
      proposal,
      kind: "training",
      secondsRemaining: 900,
      hasNextQuestion: true,
    })).toMatchObject({ action: "probe", forced: false });
  });

  it("forces move-on when depth budget is exhausted", () => {
    expect(reduceInterviewAction({
      state: { ...state, depth: 5 },
      proposal,
      kind: "training",
      secondsRemaining: 900,
      hasNextQuestion: true,
    })).toMatchObject({ action: "move_on", forced: true, reason: "depth_limit" });
  });

  it("uses the company-specific follow-up depth", () => {
    expect(reduceInterviewAction({
      state: { ...state, depth: 4 },
      proposal,
      kind: "training",
      secondsRemaining: 900,
      hasNextQuestion: true,
      companyPolicy: {
        sectionWeights: { platform: 1, coding: 1, architecture: 1, defense: 1 },
        requireComplexityDefense: false,
        requireCodeDefense: true,
        allowChangingRequirements: true,
        systemDesignMode: "optional",
        maxFollowUpDepth: 4,
        targetDurationMinutes: 90,
        vacancyConditionalSkills: [],
      },
    })).toMatchObject({ action: "move_on", forced: true, reason: "depth_limit" });
  });

  it("blocks solution-like hints in exam mode", () => {
    expect(reduceInterviewAction({
      state,
      proposal: { ...proposal, prompt: "Правильный ответ: используй Promise." },
      kind: "exam",
      secondsRemaining: 900,
      hasNextQuestion: true,
    })).toMatchObject({ action: "challenge", forced: true, reason: "exam_hint_blocked" });
  });

  it("moves the reducer to the next question", () => {
    expect(nextConversationState(state, "move_on", "q-2")).toEqual({
      ...state,
      questionId: "q-2",
      depth: 0,
      completedQuestions: 1,
      turnCount: 3,
      lastAction: "move_on",
    });
  });

  it("tracks contradictions and new capability coverage", () => {
    const first = {
      claimId: "claim-1",
      normalizedClaim: "Promise callback всегда выполняется до setTimeout",
      sourceTurnId: "turn-1",
      confidence: 0.8,
      contradictedBy: [],
    };
    const second = {
      claimId: "claim-2",
      normalizedClaim: "Promise callback не выполняется до setTimeout",
      sourceTurnId: "turn-2",
      confidence: 0.8,
      contradictedBy: [],
    };

    expect(mergeInterviewClaims([first], [second]).contradictionCount).toBe(1);
    const next = nextConversationStateV3({
      state,
      action: "probe",
      nextQuestionId: null,
      answer: "Promise callback выполняется в очереди микрозадач после синхронного кода.",
      sourceTurnId: "turn-3",
      score: 85,
      capabilities: ["explain", "defend"],
      gaps: ["Не назван rendering step"],
    });
    expect(next.difficultyBand).toBe(3);
    expect(next.capabilityCoverage).toEqual(expect.arrayContaining([
      expect.objectContaining({ capability: "explain", observed: 1 }),
      expect.objectContaining({ capability: "defend", observed: 1 }),
    ]));
  });
});
