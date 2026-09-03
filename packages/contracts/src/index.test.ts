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
  researchAgentRunSchema,
  yandexPlatformMockAttemptSchema,
  assessmentResultV2Schema,
  knowledgeOverviewV2Schema,
  learningMissionSchema,
  questionAttemptResultSchema,
  checkpointPublicItemSchema,
  interviewOutcomeV4InputSchema,
  candidateStateV1Schema,
  exposureEventV2Schema,
  companyProfileV1Schema,
} from "./index";

describe("shared API contracts", () => {
  it("preserves evidence provenance in company profiles", () => {
    const profile = companyProfileV1Schema.parse({
      companyId: "avito",
      label: "Avito",
      summary: "Подтверждённый процесс",
      focusAreas: ["Programming"],
      interviewStages: ["Platform"],
      confidence: "high",
      sources: [{
        label: "Playbook",
        url: "https://github.com/avito-tech/playbook",
        kind: "engineering",
        reviewedAt: "2026-09-03T00:00:00.000Z",
        publishedAt: "2025-01-01",
        confidence: "high",
      }],
      version: "2.0.0",
    });

    expect(profile.sources[0]?.kind).toBe("engineering");
    expect(profile.sources[0]?.confidence).toBe("high");
  });

  it("validates append-only exposure events and candidate state", () => {
    expect(exposureEventV2Schema.parse({
      eventId: "event-1", operationId: "lease-1", schemaVersion: "2", targetId: "general",
      sessionId: "session-1", itemId: "q-01", leaseId: "lease-1", eventType: "viewed",
      conceptFamilyId: "event-loop", formFamilyId: "predict", contextFamilyId: "browser",
      contentHash: "hash", occurredAt: "2026-09-03T08:00:00.000Z",
    }).eventType).toBe("viewed");
    expect(candidateStateV1Schema.parse({
      version: "candidate-state-v1", targetId: "general", targetLabel: "Frontend", generatedAt: "2026-09-03T08:00:00.000Z",
      readiness: { status: "uncertain", learningMastery: 20, verifiedTransferReadiness: 10, verifiedCoverage: 5, blockers: [], capabilities: [] },
      evidence: { totalAssessments: 1, eligibleAssessments: 1, validAssessments: 1, latestAssessmentAt: "2026-09-03T08:00:00.000Z" },
      exposure: { totalEvents: 3, uniqueItemsViewed: 1, attempts: 1, answersRevealed: 1, repeatedItemCount: 0, latestExposureAt: "2026-09-03T08:00:00.000Z" },
      behavior: { averageConfidenceGap: 10, averageDurationMs: 1_000, averageRevisionCount: 1, interruptedAssessmentCount: 0 },
    }).exposure.totalEvents).toBe(3);
  });
  it("keeps checkpoint independence metadata private", () => {
    const item = checkpointPublicItemSchema.parse({
      itemId: "q-01", leaseId: "lease-1", leaseStartedAt: "2026-09-03T08:00:00.000Z",
      deadlineAt: "2026-09-03T08:03:00.000Z", assessmentKind: "predict_output", category: "JS",
      prompt: "Что выведет код?", capabilities: ["apply"], difficultyBand: 3, timeLimitMs: 180_000,
      exercise: { type: "predict_output", instructions: "Назови порядок", code: "console.log(1)", starterCode: null, choices: [], requiresExplanation: true },
    });
    expect(item).not.toHaveProperty("formId");
    expect(item).not.toHaveProperty("familyId");
  });

  it("validates structured real interview outcomes", () => {
    expect(interviewOutcomeV4InputSchema.parse({
      operationId: "outcome-1", snapshotId: "snapshot-1", company: "Example", role: "Frontend",
      stage: "technical", result: "failed", feedback: null, occurredAt: "2026-09-03T08:00:00.000Z",
      questions: [{ topic: "Event loop", skillIds: ["async.event-loop"], summary: "Перепутал очереди", selfResult: "partial" }],
    }).questions).toHaveLength(1);
  });

  it("keeps the submitted answer in question attempt results", () => {
    const result = questionAttemptResultSchema.parse({
      id: "attempt-1",
      questionId: "q-01",
      exerciseType: "predict_output",
      submittedAnswer: "A, B, C",
      submittedExplanation: "Сначала синхронный код.",
      passed: false,
      score: 0,
      feedback: ["Проверь порядок микрозадач."],
      expectedAnswer: "A, C, B",
      confidence: 70,
      calibrationGap: 70,
      progress: {
        status: "learning",
        note: "",
        easeFactor: 2.3,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: "2026-09-04T00:00:00.000Z",
        lastReviewedAt: "2026-09-03T00:00:00.000Z",
        reviewCount: 1,
        lapseCount: 1,
        lastRating: "again",
      },
      createdAt: "2026-09-03T00:00:00.000Z",
    });

    expect(result.submittedAnswer).toBe("A, B, C");
    expect(result.submittedExplanation).toBe("Сначала синхронный код.");
  });

  it("validates runnable exercises", () => {
    expect(studyExerciseRunnerSchema.parse({
      starterCode: "function solve() {}",
      testCases: [{ title: "case", expression: "solve()", expected: 1 }],
    }).testCases).toHaveLength(1);
  });

  it("validates native assessment and conservative mastery v2", () => {
    const assessment = assessmentResultV2Schema.parse({
      assessmentResultId: "assessment-1",
      operationId: "operation-1",
      schemaVersion: "2",
      ontologyVersion: "frontend-v1",
      source: {
        kind: "practice_attempt",
        entityId: "operation-1",
        itemId: "task-1",
        itemVersion: "2",
        itemFamilyId: "family-1",
        track: "yandex",
      },
      observations: [{
        criterionId: "runner-tests",
        rubricVersion: "runner-v2",
        skillId: "javascript.closures",
        capability: "code",
        score: 80,
        reliability: 1,
      }],
      transferLevel: "near_transfer",
      assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
      evaluator: {
        type: "deterministic",
        evaluatorVersion: "runner-v2",
        model: null,
        promptVersion: null,
        schemaVersion: "2",
      },
      occurredAt: "2026-09-02T10:00:00.000Z",
    });
    expect(assessment.observations[0]?.weight).toBe(1);

    expect(() => knowledgeOverviewV2Schema.parse({
      ontologyVersion: "frontend-v1",
      evidenceVersion: "2",
      masteryModelVersion: "evidence-native-v2",
      generatedAt: "2026-09-02T10:00:00.000Z",
      readiness: {},
      skills: [],
    })).toThrow();
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
    expect(TRACK_KEYS).toEqual(["course", "curriculum", "yandex", "ozon", "avito", "tbank"]);
    for (const key of TRACK_KEYS) {
      expect(trackKeySchema.parse(key)).toBe(key);
    }
    expect(() => trackKeySchema.parse("sprint")).toThrow();
  });

  it("requires progress records for every track", () => {
    const quizProgress = bootstrapProgressSchema.shape.ai.shape.quizProgress;
    expect(Object.keys(quizProgress.shape)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
      "avito",
      "tbank",
    ]);
    expect(() => quizProgress.parse({ course: {}, yandex: {}, ozon: {} })).toThrow();
    expect(
      quizProgress.parse({ course: {}, curriculum: {}, yandex: {}, ozon: {}, avito: {}, tbank: {} }),
    ).toEqual({ course: {}, curriculum: {}, yandex: {}, ozon: {}, avito: {}, tbank: {} });
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

  it("requires two independent checks in a learning mission", () => {
    const intervention = {
      id: "review-1",
      kind: "review",
      title: "Повторить event loop",
      reason: "Недостаточно evidence",
      minutes: 20,
      score: 100,
      skillKeys: ["async"],
      track: null,
      itemId: null,
      source: null,
    };
    const verification = {
      id: "transfer-1",
      familyId: "family-1",
      format: "prediction",
      title: "Порядок вывода",
      prompt: "Предскажи вывод",
      constraints: [],
      answerPlaceholder: "Ответ",
      expectedSeconds: 120,
    };
    const mission = learningMissionSchema.parse({
      missionId: "mission-1",
      targetId: "yandex",
      title: "Подтвердить event loop",
      reason: "Мало evidence",
      skillId: "async.event-loop",
      skillLabel: "Event loop",
      capability: "apply",
      status: "diagnosed",
      baseline: {
        estimate: null,
        lower: 0,
        upper: 100,
        evidenceCount: 0,
        capturedAt: "2026-09-02T10:00:00.000Z",
      },
      objective: { minimumScore: 70, minimumReliability: 0.65, maximumVerificationAttempts: 2 },
      intervention,
      verification,
      delayedVerification: { ...verification, id: "transfer-2", familyId: "family-2" },
      verificationAttempts: 0,
      verificationEvidenceIds: [],
      dueAt: null,
      deferredUntil: null,
      createdAt: "2026-09-02T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
      closedAt: null,
    });
    expect(mission.delayedVerification.familyId).not.toBe(mission.verification.familyId);
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
    const parsed = interviewSessionSchema.parse({
      id: "session-1",
      status: "in_progress",
      mode: "express",
      company: "yandex",
      currentStage: "platform",
      durationMinutes: 35,
      startedAt: "2026-08-18T10:00:00.000Z",
      deadlineAt: "2026-08-18T10:35:00.000Z",
      expiredAt: null,
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
    });
    expect(parsed.currentStage).toBe("platform");
    expect(parsed.kind).toBe("training");
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
    expect(input.protocol.stoppingRule).toBe("");

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
      metrics: {
        depth: 50,
        confidence: 50,
        impact: 50,
        coverage: 50,
        claimCoverage: 100,
        primarySourceRatio: 0,
        triangulation: 0,
        contradictionHandling: 100,
        traceability: 100,
        freshness: 25,
        warnings: [],
      },
    }).claims[0]?.evidenceIds).toEqual(["evidence-1"]);
  });

  it("validates autonomous research runs awaiting approval", () => {
    const run = researchAgentRunSchema.parse({
      runId: "run-1",
      projectId: "project-1",
      operationId: "operation-1",
      type: "technical_topic",
      mode: "standard",
      status: "review_ready",
      phase: "review",
      progress: 100,
      model: "gpt-5.6-sol",
      reviewModel: "gpt-5.6-terra",
      budget: {
        maximumModelCalls: 6,
        maximumSolCalls: 2,
        maximumSources: 16,
        maximumDurationMinutes: 30,
      },
      usage: {
        modelCalls: 6,
        solCalls: 2,
        sourcesDiscovered: 8,
        sourcesAccepted: 6,
        validatedClaims: 2,
      },
      draft: {
        protocol: {
          subQuestions: "Что измеряем?",
          workingHypotheses: "Подход работает",
          alternativeHypotheses: "Эффект случаен",
          sourceHierarchy: "Первичные источники",
          inclusionCriteria: "Проверяемые данные",
          exclusionCriteria: "Пересказы",
          stoppingRule: "Два независимых подтверждения",
          decisionChangeCriteria: "Сильное опровержение",
          ethicalConstraints: "",
          revisitDate: null,
        },
        evidence: [],
        claims: [],
        citationAudits: [],
        contradictions: [],
        actions: [],
        summary: "Черновик готов",
        unresolvedGaps: [],
        stopReason: "Stopping rule выполнен",
      },
      logs: [{
        phase: "review",
        message: "Черновик готов",
        at: "2026-09-02T10:00:00.000Z",
      }],
      error: null,
      appliedAt: null,
      startedAt: "2026-09-02T10:00:00.000Z",
      createdAt: "2026-09-02T10:00:00.000Z",
      updatedAt: "2026-09-02T10:01:00.000Z",
    });

    expect(run.status).toBe("review_ready");
    expect(run.configuration).toEqual({
      pipelineVersion: "legacy",
      promptVersion: "legacy",
      schemaVersion: "legacy",
      toolPolicyVersion: "legacy",
      modelCostClass: "sol",
      reviewModelCostClass: "standard",
    });
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
