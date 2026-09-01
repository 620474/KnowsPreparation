import { describe, expect, it } from "vitest";

import {
  adaptivePlanSchema,
  bootstrapContentSchema,
  bootstrapDataSchema,
  bootstrapProgressSchema,
  learningAnalyticsSchema,
  interviewSessionSchema,
  practiceSolutionSaveResultSchema,
  practiceAttemptSchema,
  studyExerciseRunnerSchema,
  trackKeySchema,
  TRACK_KEYS,
  createResearchProjectSchema,
  createCareerApplicationSchema,
  careerWorkspaceSchema,
  researchWorkspaceSchema,
  yandexPlatformMockAttemptSchema,
} from "./index";

describe("shared API contracts", () => {
  it("validates runnable exercises", () => {
    expect(studyExerciseRunnerSchema.parse({
      starterCode: "function solve() {}",
      testCases: [{ title: "case", expression: "solve()", expected: 1 }],
    }).testCases).toHaveLength(1);
  });

  it("rejects malformed practice revisions", () => {
    expect(() => practiceSolutionSaveResultSchema.parse({
      saved: true,
      progress: { revision: "one" },
    })).toThrow();
  });

  it("validates server-confirmed practice attempts", () => {
    expect(practiceAttemptSchema.parse({
      id: "attempt-1",
      track: "yandex",
      itemId: "task-1",
      source: "task",
      exerciseVersion: "task:1:hash",
      skillKeys: ["javascript"],
      solution: "function solve() { return 1; }",
      passed: true,
      passedCount: 1,
      totalCount: 1,
      durationMs: 12,
      error: null,
      tests: [{ title: "case", passed: true }],
      createdAt: "2026-08-18T10:00:00.000Z",
    }).passed).toBe(true);
  });

  it("accepts every learning track key", () => {
    expect(TRACK_KEYS).toEqual(["course", "curriculum", "yandex", "ozon"]);
    for (const key of TRACK_KEYS) {
      expect(trackKeySchema.parse(key)).toBe(key);
    }
    expect(() => trackKeySchema.parse("sprint")).toThrow();
  });

  it("requires progress records for all four tracks", () => {
    const quizProgress = bootstrapProgressSchema.shape.ai.shape.quizProgress;
    expect(Object.keys(quizProgress.shape)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
    ]);
    expect(() => quizProgress.parse({ course: {}, yandex: {}, ozon: {} })).toThrow();
    expect(
      quizProgress.parse({ course: {}, curriculum: {}, yandex: {}, ozon: {} }),
    ).toEqual({ course: {}, curriculum: {}, yandex: {}, ozon: {} });
  });

  it("merges content and progress into the full bootstrap shape", () => {
    const contentKeys = Object.keys(bootstrapContentSchema.shape);
    const progressKeys = Object.keys(bootstrapProgressSchema.shape);
    const dataKeys = Object.keys(bootstrapDataSchema.shape);
    expect(dataKeys).toEqual([...contentKeys, ...progressKeys]);
  });

  it("validates adaptive plans and measured analytics", () => {
    expect(adaptivePlanSchema.parse({
      date: "2026-08-18",
      budgetMinutes: 120,
      totalMinutes: 30,
      generatedAt: "2026-08-18T10:00:00.000Z",
      items: [{
        id: "practice-1",
        kind: "practice",
        title: "Практика",
        reason: "Последняя попытка не пройдена",
        minutes: 30,
        score: 100,
        skillKeys: ["javascript"],
        track: "yandex",
        itemId: "task-1",
        source: "task",
      }],
    }).items).toHaveLength(1);
    expect(learningAnalyticsSchema.parse({
      windowDays: 7,
      startedAt: null,
      totals: {
        activityCount: 0,
        practiceAttempts: 0,
        practicePassRate: null,
        quizAttempts: 0,
        quizAverage: null,
        reviews: 0,
        mocks: 0,
        mockAverage: null,
      },
      days: [],
      skills: [],
    }).windowDays).toBe(7);
  });

  it("validates complete interview simulator sessions", () => {
    const exercise = {
      id: "exercise-1",
      title: "Задача",
      statement: "Реши задачу",
      runner: {
        starterCode: "function solve() {}",
        testCases: [{ title: "case", expression: "solve()", expected: 1 }],
      },
      solution: "function solve() { return 1; }",
      result: null,
      attempts: 0,
    };
    expect(interviewSessionSchema.parse({
      id: "session-1",
      status: "in_progress",
      mode: "express",
      company: "yandex",
      currentStage: "platform",
      durationMinutes: 35,
      startedAt: "2026-08-18T10:00:00.000Z",
      completedAt: null,
      platformItems: [{
        question: { id: "q1", number: 1, category: "JS", prompt: "Что такое JS?" },
        answer: "",
        followUpQuestion: null,
        followUpAnswer: "",
      }],
      codingExercise: exercise,
      aiExercise: { ...exercise, id: "exercise-2" },
      aiMessages: [],
      defenseQuestions: [],
      defenseAnswers: [],
      evaluation: null,
    }).currentStage).toBe("platform");
  });

  it("keeps hidden Yandex mock answers nullable until reveal", () => {
    const attempt = yandexPlatformMockAttemptSchema.parse({
      id: "attempt-1",
      dayId: "yandex-d07",
      status: "in_progress",
      durationMinutes: 60,
      startedAt: "2026-08-24T00:00:00.000Z",
      completedAt: null,
      score: null,
      questions: [{
        id: "question-1",
        topic: "Scope",
        prompt: "Что выведется?",
        code: "console.log(value)",
        response: "",
        verdict: null,
        expectedAnswer: null,
        explanation: null,
      }],
    });
    expect(attempt.questions[0]?.expectedAnswer).toBeNull();
  });

  it("validates research projects and traceable claims", () => {
    const input = createResearchProjectSchema.parse({
      title: "Надёжность RAG",
      decisionStatement: "Выбрать конфигурацию retrieval",
      primaryQuestion: "Какая конфигурация устойчива к обновлению документации?",
      scope: "Русскоязычная техническая документация",
      design: "computational",
      status: "active",
      startDate: "2026-09-01",
      targetDate: "2026-10-01",
      nextAction: "Зафиксировать benchmark",
    });
    expect(input.design).toBe("computational");

    expect(researchWorkspaceSchema.parse({
      project: {
        ...input,
        projectId: "project-1",
        stages: [{ key: "decision", status: "complete", note: "" }],
        qualityGates: [{ key: "traceability", status: "pending", note: "" }],
        risks: [],
        milestones: [],
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
      evidence: [{
        evidenceId: "evidence-1",
        projectId: "project-1",
        title: "Benchmark",
        url: "",
        sourceType: "Эксперимент",
        stance: "supports",
        quality: "high",
        notes: "Независимый holdout",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      claims: [{
        claimId: "claim-1",
        projectId: "project-1",
        text: "Конфигурация A устойчивее baseline",
        status: "validated",
        confidence: "moderate",
        evidenceIds: ["evidence-1"],
        alternativeExplanations: "Различие корпуса",
        uncertainty: "Небольшая выборка",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
    }).claims[0]?.evidenceIds).toEqual(["evidence-1"]);
  });

  it("validates the career pipeline and weekly activity", () => {
    const application = createCareerApplicationSchema.parse({
      company: "Maps Company",
      role: "Frontend Engineer",
      url: "https://example.com/job",
      source: "Career page",
      description: "React, TypeScript и работа с realtime-интерфейсами.",
      priority: "high",
      stage: "technical",
      fitScore: 92,
      salary: "",
      workFormat: "remote",
      level: "Middle+",
      stack: ["React", "TypeScript"],
      recruiterName: "",
      recruiterContact: "",
      hiringManagerName: "",
      hiringManagerContact: "",
      publishedAt: "2026-09-01",
      appliedAt: "2026-09-02",
      followUpAt: "2026-09-08",
      nextAction: "Подготовить кейс про карты",
      rejectionReason: "",
      notes: "",
    });

    expect(careerWorkspaceSchema.parse({
      applications: [{
        ...application,
        applicationId: "application-1",
        interviews: [],
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      activities: [{
        activityId: "activity-1",
        applicationId: "application-1",
        type: "application",
        occurredAt: "2026-09-01T10:00:00.000Z",
        note: "Качественный отклик",
        createdAt: "2026-09-01T10:00:00.000Z",
      }],
      settings: {
        searchMode: "working",
        weeklyGoals: { applications: 8, outreach: 5, referrals: 2, interviews: 2 },
        strategyNotes: "",
        candidateProfile: "Frontend-разработчик с опытом React и TypeScript.",
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
    }).applications[0]?.fitScore).toBe(92);
  });
});
