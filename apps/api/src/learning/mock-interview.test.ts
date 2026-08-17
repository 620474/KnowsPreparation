import { describe, expect, it } from "vitest";

import type { InterviewQuestion } from "./curriculum";
import {
  normalizeMockEvaluation,
  selectMockInterviewQuestions,
} from "./mock-interview";

const questions: InterviewQuestion[] = Array.from({ length: 8 }, (_, index) => ({
  id: `q-${index + 1}`,
  number: index + 1,
  category: index < 4 ? "JavaScript" : `Категория ${index}`,
  prompt: `Вопрос ${index + 1}`,
}));

describe("selectMockInterviewQuestions", () => {
  it("prioritizes weak questions and keeps categories diverse", () => {
    const progress = new Map([
      ["q-1", { status: "mastered" as const }],
      ["q-5", { status: "learning" as const, lapseCount: 2 }],
    ]);
    const selected = selectMockInterviewQuestions(questions, progress, 5, () => 0);

    expect(selected).toHaveLength(5);
    expect(selected[0]?.id).toBe("q-5");
    expect(new Set(selected.map((question) => question.category)).size).toBe(5);
  });

  it("normalizes an evaluation in the original question order", () => {
    const evaluation = normalizeMockEvaluation(
      {
        overallScore: 76.4,
        summary: "Хорошая база",
        strengths: ["Примеры"],
        weakTopics: ["Event loop"],
        questions: [
          {
            questionId: "q-2",
            score: 4,
            feedback: "Хорошо",
            missingPoints: [],
          },
          {
            questionId: "q-1",
            score: 3,
            feedback: "Добавь детали",
            missingPoints: ["Микрозадачи"],
          },
        ],
      },
      ["q-1", "q-2"],
    );

    expect(evaluation.overallScore).toBe(76);
    expect(evaluation.questions.map((question) => question.questionId)).toEqual(["q-1", "q-2"]);
  });
});
