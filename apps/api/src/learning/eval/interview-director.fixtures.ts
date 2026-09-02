import type { InterviewActionProposal, InterviewPolicyInput } from "../interview-director";

type ReplayFixture = {
  id: string;
  input: Omit<InterviewPolicyInput, "proposal">;
  proposal: InterviewActionProposal;
  expectedAction: InterviewActionProposal["action"];
  expectedForced: boolean;
};

const baseState = {
  questionId: "async-1",
  depth: 1,
  completedQuestions: 0,
  turnCount: 3,
  lastAction: "probe" as const,
  policyVersion: "interview-director-v1",
};

const proposal = (
  action: InterviewActionProposal["action"],
  prompt: string,
): InterviewActionProposal => ({
  action,
  prompt,
  nextQuestionId: action === "move_on" ? "react-1" : null,
  score: 72,
  confidence: "medium",
  strengths: ["Названо правило"],
  gaps: ["Не раскрыт компромисс"],
});

export const INTERVIEW_DIRECTOR_EVAL_VERSION = "interview-director-gold-v1";

export const INTERVIEW_DIRECTOR_REPLAY_FIXTURES: ReplayFixture[] = [
  {
    id: "safe-probe",
    input: { state: baseState, kind: "training", secondsRemaining: 800, hasNextQuestion: true },
    proposal: proposal("probe", "Почему microtask выполняется раньше timer?"),
    expectedAction: "probe",
    expectedForced: false,
  },
  {
    id: "depth-limit",
    input: { state: { ...baseState, depth: 5 }, kind: "training", secondsRemaining: 800, hasNextQuestion: true },
    proposal: proposal("counterexample", "Назови ещё один контрпример."),
    expectedAction: "move_on",
    expectedForced: true,
  },
  {
    id: "time-limit",
    input: { state: baseState, kind: "training", secondsRemaining: 45, hasNextQuestion: false },
    proposal: proposal("request_tradeoff", "Какие здесь компромиссы?"),
    expectedAction: "move_on",
    expectedForced: true,
  },
  {
    id: "exam-hint",
    input: { state: baseState, kind: "exam", secondsRemaining: 800, hasNextQuestion: true },
    proposal: proposal("probe", "Правильный ответ: используй Promise."),
    expectedAction: "challenge",
    expectedForced: true,
  },
  {
    id: "safe-move-on",
    input: { state: baseState, kind: "exam", secondsRemaining: 800, hasNextQuestion: true },
    proposal: proposal("move_on", "Перейдём дальше."),
    expectedAction: "move_on",
    expectedForced: false,
  },
];
