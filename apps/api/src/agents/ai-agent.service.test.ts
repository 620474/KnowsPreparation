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

const researchProtocol = {
  subQuestions: "Какие стратегии сравниваем?",
  workingHypotheses: "Backoff устойчивее",
  alternativeHypotheses: "Фиксированная задержка не хуже",
  sourceHierarchy: "Первичные источники",
  inclusionCriteria: "Проверяемые результаты",
  exclusionCriteria: "Пересказы",
  stoppingRule: "Два независимых подтверждения",
  decisionChangeCriteria: "Воспроизводимое опровержение",
  ethicalConstraints: "",
  revisitDate: null,
};

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

  it("keeps only research evidence returned by web search", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      evidence: [{
        title: "Reconnect study",
        url: "https://example.com/study",
        sourceType: "Эксперимент",
        quality: "high",
        sourceKind: "primary",
        author: "Research team",
        publishedAt: "2026-08-01",
        originId: "study-1",
        independence: "independent",
        freshness: "current",
        notes: "Сравнение стратегий",
      }, {
        title: "Invented source",
        url: "https://invalid.example/invented",
        sourceType: "Статья",
        quality: "high",
        sourceKind: "primary",
        author: "Unknown",
        publishedAt: null,
        originId: "invented",
        independence: "independent",
        freshness: "current",
        notes: "Не должен сохраниться",
      }],
      summary: "Найден один подтверждённый источник",
      gaps: [],
    }, [{ title: "Reconnect study", url: "https://example.com/study" }]));

    const result = await createService().discoverResearchEvidence({
      project: {
        title: "Reconnect",
        decisionStatement: "Выбрать стратегию",
        primaryQuestion: "Что устойчивее?",
        scope: "WebSocket",
      },
      protocol: researchProtocol,
      searchQueries: ["reconnect backoff", "reconnect fixed delay"],
      mode: "discovery",
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({
      candidateId: "source-1",
      title: "Reconnect study",
      url: "https://example.com/study",
    });
  });

  it("drops claim links that do not exist in collected evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      claims: [{
        text: "Backoff снижает пиковую нагрузку",
        confidence: "moderate",
        evidenceLinks: [{
          url: "https://example.com/study",
          stance: "supports",
          excerpt: "Peak load decreased",
          locator: "Results",
          notes: "Прямое сравнение",
        }, {
          url: "https://invalid.example/invented",
          stance: "supports",
          excerpt: "Invented",
          locator: "Nowhere",
          notes: "Не должен сохраниться",
        }],
        alternativeExplanations: "Влияние jitter",
        uncertainty: "Один профиль отказов",
      }],
      summary: "Backoff предпочтителен",
      unresolvedGaps: [],
      stopReason: "Правило выполнено частично",
    }));
    const evidence = [{
      candidateId: "source-1",
      title: "Reconnect study",
      url: "https://example.com/study",
      sourceType: "Эксперимент",
      quality: "high" as const,
      sourceKind: "primary" as const,
      author: "Research team",
      publishedAt: "2026-08-01",
      accessedAt: "2026-09-02",
      originId: "study-1",
      independence: "independent" as const,
      freshness: "current" as const,
      notes: "Сравнение стратегий",
    }];

    const result = await createService().synthesizeResearch({
      project: {
        decisionStatement: "Выбрать стратегию",
        primaryQuestion: "Что устойчивее?",
        scope: "WebSocket",
      },
      protocol: researchProtocol,
      evidence,
      discoverySummary: "Найдено подтверждение",
      challengeSummary: "Сильных опровержений нет",
      gaps: [],
    });

    expect(result.claims[0]?.evidenceLinks).toEqual([expect.objectContaining({
      candidateId: "source-1",
    })]);
  });

  it("keeps citation audits only for real claim-evidence pairs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      audits: [{
        claimCandidateId: "claim-1",
        evidenceCandidateId: "source-1",
        verified: true,
        entailmentScore: 93,
        note: "Прямое подтверждение",
      }, {
        claimCandidateId: "claim-invented",
        evidenceCandidateId: "source-1",
        verified: true,
        entailmentScore: 100,
        note: "Не должно сохраниться",
      }],
      contradictions: [{
        claimA: "Backoff полезен",
        claimB: "Без jitter клиенты синхронизируются",
        explanation: "Вывод ограничен реализацией",
        status: "limited",
        impact: "Добавить jitter",
      }],
    }));

    const result = await createService().auditResearchClaims({
      type: "technical_topic",
      mode: "standard",
      claims: [{
        candidateId: "claim-1",
        text: "Backoff снижает пиковую нагрузку",
        confidence: "moderate",
        evidenceLinks: [{
          candidateId: "source-1",
          stance: "supports",
          excerpt: "Peak load decreased",
          locator: "Results",
          notes: "Прямое сравнение",
        }],
        alternativeExplanations: "Jitter",
        uncertainty: "Один профиль отказов",
      }],
      evidence: [{
        candidateId: "source-1",
        title: "Reconnect study",
        url: "https://example.com/study",
        sourceType: "Эксперимент",
        quality: "high",
        sourceKind: "primary",
        author: "Research team",
        publishedAt: "2026-08-01",
        accessedAt: "2026-09-02",
        originId: "study-1",
        independence: "independent",
        freshness: "current",
        notes: "Сравнение стратегий",
      }],
    });

    expect(result.audits).toHaveLength(1);
    expect(result.contradictions[0]).toMatchObject({
      candidateId: "contradiction-1",
      status: "limited",
    });
  });

  it("maps verified findings to typed product actions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond({
      actions: [{
        type: "CREATE_PRACTICE_TASK",
        title: "Сделать reconnect-задачу",
        reason: "Вывод нужно закрепить кодом",
        expectedOutcome: "Реализовать backoff без подсказки",
        priority: 1,
        payload: {
          details: "Добавить тесты jitter и максимальной задержки",
          targetId: null,
        },
      }],
    }));

    const result = await createService().mapResearchActions({
      type: "technical_topic",
      mode: "standard",
      decisionStatement: "Подготовиться к вопросу про WebSocket",
      summary: "Backoff с jitter устойчивее",
      claims: [],
      contradictions: [],
      unresolvedGaps: [],
    });

    expect(result[0]).toMatchObject({
      candidateId: "action-1",
      type: "CREATE_PRACTICE_TASK",
      priority: 1,
    });
  });
});
