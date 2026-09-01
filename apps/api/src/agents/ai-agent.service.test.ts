import { ConfigService } from "@nestjs/config";
import type { AdaptivePlanItem } from "@prep/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GeneratedLesson } from "../learning/ai-course";
import { AiAgentService } from "./ai-agent.service";

const respond = (data: unknown, sources: Array<{ title: string; url: string }> = []) =>
  new Response(JSON.stringify({
    output: [
      { type: "web_search_call", action: { sources } },
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(data) }],
      },
    ],
  }), { status: 200, headers: { "Content-Type": "application/json" } });

const lesson = {
  goals: ["Понять очередь задач"],
  explanation: "Promise callbacks выполняются как microtasks.",
  codeExamples: [],
  commonMistakes: [],
  interviewQuestions: [],
  diagrams: [],
  practice: {
    title: "Очередь",
    statement: "Верни порядок",
    constraints: [],
    examples: [],
    runner: {
      starterCode: "function solve() {}",
      testCases: [
        { title: "1", expression: "solve()", expected: [1] },
        { title: "2", expression: "solve()", expected: [1] },
        { title: "3", expression: "solve()", expected: [1] },
      ],
    },
    referenceSolution: "function solve() { return [1]; }",
  },
  quiz: [],
  summary: "Итог",
} satisfies GeneratedLesson;

const candidate = (id: string, minutes: number): AdaptivePlanItem => ({
  id,
  kind: "practice",
  title: id,
  reason: "test",
  minutes,
  score: 80,
  skillKeys: ["javascript"],
  track: "yandex",
  itemId: id,
  source: "task",
});

describe("AiAgentService", () => {
  afterEach(() => vi.restoreAllMocks());

  const createService = () => new AiAgentService(new ConfigService({
    OPENAI_API_KEY: "test-key",
    OPENAI_AGENT_MODEL: "gpt-5.6-terra-test",
  }));

  it("keeps only official sources actually returned by web search", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      status: "verified",
      score: 94,
      issues: [],
      sources: [
        { title: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
        { title: "Invented", url: "https://example.com/invented" },
      ],
    }, [{
      title: "MDN",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    }]));

    const result = await createService().verifyLesson({
      track: "yandex",
      title: "Event loop",
      lesson,
    });

    expect(result.status).toBe("verified");
    expect(result.sources).toEqual([{
      title: "MDN",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    }]);
  });

  it("rejects unknown and over-budget ids from an AI day plan", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      orderedIds: ["unknown", "first", "second"],
      rationale: "Сначала короткая практика.",
    }));

    const result = await createService().orderAdaptivePlan({
      checkIn: {
        availableMinutes: 30,
        energy: "normal",
        focus: "yandex",
        note: "",
      },
      candidates: [candidate("first", 20), candidate("second", 20)],
    });

    expect(result.items.map((item) => item.id)).toEqual(["first"]);
  });

  it("normalizes vacancy analysis without allowing model metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      fitScore: 78,
      summary: "Хорошее совпадение по React.",
      matchedRequirements: ["React"],
      gaps: [{
        requirement: "WebSocket",
        severity: "high",
        action: "Сделать практику reconnect",
        skillKeys: ["browser"],
      }],
      likelyInterviewTopics: ["WebSocket reconnect"],
      resumeKeywords: ["React"],
      clarificationQuestions: ["Как устроен backend протокол?"],
      preparationActions: ["Повторить WebSocket API"],
      recommendedPriority: "high",
    }));

    const result = await createService().analyzeVacancy({
      company: "Company",
      role: "Frontend",
      description: "React и WebSocket",
      stack: ["React"],
      candidateProfile: "Работал с React",
    });

    expect(result.fitScore).toBe(78);
    expect(result.gaps[0]?.skillKeys).toEqual(["browser"]);
  });
});
