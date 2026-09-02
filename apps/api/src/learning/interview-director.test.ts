import { describe, expect, it } from "vitest";

import {
  INTERVIEW_POLICY_VERSION,
  nextConversationState,
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
});
