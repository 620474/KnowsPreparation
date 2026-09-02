import { describe, expect, it } from "vitest";

import { InterviewSessionService } from "./interview-session.service";

const createService = () => new InterviewSessionService(
  {} as never,
  {} as never,
  {} as never,
  { enabled: false } as never,
  { enabled: false } as never,
  {} as never,
  { get: () => "true" } as never,
);

describe("InterviewSessionService AI fallbacks", () => {
  it("marks an unavailable answer assessment as unassessed", async () => {
    const service = createService() as unknown as {
      assessAnswerOrFallback(input: unknown): Promise<{
        score: number | null;
        assessed: boolean;
        unavailableReason: string | null;
      }>;
    };

    const result = await service.assessAnswerOrFallback({
      followUpCount: 0,
      candidateQuestions: [],
    });

    expect(result).toMatchObject({
      score: null,
      assessed: false,
      unavailableReason: "ai_unavailable",
    });
  });

  it("does not create synthetic section scores when final AI evaluation is unavailable", async () => {
    const service = createService() as unknown as {
      evaluationOrFallback(interview: unknown): Promise<{
        platformScore: number | null;
        aiScore: number | null;
        communicationScore: number | null;
        assessed: boolean;
        weakTopics: string[];
      }>;
    };

    const result = await service.evaluationOrFallback({ platformItems: [] });

    expect(result).toMatchObject({
      platformScore: null,
      aiScore: null,
      communicationScore: null,
      assessed: false,
      weakTopics: [],
    });
    expect(Object.values(result)).not.toContain(55);
  });
});
