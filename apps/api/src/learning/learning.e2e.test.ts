import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getConnectionToken, getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types, type Connection, type Model } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppController } from "../app.controller";
import { AuthModule } from "../auth/auth.module";
import { AiAgentService } from "../agents/ai-agent.service";
import { QUESTION_BANK, TASK_IDS } from "./curriculum";
import { AiContentService } from "./ai-content.service";
import type { GeneratedLesson } from "./ai-course";
import { getStaticRunnerValidationCases } from "./exercise-runners";
import { LearningModule } from "./learning.module";
import { ResearchAgentService } from "../research/research-agent.service";
import { AiLesson, type AiQuizQuestion } from "./schemas/ai-course.schema";
import { YandexPlatformMockAttempt } from "./schemas/yandex-platform-mock.schema";
import { EvidenceEvent } from "./schemas/evidence-event.schema";
import { AssessmentResultV2Entry } from "./schemas/assessment-result-v2.schema";
import { EvidenceEventV2Entry } from "./schemas/evidence-event-v2.schema";
import { MasterySnapshotV2Entry } from "./schemas/mastery-snapshot-v2.schema";
import { getStaticTrack } from "./track-registry";
import { YANDEX_SPRINT, YANDEX_SPRINT_AI_KEY, YANDEX_SPRINT_AI_VERSION } from "./yandex-sprint";
import { VerificationV9Service } from "./verification-v9.service";

const TEST_PASSWORD = "integration-test-password";
const QUIZ_CAPABILITIES = [
  "recall",
  "recall",
  "comprehension",
  "comprehension",
  "comprehension",
  "comprehension",
  "prediction",
  "prediction",
  "prediction",
  "prediction",
  "debugging",
  "debugging",
  "debugging",
  "application",
  "application",
  "application",
  "transfer",
  "transfer",
  "tradeoff",
  "tradeoff",
] as const;

const createGeneratedLesson = (explanation = "Исходное объяснение"): GeneratedLesson => ({
  goals: ["Понять сложение"],
  explanation,
  codeExamples: [],
  diagrams: [],
  commonMistakes: [],
  interviewQuestions: ["Как работает сложение?"],
  practice: {
    title: "Сумма",
    statement: "Верни сумму двух чисел",
    constraints: [],
    examples: [],
    runner: {
      starterCode: "function sum(left, right) {}",
      testCases: [
        { title: "Положительные", expression: "sum(2, 3)", expected: 5 },
        { title: "Нули", expression: "sum(0, 0)", expected: 0 },
        { title: "Отрицательные", expression: "sum(-2, -3)", expected: -5 },
      ],
      hiddenTestCases: [
        { title: "Большие числа", expression: "sum(1000, 2000)", expected: 3000 },
        { title: "Смешанные знаки", expression: "sum(-5, 8)", expected: 3 },
        { title: "Дроби", expression: "sum(1.5, 2.5)", expected: 4 },
      ],
    },
    referenceSolution: "function sum(left, right) { return left + right; }",
  },
  quiz: Array.from({ length: 20 }, (_, index) => ({
    id: `quiz-${String(index + 1).padStart(2, "0")}`,
    prompt: `Вопрос ${index + 1}`,
    options: ["A", "B", "C", `D${index}`],
    correctOptionIndex: index % 4,
    explanation: "Объяснение",
    topic: "JavaScript",
    tier: index < 10 ? "core" : "deep",
    capability: QUIZ_CAPABILITIES[index]!,
    ...(index < 8 ? { code: `const value = ${index};` } : {}),
  })),
  summary: "Итог",
});

describe("Learning API", () => {
  let app: INestApplication;
  let connection: Connection;
  let mongo: MongoMemoryServer;
  let lessonModel: Model<AiLesson>;
  let yandexMockAttemptModel: Model<YandexPlatformMockAttempt>;
  let evidenceEventModel: Model<EvidenceEvent>;
  let assessmentResultV2Model: Model<AssessmentResultV2Entry>;
  let evidenceEventV2Model: Model<EvidenceEventV2Entry>;
  let masterySnapshotV2Model: Model<MasterySnapshotV2Entry>;
  let token: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              APP_PASSWORD: TEST_PASSWORD,
              JWT_SECRET: "integration-test-secret-with-enough-entropy",
              OPENAI_API_KEY: "integration-openai-key",
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri()),
        AuthModule,
        LearningModule,
      ],
      controllers: [AppController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    lessonModel = app.get<Model<AiLesson>>(getModelToken(AiLesson.name));
    yandexMockAttemptModel = app.get<Model<YandexPlatformMockAttempt>>(
      getModelToken(YandexPlatformMockAttempt.name),
    );
    evidenceEventModel = app.get<Model<EvidenceEvent>>(getModelToken(EvidenceEvent.name));
    assessmentResultV2Model = app.get<Model<AssessmentResultV2Entry>>(
      getModelToken(AssessmentResultV2Entry.name),
    );
    evidenceEventV2Model = app.get<Model<EvidenceEventV2Entry>>(
      getModelToken(EvidenceEventV2Entry.name),
    );
    masterySnapshotV2Model = app.get<Model<MasterySnapshotV2Entry>>(
      getModelToken(MasterySnapshotV2Entry.name),
    );

    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ password: TEST_PASSWORD })
      .expect(201);
    token = loginResponse.body.token as string;
  }, 120_000);

  beforeEach(async () => {
    const collections = await connection.db?.collections();
    await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it("requires authentication and persists task progress", async () => {
    const taskId = [...TASK_IDS][0];
    if (!taskId) throw new Error("Curriculum must contain at least one task");

    await request(app.getHttpServer()).get("/api/v1/learning/bootstrap/progress").expect(401);

    await request(app.getHttpServer())
      .put(`/api/v1/learning/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true, note: "Проверено интеграционным тестом" })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          taskId,
          completed: true,
          note: "Проверено интеграционным тестом",
        });
      });

    const bootstrapResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(bootstrapResponse.body.progress.tasks[taskId]).toMatchObject({
      completed: true,
      note: "Проверено интеграционным тестом",
    });
  });

  it("serves v8 targets, verified mastery, decisions and readiness snapshots on API v2", async () => {
    const targets = await request(app.getHttpServer())
      .get("/api/v2/learning/targets")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(targets.body.map((item: { targetId: string }) => item.targetId))
      .toEqual(expect.arrayContaining(["general", "yandex", "ozon"]));

    const custom = await request(app.getHttpServer())
      .post("/api/v2/learning/targets/from-vacancy")
      .set("Authorization", `Bearer ${token}`)
      .send({
        company: "Realtime Corp",
        role: "Frontend Developer",
        vacancyText: "React, TypeScript, WebSocket reconnect и тестирование",
      })
      .expect(201);
    expect(custom.body.requirements.map((item: { skillId: string }) => item.skillId))
      .toContain("async.realtime");

    const overview = await request(app.getHttpServer())
      .get(`/api/v2/learning/knowledge/overview?targetId=${custom.body.targetId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(overview.body).toMatchObject({
      evidenceVersion: "3",
      masteryModelVersion: "verified-posterior-v3",
      readinessModelVersion: "verified-readiness-v8",
      readiness: { decision: expect.any(String) },
    });

    const decision = await request(app.getHttpServer())
      .get(`/api/v2/learning/decision/today?targetId=${custom.body.targetId}&availableMinutes=60`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(decision.body.actions.length).toBeLessThanOrEqual(3);

    const snapshot = await request(app.getHttpServer())
      .post("/api/v2/learning/readiness/snapshots")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId: custom.body.targetId })
      .expect(201);
    expect(snapshot.body).toMatchObject({
      targetId: custom.body.targetId,
      readiness: { targetId: custom.body.targetId },
    });

    await request(app.getHttpServer())
      .post("/api/v2/learning/readiness/outcomes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        snapshotId: snapshot.body.snapshotId,
        technicalPassed: true,
        codingPassed: true,
        occurredAt: "2026-09-03T00:00:00.000Z",
      })
      .expect(201);

    const calibration = await request(app.getHttpServer())
      .get(`/api/v2/learning/readiness/calibration?targetId=${custom.body.targetId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(calibration.body).toMatchObject({
      forecast: { status: "insufficient_outcomes", outcomeCount: 1 },
    });

    const observability = await request(app.getHttpServer())
      .get("/api/v2/learning/ai/observability?days=30")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(observability.body).toMatchObject({ windowDays: 30, totalCalls: 0 });
  });

  it("runs a server-authoritative v9 checkpoint without leaking future items", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v3/learning/checkpoints")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId: "general", availableMinutes: 6 })
      .expect(201);
    expect(created.body).toMatchObject({ status: "active", totalItems: 2, completedItems: 0, currentItem: null });
    expect(created.body.reservedItemIds).toBeUndefined();

    const first = await request(app.getHttpServer())
      .post(`/api/v3/learning/checkpoints/${created.body.sessionId}/next`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(first.body.currentItem).toMatchObject({ itemId: "q-01" });
    expect(first.body.currentItem.leaseId).toEqual(expect.any(String));
    expect(first.body.currentItem.expectedAnswer).toBeUndefined();
    expect(first.body.currentItem.exercise.runner).toBeUndefined();
    expect(JSON.stringify(first.body.currentItem)).not.toMatch(/correctIndex|referenceSolution|testCases|referencePoints/);

    const attempt = await request(app.getHttpServer())
      .post(`/api/v3/learning/checkpoints/${created.body.sessionId}/attempts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        leaseId: first.body.currentItem.leaseId,
        operationId: "checkpoint-v9-attempt-1",
        answer: "A,G,C,F,D,E,B",
        explanation: "Сначала sync, затем очередь микрозадач и timer.",
        confidenceBefore: 80,
        confidenceAfter: 90,
        durationMs: 45_000,
        deviceClass: "desktop",
      })
      .expect(201);
    expect(attempt.body).toMatchObject({ passed: true, score: 100, verificationEligibility: "eligible" });

    const readiness = await request(app.getHttpServer())
      .get("/api/v3/learning/readiness?targetId=general")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(readiness.body).toMatchObject({ version: "verified-transfer-v2", targetId: "general", status: "not_ready" });
    expect(readiness.body.capabilities.some((item: { eligibleEvidenceCount: number }) => item.eligibleEvidenceCount > 0)).toBe(true);

    const retry = await request(app.getHttpServer())
      .post(`/api/v3/learning/checkpoints/${created.body.sessionId}/attempts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        leaseId: first.body.currentItem.leaseId,
        operationId: "checkpoint-v9-attempt-1",
        answer: "A,G,C,F,D,E,B",
        confidenceBefore: 80,
        confidenceAfter: 90,
        durationMs: 99_000,
      })
      .expect(201);
    expect(retry.body).toEqual(attempt.body);

    const decision = await request(app.getHttpServer())
      .get("/api/v3/learning/decision/today?targetId=general&availableMinutes=60")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(decision.body.actions.length).toBeLessThanOrEqual(2);

    const snapshot = await request(app.getHttpServer())
      .post("/api/v3/learning/readiness/snapshots")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId: "general" })
      .expect(201);
    const outcome = await request(app.getHttpServer())
      .post("/api/v3/learning/interview-outcomes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        operationId: "interview-outcome-v4-1", snapshotId: snapshot.body.snapshotId,
        company: "Example", role: "Frontend Developer", stage: "technical", result: "failed",
        questions: [{ topic: "Event loop", skillIds: ["async.event-loop.ordering"], summary: "Ошибся в порядке очередей", selfResult: "partial" }],
        feedback: "Повторить микрозадачи", occurredAt: "2026-09-03T08:00:00.000Z",
      })
      .expect(201);
    expect(outcome.body).toMatchObject({ targetId: "general", stage: "technical", result: "failed" });
    const outcomes = await request(app.getHttpServer())
      .get("/api/v3/learning/interview-outcomes?targetId=general")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(outcomes.body.some((item: { operationId: string }) => item.operationId === "interview-outcome-v4-1")).toBe(true);
  });

  it("leases exactly one item under concurrent checkpoint requests", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v3/learning/checkpoints")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId: "general", availableMinutes: 6 })
      .expect(201);
    const verification = app.get(VerificationV9Service);
    const responses = await Promise.all(Array.from({ length: 20 }, () => verification.nextItem(created.body.sessionId)));
    expect(new Set(responses.map((response) => response.currentItem?.leaseId)).size).toBe(1);
    expect(new Set(responses.map((response) => response.currentItem?.itemId)).size).toBe(1);
  });

  it("stores only the Terra-reviewed lesson and its metadata", async () => {
    const track = getStaticTrack("yandex");
    const itemId = track.days[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!itemId) throw new Error("Yandex track must contain a lesson-capable block");
    const aiContent = app.get(AiContentService);
    const draft = createGeneratedLesson();
    const corrected = createGeneratedLesson("Исправленное объяснение");
    const generationSpy = vi
      .spyOn(aiContent, "generateTrackLesson")
      .mockResolvedValue(draft);
    const reviewSpy = vi
      .spyOn(aiContent, "reviewGeneratedLesson")
      .mockResolvedValue({
        verdict: "revised",
        score: 91,
        issues: [{
          severity: "warning",
          category: "clarity",
          message: "Уточнена формулировка",
        }],
        correctedLesson: corrected,
      });

    try {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/learning/tracks/yandex/items/${itemId}/lesson`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(response.body).toMatchObject({
        explanation: "Исправленное объяснение",
        generationModel: "gpt-5.6-sol",
        reviewModel: "gpt-5.6-terra",
        reviewStatus: "revised",
        reviewScore: 91,
        reviewIssues: [{ category: "clarity" }],
      });
      expect(response.body.practice).not.toHaveProperty("referenceSolution");
      expect(response.body.practice.runner).not.toHaveProperty("hiddenTestCases");
      expect(response.body.quiz).toHaveLength(20);
      expect(response.body.quiz[0]).not.toHaveProperty("correctOptionIndex");
      expect(response.body.quiz[0]).not.toHaveProperty("explanation");
      expect(reviewSpy).toHaveBeenCalledWith(
        expect.objectContaining({ track: "yandex" }),
        draft,
        undefined,
      );
    } finally {
      generationSpy.mockRestore();
      reviewSpy.mockRestore();
    }
  });

  it("regenerates when the Terra-corrected runner fails validation", async () => {
    const track = getStaticTrack("yandex");
    const itemId = track.days[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!itemId) throw new Error("Yandex track must contain a lesson-capable block");
    const aiContent = app.get(AiContentService);
    const draft = createGeneratedLesson();
    const invalidCorrection = createGeneratedLesson("Некорректное исправление");
    invalidCorrection.practice.referenceSolution =
      "function sum(left, right) { return left - right; }";
    const generationSpy = vi
      .spyOn(aiContent, "generateTrackLesson")
      .mockResolvedValue(draft);
    const reviewSpy = vi
      .spyOn(aiContent, "reviewGeneratedLesson")
      .mockResolvedValueOnce({
        verdict: "revised",
        score: 75,
        issues: [{
          severity: "warning",
          category: "clarity",
          message: "Попытка исправления",
        }],
        correctedLesson: invalidCorrection,
      })
      .mockResolvedValueOnce({
        verdict: "approved",
        score: 95,
        issues: [],
        correctedLesson: null,
      });

    try {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/learning/tracks/yandex/items/${itemId}/lesson`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(generationSpy).toHaveBeenCalledTimes(2);
      expect(reviewSpy).toHaveBeenCalledTimes(2);
      expect(response.body).toMatchObject({
        explanation: "Исходное объяснение",
        reviewStatus: "approved",
        reviewScore: 95,
      });
    } finally {
      generationSpy.mockRestore();
      reviewSpy.mockRestore();
    }
  });

  it("keeps the previous lesson when Terra rejects every generated version", async () => {
    const track = getStaticTrack("yandex");
    const itemId = track.days[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!itemId) throw new Error("Yandex track must contain a lesson-capable block");
    await lessonModel.create({
      courseKey: track.courseKey,
      courseVersion: track.courseVersion,
      itemId,
      title: "Существующий урок",
      goals: [],
      explanation: "Не перезаписывать",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Условие",
        constraints: [],
        examples: [],
      },
      quiz: [],
      summary: "Итог",
      resourceIds: [],
      version: 1,
      generatedAt: new Date().toISOString(),
    });
    const aiContent = app.get(AiContentService);
    const generationSpy = vi
      .spyOn(aiContent, "generateTrackLesson")
      .mockResolvedValue(createGeneratedLesson());
    const reviewSpy = vi
      .spyOn(aiContent, "reviewGeneratedLesson")
      .mockResolvedValue({
        verdict: "rejected",
        score: 30,
        issues: [{
          severity: "critical",
          category: "logic",
          message: "Материал требует полной переработки",
        }],
        correctedLesson: null,
      });

    try {
      await request(app.getHttpServer())
        .post(`/api/v1/learning/tracks/yandex/items/${itemId}/lesson`)
        .set("Authorization", `Bearer ${token}`)
        .expect(502);

      expect(reviewSpy).toHaveBeenCalledTimes(3);
      const stored = await lessonModel.findOne({ itemId }).lean().exec();
      expect(stored).toMatchObject({
        explanation: "Не перезаписывать",
        version: 1,
      });
    } finally {
      generationSpy.mockRestore();
      reviewSpy.mockRestore();
    }
  });

  it("serves cacheable content and dynamic progress separately", async () => {
    const contentResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/content")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(contentResponse.headers.etag).toMatch(/^"[\w-]+"$/);
    expect(contentResponse.headers["cache-control"]).toContain("max-age=300");
    expect(contentResponse.body).toHaveProperty("contentVersion");
    expect(contentResponse.body).toHaveProperty("curriculum");
    expect(contentResponse.body).not.toHaveProperty("progress");

    const progressResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(progressResponse.headers["cache-control"]).toContain("no-store");
    expect(progressResponse.body).toHaveProperty("progress");
    expect(progressResponse.body).toHaveProperty("settings");
    expect(progressResponse.body).not.toHaveProperty("curriculum");
    expect(Object.keys(progressResponse.body.ai.lessons)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
      "avito",
      "tbank",
    ]);
    expect(Object.keys(progressResponse.body.ai.quizProgress)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
      "avito",
      "tbank",
    ]);

    await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("tracks a research project from protocol to traceable claim", async () => {
    const projectResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/research/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Надёжность RAG",
          decisionStatement: "Выбрать retrieval-конфигурацию",
          primaryQuestion: "Какая конфигурация устойчивее?",
          scope: "Русскоязычная документация",
          design: "computational",
          status: "active",
          startDate: "2026-09-01",
          targetDate: "2026-10-01",
          nextAction: "Зафиксировать benchmark",
          protocol: {
            subQuestions: "Какие метрики устойчивости важны?",
            workingHypotheses: "A устойчивее B",
            alternativeHypotheses: "Разницы нет",
            sourceHierarchy: "Первичные эксперименты прежде обзоров",
            inclusionCriteria: "Locked holdout",
            exclusionCriteria: "Training corpus",
            stoppingRule: "Два независимых эксперимента",
            decisionChangeCriteria: "Воспроизводимый обратный результат",
            ethicalConstraints: "",
            revisitDate: null,
          },
        },
      })
      .expect(201);
    const projectId = projectResponse.body.projectId as string;
    expect(projectResponse.body.stages).toHaveLength(12);
    expect(projectResponse.body.qualityGates).toHaveLength(10);

    const evidenceResponse = await request(app.getHttpServer())
      .post(`/api/v1/learning/research/projects/${projectId}/evidence`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Locked benchmark",
          url: "",
          sourceType: "Вычислительный эксперимент",
          stance: "supports",
          quality: "high",
          notes: "Holdout не использован при настройке",
          sourceKind: "primary",
          author: "Benchmark team",
          publishedAt: "2026-08-25",
          accessedAt: "2026-09-01",
          originId: "locked-benchmark-v1",
          independence: "independent",
          freshness: "current",
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/learning/research/projects/${projectId}/claims`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          text: "Конфигурация A устойчивее baseline",
          status: "validated",
          confidence: "moderate",
          evidenceIds: [],
          evidenceLinks: [{
            evidenceId: evidenceResponse.body.evidenceId,
            stance: "supports",
            excerpt: "A beats baseline",
            locator: "Table 1",
            notes: "Прямое сравнение",
          }],
          alternativeExplanations: "Различие corpus mix",
          uncertainty: "Один домен документации",
        },
      })
      .expect(201);

    const workspace = await request(app.getHttpServer())
      .get(`/api/v1/learning/research/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(workspace.body.evidence).toHaveLength(1);
    expect(workspace.body.claims[0].evidenceLinks[0]).toEqual(
      expect.objectContaining({
        evidenceId: evidenceResponse.body.evidenceId,
        stance: "supports",
      }),
    );
    expect(workspace.body.metrics.claimCoverage).toBe(100);
    expect(workspace.body.metrics.primarySourceRatio).toBe(100);

    const backup = await request(app.getHttpServer())
      .get("/api/v1/learning/backup")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(backup.body.data.researchProjects).toHaveLength(1);
    expect(backup.body.data.researchEvidence).toHaveLength(1);
    expect(backup.body.data.researchClaims).toHaveLength(1);
  });

  it("runs autonomous research idempotently and applies only approved results", async () => {
    const projectResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/research/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Надёжность WebSocket reconnect",
          decisionStatement: "Выбрать стратегию переподключения",
          primaryQuestion: "Какая стратегия reconnect устойчивее?",
          scope: "React-клиент и браузерный WebSocket API",
          design: "mixed_methods",
          status: "active",
          startDate: "2026-09-02",
          targetDate: null,
          nextAction: "Запустить автономное исследование",
        },
      })
      .expect(201);
    const projectId = projectResponse.body.projectId as string;
    const agents = app.get(AiAgentService);
    const protocol = {
      subQuestions: "Как обнаруживать обрыв?",
      workingHypotheses: "Exponential backoff снижает нагрузку",
      alternativeHypotheses: "Фиксированная задержка достаточно надёжна",
      sourceHierarchy: "Стандарты и первичная документация",
      inclusionCriteria: "Проверяемое описание поведения",
      exclusionCriteria: "Неподтверждённые пересказы",
      stoppingRule: "Два независимых источника и проверка альтернативы",
      decisionChangeCriteria: "Опровержение преимущества backoff",
      ethicalConstraints: "",
      revisitDate: null,
    };
    const source = {
      candidateId: "temporary",
      title: "WebSocket reconnect study",
      url: "https://example.com/reconnect-study",
      sourceType: "Эксперимент",
      quality: "high" as const,
      sourceKind: "primary" as const,
      author: "Research team",
      publishedAt: "2026-08-01",
      accessedAt: "2026-09-02",
      originId: "reconnect-study-v1",
      independence: "independent" as const,
      freshness: "current" as const,
      notes: "Сравнение стратегий на одинаковом профиле отказов",
    };
    const planSpy = vi.spyOn(agents, "planResearch").mockResolvedValue({
      protocol,
      searchQueries: ["websocket reconnect backoff", "websocket reconnect fixed delay"],
    });
    const discoverySpy = vi.spyOn(agents, "discoverResearchEvidence")
      .mockRejectedValueOnce(new Error("temporary discovery failure"))
      .mockResolvedValueOnce({ evidence: [source], summary: "Backoff выглядит устойчивее", gaps: [] })
      .mockResolvedValueOnce({ evidence: [], summary: "Сильных опровержений нет", gaps: [] });
    const synthesisSpy = vi.spyOn(agents, "synthesizeResearch").mockResolvedValue({
      claims: [{
        candidateId: "claim-1",
        text: "Exponential backoff снижает пиковую нагрузку при массовом reconnect",
        confidence: "moderate",
        evidenceLinks: [{
          candidateId: "source-1",
          stance: "supports",
          excerpt: "Peak reconnect load decreased",
          locator: "Results",
          notes: "Прямое сравнение",
        }],
        alternativeExplanations: "Результат зависит от jitter",
        uncertainty: "Один профиль отказов",
      }],
      summary: "Backoff предпочтителен с jitter и верхним пределом задержки.",
      unresolvedGaps: [],
      stopReason: "Правило остановки выполнено частично",
    });
    const auditSpy = vi.spyOn(agents, "auditResearchClaims").mockResolvedValue({
      audits: [{
        claimCandidateId: "claim-1",
        evidenceCandidateId: "source-1",
        verified: true,
        entailmentScore: 92,
        note: "Источник прямо подтверждает снижение пиковой нагрузки",
      }],
      contradictions: [{
        candidateId: "contradiction-1",
        claimA: "Backoff снижает нагрузку",
        claimB: "Без jitter возможна синхронизация клиентов",
        explanation: "Вывод зависит от реализации jitter",
        status: "limited",
        impact: "Добавить jitter в рекомендацию",
      }],
    });
    const actionsSpy = vi.spyOn(agents, "mapResearchActions").mockResolvedValue([{
      candidateId: "action-1",
      type: "CREATE_PRACTICE_TASK",
      title: "Реализовать reconnect с jitter",
      reason: "Это главный практически проверяемый вывод",
      expectedOutcome: "Уметь объяснить и реализовать устойчивое переподключение",
      priority: 1,
      payload: {
        details: "Написать WebSocket-клиент с backoff, jitter и верхней границей",
        targetId: null,
      },
    }]);

    try {
      const operationId = "research-operation-1";
      const started = await request(app.getHttpServer())
        .post(`/api/v1/learning/research/projects/${projectId}/agent-runs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ data: { operationId, type: "technical_topic", mode: "standard" } })
        .expect(201);
      const duplicate = await request(app.getHttpServer())
        .post(`/api/v1/learning/research/projects/${projectId}/agent-runs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ data: { operationId, type: "technical_topic", mode: "standard" } })
        .expect(201);
      expect(duplicate.body.runId).toBe(started.body.runId);

      let run = started.body;
      for (let attempt = 0; attempt < 40 && run.status !== "review_ready"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        run = (
          await request(app.getHttpServer())
            .get(`/api/v1/learning/research/projects/${projectId}/agent-runs/latest`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200)
        ).body;
      }
      expect(run.status).toBe("review_ready");
      expect(run.configuration).toEqual({
        pipelineVersion: "research-pipeline-v2",
        promptVersion: "research-prompts-v2",
        schemaVersion: "research-schema-v2",
        toolPolicyVersion: "untrusted-sources-v1",
        modelCostClass: "sol",
        reviewModelCostClass: "standard",
      });
      expect(run.draft.evidence).toHaveLength(1);
      expect(run.draft.claims).toHaveLength(1);
      expect(run.draft.citationAudits[0]).toMatchObject({ verified: true });
      expect(run.draft.contradictions).toHaveLength(1);
      expect(run.draft.actions).toHaveLength(1);
      expect(run.usage).toMatchObject({ modelCalls: 7, validatedClaims: 1 });
      expect(run.logs).toContainEqual(expect.objectContaining({
        message: "Временная ошибка AI; повторяю текущий шаг один раз",
      }));

      const projectCollection = connection.db?.collection("researchprojects");
      const storedProject = await projectCollection?.findOne({ projectId });
      const originalUpdatedAt = storedProject?.updatedAt;
      if (!(originalUpdatedAt instanceof Date)) {
        throw new Error("Research project updatedAt is missing");
      }
      await projectCollection?.updateOne(
        { projectId },
        { $set: { updatedAt: new Date(originalUpdatedAt.getTime() + 1_000) } },
      );
      await request(app.getHttpServer())
        .post(`/api/v1/learning/research/projects/${projectId}/agent-runs/${run.runId}/apply`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          data: {
            operationId: "research-stale-apply-operation",
            includeProtocol: true,
            evidenceCandidateIds: ["source-1"],
            claimCandidateIds: ["claim-1"],
            actionCandidateIds: ["action-1"],
          },
        })
        .expect(409);
      await projectCollection?.updateOne(
        { projectId },
        { $set: { updatedAt: originalUpdatedAt } },
      );

      const applied = await request(app.getHttpServer())
        .post(`/api/v1/learning/research/projects/${projectId}/agent-runs/${run.runId}/apply`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          data: {
            operationId: "research-apply-operation-1",
            includeProtocol: true,
            evidenceCandidateIds: ["source-1"],
            claimCandidateIds: ["claim-1"],
            actionCandidateIds: ["action-1"],
          },
        })
        .expect(201);
      expect(applied.body.project.protocol.stoppingRule).toContain("независимых");
      expect(applied.body.evidence).toHaveLength(1);
      expect(applied.body.claims[0].evidenceLinks[0].evidenceId).toBe(
        applied.body.evidence[0].evidenceId,
      );
      expect(applied.body.claims[0].evidenceLinks[0]).toMatchObject({
        verified: true,
        entailmentScore: 92,
      });
      expect(applied.body.actions[0]).toMatchObject({
        type: "CREATE_PRACTICE_TASK",
        status: "approved",
      });

      const backup = await request(app.getHttpServer())
        .get("/api/v1/learning/backup")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(backup.body.data.researchAgentRuns).toHaveLength(1);
      expect(backup.body.data.researchActions).toHaveLength(1);
    } finally {
      planSpy.mockRestore();
      discoverySpy.mockRestore();
      synthesisSpy.mockRestore();
      auditSpy.mockRestore();
      actionsSpy.mockRestore();
    }
  });

  it("allows only one active autonomous run per project under a race", async () => {
    const project = await request(app.getHttpServer())
      .post("/api/v1/learning/research/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Параллельный запуск",
          decisionStatement: "Проверить блокировку",
          primaryQuestion: "Может ли стартовать два агента?",
          scope: "Один проект",
          design: "computational",
          status: "active",
          startDate: "2026-09-02",
          targetDate: null,
          nextAction: "Запустить",
        },
      })
      .expect(201);
    const service = app.get(ResearchAgentService);
    const results = await Promise.allSettled([
      service.startRun(project.body.projectId, {
        operationId: "race-operation-a",
        type: "technical_topic",
        mode: "quick",
      }),
      service.startRun(project.body.projectId, {
        operationId: "race-operation-b",
        type: "technical_topic",
        mode: "quick",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find((result) => result.status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ status: 409 }),
    });
    const started = results.find((result) => result.status === "fulfilled");
    if (started?.status === "fulfilled") {
      await service.cancelRun(project.body.projectId, started.value.runId);
    }
  });

  it("does not write later phases after an autonomous run is cancelled", async () => {
    const project = await request(app.getHttpServer())
      .post("/api/v1/learning/research/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Отмена запуска",
          decisionStatement: "Проверить отмену",
          primaryQuestion: "Остановится ли агент?",
          scope: "Один запуск",
          design: "computational",
          status: "active",
          startDate: "2026-09-02",
          targetDate: null,
          nextAction: "Запустить и отменить",
        },
      })
      .expect(201);
    const service = app.get(ResearchAgentService);
    const agents = app.get(AiAgentService);
    let markPlanStarted: () => void = () => {};
    const planStarted = new Promise<void>((resolve) => {
      markPlanStarted = resolve;
    });
    const planSpy = vi.spyOn(agents, "planResearch").mockImplementation(
      (_input, signal) => new Promise((_, reject) => {
        markPlanStarted();
        signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
      }),
    );

    try {
      const run = await service.startRun(project.body.projectId, {
        operationId: "cancel-research-operation",
        type: "technical_topic",
        mode: "quick",
      });
      await planStarted;
      const cancelled = await service.cancelRun(project.body.projectId, run.runId);
      expect(cancelled.status).toBe("cancelled");
      await new Promise((resolve) => setTimeout(resolve, 20));
      const stored = await service.getRun(project.body.projectId, run.runId);
      expect(stored).toMatchObject({
        status: "cancelled",
        phase: "complete",
        progress: 0,
      });
      expect(stored.draft.evidence).toHaveLength(0);
      expect(stored.draft.claims).toHaveLength(0);
    } finally {
      planSpy.mockRestore();
    }
  });

  it("stops autonomous research when its model-call budget is exhausted", async () => {
    const projectResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/research/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          title: "Бюджетный запуск",
          decisionStatement: "Проверить circuit breaker",
          primaryQuestion: "Остановится ли агент?",
          scope: "Один AI-вызов",
          design: "computational",
          status: "active",
          startDate: "2026-09-02",
          targetDate: null,
          nextAction: "Запустить",
        },
      })
      .expect(201);
    const projectId = projectResponse.body.projectId as string;
    const agents = app.get(AiAgentService);
    const planSpy = vi.spyOn(agents, "planResearch").mockResolvedValue({
      protocol: {
        subQuestions: "Что происходит после первого шага?",
        workingHypotheses: "Запуск остановится",
        alternativeHypotheses: "Запуск продолжится",
        sourceHierarchy: "Не требуется",
        inclusionCriteria: "События запуска",
        exclusionCriteria: "Внешние источники",
        stoppingRule: "Лимит исчерпан",
        decisionChangeCriteria: "Второй вызов выполнен",
        ethicalConstraints: "",
        revisitDate: null,
      },
      searchQueries: ["budget one", "budget two"],
    });
    const discoverySpy = vi.spyOn(agents, "discoverResearchEvidence");

    try {
      let run = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/research/projects/${projectId}/agent-runs`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: {
              operationId: "research-budget-operation",
              type: "technical_topic",
              mode: "quick",
              budget: { maximumModelCalls: 1 },
            },
          })
          .expect(201)
      ).body;
      for (let attempt = 0; attempt < 40 && run.status === "queued"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        run = (
          await request(app.getHttpServer())
            .get(`/api/v1/learning/research/projects/${projectId}/agent-runs/latest`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200)
        ).body;
      }
      for (let attempt = 0; attempt < 40 && run.status === "running"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        run = (
          await request(app.getHttpServer())
            .get(`/api/v1/learning/research/projects/${projectId}/agent-runs/latest`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200)
        ).body;
      }

      expect(run).toMatchObject({
        status: "partially_completed",
        phase: "review",
        usage: { modelCalls: 1, solCalls: 0 },
      });
      expect(run.error).toContain("лимит AI-вызовов");
      expect(discoverySpy).not.toHaveBeenCalled();
    } finally {
      planSpy.mockRestore();
      discoverySpy.mockRestore();
    }
  });

  it("tracks job applications, interviews, weekly activity, and backup", async () => {
    const applicationResponse = await request(app.getHttpServer())
      .post("/api/v1/career/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          company: "Maps Company",
          role: "Frontend Engineer",
          url: "https://example.com/job",
          source: "Career page",
          description: "React, TypeScript, WebSocket и realtime-интерфейсы.",
          priority: "high",
          stage: "applied",
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
          appliedAt: "2026-09-01",
          followUpAt: "2026-09-08",
          nextAction: "Подготовить кейс про карты",
          rejectionReason: "",
          notes: "",
        },
      })
      .expect(201);
    const applicationId = applicationResponse.body.applicationId as string;

    await request(app.getHttpServer())
      .post(`/api/v1/career/applications/${applicationId}/interviews`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          type: "technical",
          status: "planned",
          scheduledAt: "2026-09-10T12:00:00.000Z",
          format: "Zoom",
          participants: "Team lead",
          questions: [],
          notes: "",
          outcome: "",
          nextAction: "Повторить WebSocket",
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/career/activities")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          applicationId,
          type: "application",
          occurredAt: "2026-09-01T12:00:00.000Z",
          note: "Качественный отклик",
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch("/api/v1/career/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        data: {
          searchMode: "intensive",
          weeklyGoals: { applications: 15, outreach: 10, referrals: 4, interviews: 3 },
        },
      })
      .expect(200);

    const workspace = await request(app.getHttpServer())
      .get("/api/v1/career")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(workspace.body.applications[0].interviews).toHaveLength(1);
    expect(workspace.body.activities).toHaveLength(1);
    expect(workspace.body.settings.searchMode).toBe("intensive");

    const backup = await request(app.getHttpServer())
      .get("/api/v1/learning/backup")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(backup.body.data.careerApplications).toHaveLength(1);
    expect(backup.body.data.careerActivities).toHaveLength(1);
    expect(backup.body.data.careerSettings).toHaveLength(1);
  });

  it("rejects an unknown track key", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/learning/tracks/sprint/items/anything/lesson")
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .expect(({ body }) => {
        expect(String(body.message)).toContain("Неизвестный трек");
      });
  });

  it("keeps health checks outside the versioned prefix", async () => {
    await request(app.getHttpServer()).get("/api/health").expect(200);
    await request(app.getHttpServer()).get("/api/v1/health").expect(404);
  });

  it("applies a repeated review operation only once", async () => {
    const questionId = QUESTION_BANK[0]?.id;
    if (!questionId) throw new Error("Question bank must contain at least one question");
    const operationId = "review-operation-1";

    const firstResponse = await request(app.getHttpServer())
      .post(`/api/v1/learning/questions/${questionId}/review`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: "easy", operationId })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/v1/learning/questions/${questionId}/review`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: "easy", operationId })
      .expect(201);

    expect(firstResponse.body.reviewCount).toBe(1);
    expect(duplicateResponse.body).toEqual(firstResponse.body);

    const bootstrapResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(bootstrapResponse.body.progress.questions[questionId]).toMatchObject({
      reviewCount: 1,
      lastRating: "easy",
    });
    expect(await evidenceEventModel.countDocuments()).toBe(1);

    const overview = await request(app.getHttpServer())
      .get("/api/v1/learning/knowledge/overview?target=yandex")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(overview.body).toMatchObject({
      ontologyVersion: "frontend-v1",
      masteryModelVersion: "evidence-decay-v1",
      readiness: { targetId: "yandex" },
    });
    const measuredSkill = overview.body.skills.find(
      (skill: { evidenceCount: number }) => skill.evidenceCount > 0,
    );
    expect(measuredSkill).toBeTruthy();

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/learning/knowledge/skills/${encodeURIComponent(measuredSkill.skillId)}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(detail.body.evidence).toHaveLength(1);
  });

  it("objectively checks and deduplicates an evidence question attempt", async () => {
    const operationId = "question-attempt-operation-1";
    const payload = {
      answer: "A, G, C, F, D, E, B",
      explanation: "Сначала sync, затем очередь microtask полностью, потом timer task.",
      confidence: 80,
      responseTimeMs: 60_000,
      operationId,
    };

    const firstResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/questions/q-01/attempts")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/questions/q-01/attempts")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(firstResponse.body).toMatchObject({
      questionId: "q-01",
      exerciseType: "predict_output",
      submittedAnswer: payload.answer,
      submittedExplanation: payload.explanation,
      passed: true,
      score: 100,
      confidence: 80,
      calibrationGap: -20,
      progress: { reviewCount: 1, lastRating: "easy" },
    });
    expect(duplicateResponse.body).toEqual(firstResponse.body);
    const nativeOperationId = `question-attempt:${operationId}`;
    expect(await assessmentResultV2Model.countDocuments({ operationId: nativeOperationId })).toBe(1);
    const nativeEvidence = await evidenceEventV2Model
      .findOne({ operationId: nativeOperationId })
      .lean()
      .exec();
    expect(nativeEvidence).toMatchObject({
      evidenceVersion: "2",
      provenance: { kind: "native" },
      source: { kind: "question_attempt" },
    });
    expect(nativeEvidence?.observations.length).toBeGreaterThan(0);

    const overviewV2 = await request(app.getHttpServer())
      .get("/api/v1/learning/knowledge/v2/overview?target=yandex")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(overviewV2.body).toMatchObject({
      ontologyVersion: "frontend-v1",
      evidenceVersion: "2",
      masteryModelVersion: "evidence-native-v2",
      readiness: { targetId: "yandex" },
    });
    expect(overviewV2.body.readiness.coverage).toBeLessThan(100);
    expect(await masterySnapshotV2Model.countDocuments({ targetId: "yandex" })).toBe(1);

    const comparison = await request(app.getHttpServer())
      .get("/api/v1/learning/knowledge/v2/comparison?target=yandex")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(comparison.body).toMatchObject({
      targetId: "yandex",
      readiness: {
        v2Coverage: overviewV2.body.readiness.coverage,
      },
    });
    expect(comparison.body.skills.some(
      (skill: { unknownCapabilities: string[] }) => skill.unknownCapabilities.length > 0,
    )).toBe(true);

    const backup = await request(app.getHttpServer())
      .get("/api/v1/learning/backup")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(backup.body.data.assessmentResultsV2).toHaveLength(1);
    expect(backup.body.data.evidenceEventsV2).toHaveLength(1);
    expect(backup.body.data.masterySnapshotsV2).toHaveLength(1);

    await request(app.getHttpServer())
      .post("/api/v1/learning/questions/q-02/attempts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, answer: "другой ответ" })
      .expect(409);

    const failedResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/questions/q-01/attempts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, answer: "A, B, C", operationId: "question-attempt-operation-2" })
      .expect(201);

    expect(failedResponse.body).toMatchObject({
      passed: false,
      score: 0,
      progress: { reviewCount: 2, lastRating: "again" },
    });
  });

  it("stores a repeated quiz submission as one attempt", async () => {
    const blockId = YANDEX_SPRINT[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!blockId) throw new Error("Yandex sprint must contain a quiz-capable block");
    const quiz = Array.from({ length: 10 }, (_, index) => ({
      id: `quiz-${index + 1}`,
      prompt: `Вопрос ${index + 1}`,
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
      explanation: "Тестовое объяснение",
      topic: "JavaScript",
    }));
    await lessonModel.create({
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: blockId,
      title: "Интеграционный урок",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
      },
      quiz,
      summary: "Итог",
      resourceIds: [],
      version: 1,
      generatedAt: new Date().toISOString(),
    });
    const answers = quiz.map((question) => ({
      questionId: question.id,
      selectedOptionIndex: 0,
    }));
    const path = `/api/v1/learning/tracks/yandex/items/${blockId}/quiz`;
    const payload = { answers, operationId: "quiz-operation-1" };

    const firstResponse = await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const duplicateResponse = await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(firstResponse.body.attempts).toHaveLength(1);
    expect(duplicateResponse.body).toEqual(firstResponse.body);
    const quizEvidence = await evidenceEventV2Model
      .findOne({ operationId: "quiz:quiz-operation-1" })
      .lean()
      .exec();
    expect(quizEvidence).toMatchObject({
      provenance: { kind: "native" },
      source: { kind: "quiz_attempt" },
    });
    expect(quizEvidence?.observations).toHaveLength(10);
    await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...payload,
        answers: answers.map((answer, index) => ({
          ...answer,
          selectedOptionIndex: index === 0 ? 1 : answer.selectedOptionIndex,
        })),
      })
      .expect(409);
  });

  it("grades Core and Deep quiz blocks independently without exposing answers", async () => {
    const blockId = YANDEX_SPRINT[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!blockId) throw new Error("Yandex sprint must contain a quiz-capable block");
    const quiz: AiQuizQuestion[] = Array.from({ length: 20 }, (_, index) => ({
      id: `safe-quiz-${index + 1}`,
      prompt: `Безопасный вопрос ${index + 1}`,
      options: ["A", "B", "C", "D"],
      correctOptionIndex: index % 4,
      explanation: `Объяснение ${index + 1}`,
      topic: "JavaScript",
      tier: index < 10 ? "core" : "deep",
      capability: QUIZ_CAPABILITIES[index]!,
      ...(index < 8 ? { code: `const value = ${index};` } : {}),
    }));
    await lessonModel.create({
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: blockId,
      title: "Безопасный квиз",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
      },
      quiz,
      summary: "Итог",
      resourceIds: [],
      version: 2,
      generatedAt: new Date().toISOString(),
    });

    const content = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const publicQuiz = content.body.ai.lessons.yandex[blockId].quiz;
    expect(publicQuiz).toHaveLength(20);
    expect(publicQuiz[0]).not.toHaveProperty("correctOptionIndex");
    expect(publicQuiz[0]).not.toHaveProperty("explanation");

    const coreQuestions = quiz.slice(0, 10);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/learning/tracks/yandex/items/${blockId}/quiz`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        tier: "core",
        operationId: "safe-core-quiz-1",
        answers: coreQuestions.map((question) => ({
          questionId: question.id,
          selectedOptionIndex: question.correctOptionIndex,
        })),
      })
      .expect(201);

    expect(response.body.attempts).toHaveLength(1);
    expect(response.body.attempts[0]).toMatchObject({ score: 10, tier: "core" });
    expect(response.body.attempts[0].answers[0]).toMatchObject({
      correct: true,
      correctOptionIndex: 0,
      explanation: "Объяснение 1",
    });
  });

  it("versions generated practice solutions and reports conflicts", async () => {
    const blockId = YANDEX_SPRINT[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!blockId) throw new Error("Yandex sprint must contain a practice-capable block");
    await lessonModel.create({
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: blockId,
      title: "Интеграционный урок",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
      },
      quiz: [],
      summary: "Итог",
      resourceIds: [],
      version: 1,
      generatedAt: new Date().toISOString(),
    });
    const path = `/api/v1/learning/tracks/yandex/items/${blockId}/practice`;

    const first = await request(app.getHttpServer())
      .put(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonVersion: 1,
        solution: "function solve() { return 1; }",
        baseRevision: 0,
        operationId: "practice-operation-1",
      })
      .expect(200);
    expect(first.body).toMatchObject({
      saved: true,
      progress: { revision: 1, solution: "function solve() { return 1; }" },
    });

    const conflict = await request(app.getHttpServer())
      .put(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonVersion: 1,
        solution: "function solve() { return 2; }",
        baseRevision: 0,
        operationId: "practice-operation-2",
      })
      .expect(200);
    expect(conflict.body).toMatchObject({
      saved: false,
      progress: { revision: 1, solution: "function solve() { return 1; }" },
    });

    const saved = await request(app.getHttpServer())
      .put(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonVersion: 1,
        solution: "function solve() { return 3; }",
        baseRevision: 1,
        operationId: "practice-operation-3",
      })
      .expect(200);
    expect(saved.body).toMatchObject({ saved: true, progress: { revision: 2 } });

    const bootstrap = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(bootstrap.body.ai.practiceProgress.yandex[blockId]).toMatchObject({
      revision: 2,
      solution: "function solve() { return 3; }",
    });
  });

  it("verifies static and generated practice attempts idempotently", async () => {
    const runnerCase = getStaticRunnerValidationCases().find(
      (item) => item.id === "yandex-d01-algorithms",
    );
    if (!runnerCase) throw new Error("Static runner fixture is missing");
    const path = `/api/v1/learning/tracks/yandex/items/${runnerCase.id}/practice/attempts`;
    const staticPayload = {
      source: "task",
      solution: runnerCase.referenceSolution,
      operationId: "static-attempt-1",
      responseTimeMs: 42_000,
      runCount: 1,
      hintCount: 0,
      aiAssisted: false,
      confidence: 4,
    };

    const first = await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send(staticPayload)
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send(staticPayload)
      .expect(201);
    expect(first.body).toMatchObject({
      source: "task",
      passed: true,
      passedCount: first.body.totalCount,
      attemptNumber: 1,
      firstAttemptPassed: true,
      responseTimeMs: 42_000,
      confidence: 4,
    });
    expect(duplicate.body).toEqual(first.body);
    const practiceEvidence = await evidenceEventV2Model
      .findOne({ operationId: "practice:static-attempt-1" })
      .lean()
      .exec();
    expect(practiceEvidence).toMatchObject({
      provenance: { kind: "native" },
      source: { kind: "practice_attempt" },
      assistance: { mode: "no_ai" },
    });
    expect(practiceEvidence?.observations.every(
      (observation) => observation.capability === "code",
    )).toBe(true);

    await lessonModel.create({
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: runnerCase.id,
      title: "Интеграционный урок",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
        runner: runnerCase.runner,
      },
      quiz: [],
      summary: "Итог",
      resourceIds: [],
      version: 2,
      generatedAt: new Date().toISOString(),
    });
    await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "lesson",
        lessonVersion: 2,
        solution: runnerCase.referenceSolution,
        operationId: "lesson-attempt-1",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ source: "lesson", passed: true });
      });
    await request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "lesson",
        lessonVersion: 1,
        solution: runnerCase.referenceSolution,
        operationId: "lesson-attempt-stale",
      })
      .expect(400);

    const history = await request(app.getHttpServer())
      .get(`${path}?source=task&limit=10`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.attempts).toHaveLength(1);
    expect(history.body.attempts[0]).toMatchObject({
      source: "task",
      passed: true,
    });
    expect(history.body.attempts[0]).not.toHaveProperty("operationId");
  });

  it("exports and restores all progress without deleting current data", async () => {
    const taskId = [...TASK_IDS][0];
    const secondTaskId = [...TASK_IDS][1];
    if (!taskId || !secondTaskId) throw new Error("Curriculum must contain two tasks");

    await request(app.getHttpServer())
      .put(`/api/v1/learning/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true, solution: "const answer = 42;" })
      .expect(200);
    await request(app.getHttpServer())
      .patch("/api/v1/learning/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ reminderEnabled: true, reminderTime: "20:15" })
      .expect(200);
    const runnerCase = getStaticRunnerValidationCases().find(
      (item) => item.id === "yandex-d01-algorithms",
    );
    if (!runnerCase) throw new Error("Static runner fixture is missing");
    const attemptPath =
      `/api/v1/learning/tracks/yandex/items/${runnerCase.id}/practice/attempts`;
    await request(app.getHttpServer())
      .post(attemptPath)
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "task",
        solution: runnerCase.referenceSolution,
        operationId: "backup-attempt-1",
      })
      .expect(201);

    const exportResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/backup")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(exportResponse.body).toMatchObject({
      format: "knows-preparation-backup",
      version: 1,
    });
    expect(exportResponse.body.data.practiceAttempts).toHaveLength(1);
    expect(exportResponse.body.data.learningSignals).toHaveLength(1);
    expect(exportResponse.body.data.assessmentResultsV2).toHaveLength(1);
    expect(exportResponse.body.data.evidenceEventsV2).toHaveLength(1);
    expect(JSON.stringify(exportResponse.body)).not.toContain(TEST_PASSWORD);

    const collections = await connection.db?.collections();
    await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
    await request(app.getHttpServer())
      .put(`/api/v1/learning/tasks/${secondTaskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true })
      .expect(200);

    const importResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/backup/import")
      .set("Authorization", `Bearer ${token}`)
      .send({ backup: exportResponse.body })
      .expect(201);
    expect(importResponse.body.total).toBeGreaterThanOrEqual(2);

    const bootstrapResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(bootstrapResponse.body.progress.tasks[taskId]).toMatchObject({
      completed: true,
      solution: "const answer = 42;",
    });
    expect(bootstrapResponse.body.progress.tasks[secondTaskId]).toMatchObject({ completed: true });
    expect(bootstrapResponse.body.settings).toMatchObject({
      reminderEnabled: true,
      reminderTime: "20:15",
    });
    const restoredAttempts = await request(app.getHttpServer())
      .get(`${attemptPath}?source=task`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(restoredAttempts.body.attempts).toHaveLength(1);
    expect(restoredAttempts.body.attempts[0]).toMatchObject({ passed: true });
  });

  it("builds, measures and replaces adaptive recommendations", async () => {
    const runnerCase = getStaticRunnerValidationCases().find(
      (item) => item.id === "yandex-d01-algorithms",
    );
    if (!runnerCase) throw new Error("Static runner fixture is missing");
    await request(app.getHttpServer())
      .post(
        `/api/v1/learning/tracks/yandex/items/${runnerCase.id}/practice/attempts`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "task",
        solution: "throw new Error('not solved');",
        operationId: "adaptive-failed-attempt-1",
      })
      .expect(201)
      .expect(({ body }) => expect(body.passed).toBe(false));

    const planResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/adaptive/today")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const practice = planResponse.body.items.find(
      (item: { kind: string; itemId: string }) =>
        item.kind === "practice" && item.itemId === runnerCase.id,
    );
    expect(practice).toMatchObject({ track: "yandex", source: "task" });

    await request(app.getHttpServer())
      .post("/api/v1/learning/adaptive/today/skip")
      .set("Authorization", `Bearer ${token}`)
      .send({ recommendationId: practice.id, operationId: "skip-adaptive-1" })
      .expect(201);

    const replacedPlan = await request(app.getHttpServer())
      .get("/api/v1/learning/adaptive/today")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(replacedPlan.body.items).not.toContainEqual(
      expect.objectContaining({ id: practice.id }),
    );

    const analyticsResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/analytics?days=7")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(analyticsResponse.body).toMatchObject({
      windowDays: 7,
      totals: { activityCount: 1, practiceAttempts: 1, practicePassRate: 0 },
    });
  });

  it("creates a mission and records an independent Transfer Lab check", async () => {
    const todayResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/missions/today?target=yandex")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(todayResponse.body.enabled).toBe(true);
    expect(todayResponse.body.missions).toHaveLength(3);
    const mission = todayResponse.body.missions[0] as {
      missionId: string;
      verification: { id: string; familyId: string };
      delayedVerification: { familyId: string };
    };
    expect(mission.verification.familyId).not.toBe(mission.delayedVerification.familyId);

    await request(app.getHttpServer())
      .post(`/api/v1/learning/missions/${mission.missionId}/actions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "start", operationId: "mission-start-1" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/learning/missions/${mission.missionId}/actions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "complete_intervention", operationId: "mission-ready-1" })
      .expect(201);

    const answers: Record<string, string> = {
      "transfer-event-loop-1": "A, F, C, E, D, B",
      "transfer-react-effect-1": "Это race: в cleanup вызываем AbortController.abort и передаём signal в fetch.",
      "transfer-closures-1": "[3, 3, 3], одна общая binding; исправления: let или IIFE с параметром.",
      "transfer-algorithms-1": "Монотонная deque хранит индексы в убывающем порядке, амортизированно O(1).",
    };
    const answer = answers[mission.verification.id];
    if (!answer) throw new Error(`Missing Transfer Lab answer for ${mission.verification.id}`);
    const result = await request(app.getHttpServer())
      .post(`/api/v1/learning/missions/${mission.missionId}/transfer-attempts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer,
        confidence: 75,
        responseTimeMs: 45_000,
        operationId: "mission-transfer-1",
      })
      .expect(201);
    expect(result.body).toMatchObject({ missionId: mission.missionId, passed: true });

    const updated = await request(app.getHttpServer())
      .get(`/api/v1/learning/missions/${mission.missionId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(updated.body).toMatchObject({ status: "consolidation", verificationAttempts: 1 });
    expect(updated.body.verificationEvidenceIds).toHaveLength(1);
  });

  it("transcribes a mock answer without storing the audio", async () => {
    const interviewResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/mock-interviews")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "Расшифрованный ответ" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    try {
      const transcriptionResponse = await request(app.getHttpServer())
        .post(`/api/v1/learning/mock-interviews/${interviewResponse.body.id}/transcribe`)
        .set("Authorization", `Bearer ${token}`)
        .attach("audio", Buffer.from("test-audio"), {
          filename: "answer.webm",
          contentType: "audio/webm",
        })
        .expect(201);

      expect(transcriptionResponse.body).toEqual({ text: "Расшифрованный ответ" });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.openai.com/v1/audio/transcriptions",
        expect.objectContaining({ method: "POST" }),
      );
      const mockCollection = connection.db?.collection("mockinterviews");
      const stored = await mockCollection?.findOne({});
      expect(JSON.stringify(stored)).not.toContain("test-audio");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("runs and restores a complete interview simulator session", async () => {
    const aiContent = app.get(AiContentService);
    const agents = app.get(AiAgentService);
    const config = app.get(ConfigService);
    const originalConfigGet = config.get.bind(config);
    const configSpy = vi.spyOn(config, "get").mockImplementation(
      ((key: string, defaultValue?: unknown) => key === "INTERVIEW_V3_ENABLED"
        ? "false"
        : originalConfigGet(key, defaultValue)) as typeof config.get,
    );
    const assessmentSpy = vi
      .spyOn(agents, "assessInterviewAnswer")
      .mockImplementation(async (input) => ({
        score: input.followUpCount ? 82 : 70,
        confidence: "high",
        strengths: ["Практический пример"],
        gaps: input.followUpCount ? [] : ["Нужен компромисс"],
        followUpQuestion: input.followUpCount ? null : "Почему этот подход уместен?",
        nextQuestionId: input.candidateQuestions[0]?.id ?? null,
      }));
    const assistantSpy = vi
      .spyOn(aiContent, "generateInterviewAssistantReply")
      .mockResolvedValue("Проверь граничный случай и сложность.");
    const defenseSpy = vi
      .spyOn(aiContent, "generateInterviewDefenseQuestions")
      .mockResolvedValue(["Объясни сложность.", "Как проверил совет AI?"]);
    const evaluationSpy = vi
      .spyOn(aiContent, "evaluateInterviewSession")
      .mockResolvedValue({
        platformScore: 80,
        aiScore: 80,
        communicationScore: 80,
        summary: "Кандидат готов к следующей тренировке.",
        strengths: ["JavaScript"],
        weakTopics: ["React reconciliation"],
        recommendations: ["Повторить React"],
        platformFeedback: "Ответы по существу.",
        aiFeedback: "Советы AI проверены тестами.",
        communicationFeedback: "Ответы структурированы.",
      });

    try {
      const started = await request(app.getHttpServer())
        .post("/api/v1/learning/interview-sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "express", company: "yandex" })
        .expect(201);
      expect(started.body).toMatchObject({
        status: "in_progress",
        currentStage: "platform",
        durationMinutes: 35,
      });
      expect(started.body.platformItems).toHaveLength(1);
      expect(started.body.platformQuestionTarget).toBe(2);

      const restored = await request(app.getHttpServer())
        .get("/api/v1/learning/interview-sessions/current")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(restored.body.id).toBe(started.body.id);

      let session = started.body;
      while (session.currentStage === "platform") {
        const item = session.platformItems.find(
          (candidate: { completed?: boolean }) => !candidate.completed,
        );
        if (!item) throw new Error("Active adaptive question is missing");
        session = (
          await request(app.getHttpServer())
            .put(`/api/v1/learning/interview-sessions/${session.id}/platform/${item.question.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "Основной ответ с практическим примером." })
            .expect(200)
        ).body;
        session = (
          await request(app.getHttpServer())
            .put(`/api/v1/learning/interview-sessions/${session.id}/platform/${item.question.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
              answer: "Основной ответ с практическим примером.",
              followUpAnswer: "Потому что это снижает сложность и сохраняет читаемость.",
            })
            .expect(200)
        ).body;
      }
      expect(session.currentStage).toBe("coding");

      const runners = new Map(
        getStaticRunnerValidationCases().map((item) => [item.id, item]),
      );
      const codingSolution = runners.get(session.codingExercise.id)?.referenceSolution;
      if (!codingSolution) throw new Error("Coding reference solution is missing");
      session = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${session.id}/coding/attempt`)
          .set("Authorization", `Bearer ${token}`)
          .send({ solution: codingSolution })
          .expect(201)
      ).body;
      expect(session.codingExercise.result.passed).toBe(true);
      session = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${session.id}/coding/complete`)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
      ).body;
      expect(session.currentStage).toBe("ai");

      session = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${session.id}/ai/messages`)
          .set("Authorization", `Bearer ${token}`)
          .send({ content: "Как проверить крайние случаи?", solution: session.aiExercise.solution })
          .expect(201)
      ).body;
      expect(session.aiMessages).toHaveLength(2);
      const aiSolution = runners.get(session.aiExercise.id)?.referenceSolution;
      if (!aiSolution) throw new Error("AI reference solution is missing");
      session = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${session.id}/ai/attempt`)
          .set("Authorization", `Bearer ${token}`)
          .send({ solution: aiSolution })
          .expect(201)
      ).body;
      session = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${session.id}/ai/complete`)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
      ).body;
      expect(session.currentStage).toBe("defense");

      for (let index = 0; index < session.defenseQuestions.length; index += 1) {
        session = (
          await request(app.getHttpServer())
            .put(`/api/v1/learning/interview-sessions/${session.id}/defense/${index}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "Объясняю решение, компромиссы и способ проверки." })
            .expect(200)
        ).body;
      }
      const completed = await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${session.id}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
      expect(completed.body).toMatchObject({
        status: "completed",
        currentStage: "completed",
        evaluation: {
          overallScore: 89,
          readinessConfidence: "low",
          sections: { coding: { score: 100 }, ai: { score: 90 } },
        },
      });
      const interviewEvidence = await evidenceEventV2Model
        .findOne({ operationId: `interview:${session.id}` })
        .lean()
        .exec();
      expect(interviewEvidence).toMatchObject({
        provenance: { kind: "native" },
        source: { kind: "interview_session" },
        transferLevel: "far_transfer",
      });
      expect([...new Set(interviewEvidence?.observations.map(
        (observation) => observation.capability,
      ))]).toEqual(expect.arrayContaining(["explain", "code", "apply", "defend"]));

      const history = await request(app.getHttpServer())
        .get("/api/v1/learning/interview-sessions?limit=5")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(history.body).toHaveLength(1);
      expect(history.body[0].id).toBe(session.id);

      const backup = await request(app.getHttpServer())
        .get("/api/v1/learning/backup")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(backup.body.data.interviewSessions).toHaveLength(1);

      const examStarted = await request(app.getHttpServer())
        .post("/api/v1/learning/interview-sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "express", company: "yandex", kind: "exam" })
        .expect(201);
      expect(examStarted.body).toMatchObject({
        kind: "exam",
        currentStage: "platform",
        durationMinutes: 60,
      });

      let exam = examStarted.body;
      while (exam.currentStage === "platform") {
        const item = exam.platformItems.find(
          (candidate: { completed?: boolean }) => !candidate.completed,
        );
        if (!item) throw new Error("Active exam question is missing");
        exam = (
          await request(app.getHttpServer())
            .put(`/api/v1/learning/interview-sessions/${exam.id}/platform/${item.question.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "Основной ответ с примером." })
            .expect(200)
        ).body;
        exam = (
          await request(app.getHttpServer())
            .put(`/api/v1/learning/interview-sessions/${exam.id}/platform/${item.question.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
              answer: "Основной ответ с примером.",
              followUpAnswer: "Объясняю компромисс без подсказок.",
            })
            .expect(200)
        ).body;
      }
      const examSolution = runners.get(exam.codingExercise.id)?.referenceSolution;
      if (!examSolution) throw new Error("Exam reference solution is missing");
      exam = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${exam.id}/coding/attempt`)
          .set("Authorization", `Bearer ${token}`)
          .send({ solution: examSolution })
          .expect(201)
      ).body;
      exam = (
        await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${exam.id}/coding/complete`)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
      ).body;
      expect(exam.currentStage).toBe("defense");
      expect(exam.aiMessages).toHaveLength(0);
      await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${exam.id}/ai/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "Подскажи решение" })
        .expect(400);
    } finally {
      assessmentSpy.mockRestore();
      assistantSpy.mockRestore();
      defenseSpy.mockRestore();
      evaluationSpy.mockRestore();
      configSpy.mockRestore();
    }
  }, 30_000);

  it("freezes an expired exam and only allows final evaluation", async () => {
    const aiContent = app.get(AiContentService);
    const evaluationSpy = vi
      .spyOn(aiContent, "evaluateInterviewSession")
      .mockRejectedValue(new Error("evaluation unavailable"));
    try {
      const started = await request(app.getHttpServer())
        .post("/api/v1/learning/interview-sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "express", company: "yandex", kind: "exam" })
        .expect(201);
      expect(started.body.deadlineAt).toEqual(expect.any(String));

      const lessonBlockId = YANDEX_SPRINT[0]?.blocks.find(
        (block) => block.kind !== "review",
      )?.id;
      if (!lessonBlockId) throw new Error("Yandex lesson block is missing");
      await request(app.getHttpServer())
        .post(`/api/v1/learning/tracks/yandex/items/${lessonBlockId}/lesson`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      await connection.db?.collection("interviewsessions").updateOne(
        { _id: new Types.ObjectId(started.body.id) },
        { $set: { deadlineAt: new Date(Date.now() - 1_000) } },
      );

      const expired = await request(app.getHttpServer())
        .get("/api/v1/learning/interview-sessions/current")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(expired.body.expiredAt).toEqual(expect.any(String));

      await request(app.getHttpServer())
        .put(`/api/v1/learning/interview-sessions/${started.body.id}/platform/${started.body.platformItems[0].question.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "Попытка изменить ответ после дедлайна" })
        .expect(400);

      const completed = await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${started.body.id}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
      expect(completed.body).toMatchObject({
        status: "completed",
        currentStage: "completed",
        expiredAt: expect.any(String),
        evaluation: {
          overallScore: 0,
          assessmentSource: "deterministic",
          readinessConfidence: "low",
          sections: {
            platform: { score: null, assessed: false, source: "unassessed" },
            coding: { score: 0, assessed: true, source: "deterministic" },
            ai: { score: null, assessed: false, source: "unassessed" },
            communication: { score: null, assessed: false, source: "unassessed" },
          },
        },
      });
    } finally {
      evaluationSpy.mockRestore();
    }
  });

  it("runs an idempotent adaptive interview director conversation", async () => {
    const agents = app.get(AiAgentService);
    const config = app.get(ConfigService);
    const originalConfigGet = config.get.bind(config);
    const configSpy = vi.spyOn(config, "get").mockImplementation(
      ((key: string, defaultValue?: unknown) => key === "INTERVIEW_V3_ENABLED"
        ? "true"
        : originalConfigGet(key, defaultValue)) as typeof config.get,
    );
    const proposalSpy = vi.spyOn(agents, "proposeInterviewAction").mockImplementation(async (input) => ({
      action: input.depth === 0 ? "request_tradeoff" : "move_on",
      prompt: input.depth === 0
        ? "Какой главный компромисс?"
        : "Перейдём к следующему вопросу.",
      nextQuestionId: input.depth === 0 ? null : input.candidateQuestions[0]?.id ?? null,
      score: 78,
      confidence: "high",
      strengths: ["Ответ по существу"],
      gaps: input.depth === 0 ? ["Не назван компромисс"] : [],
    }));
    const branchSpy = vi.spyOn(agents, "assessInterviewBranch").mockResolvedValue({
      score: 80,
      confidence: "high",
      strengths: ["Ветка раскрыта"],
      gaps: [],
    });

    try {
      const started = await request(app.getHttpServer())
        .post("/api/v1/learning/interview-sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "express", company: "yandex", kind: "training" })
        .expect(201);
      expect(started.body).toMatchObject({
        engineVersion: 3,
        currentStage: "platform",
        conversationState: { depth: 0, turnCount: 1 },
      });
      expect(started.body.turns).toHaveLength(1);

      const first = await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${started.body.id}/turns`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "Основной ответ", operationId: "director-turn-1" })
        .expect(201);
      expect(first.body.turns).toHaveLength(3);
      expect(first.body.conversationState).toMatchObject({ depth: 1, turnCount: 3 });
      expect(proposalSpy.mock.calls[0]?.[0].transcript.at(-1)).toEqual({
        role: "candidate",
        content: "Основной ответ",
      });

      const duplicate = await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${started.body.id}/turns`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "Повтор", operationId: "director-turn-1" })
        .expect(201);
      expect(duplicate.body.turns).toHaveLength(3);

      let session = duplicate.body;
      let operation = 2;
      while (session.currentStage === "platform" && operation < 10) {
        session = (await request(app.getHttpServer())
          .post(`/api/v1/learning/interview-sessions/${started.body.id}/turns`)
          .set("Authorization", `Bearer ${token}`)
          .send({ answer: `Ответ ${operation}`, operationId: `director-turn-${operation}` })
          .expect(201)).body;
        operation += 1;
      }
      expect(session.currentStage).toBe("coding");
      expect(session.conversationState.completedQuestions).toBe(2);
      expect(session.turns.filter((turn: { role: string }) => turn.role === "candidate"))
        .toHaveLength(4);
      const finalRetry = await request(app.getHttpServer())
        .post(`/api/v1/learning/interview-sessions/${started.body.id}/turns`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "Повтор последнего ответа", operationId: "director-turn-4" })
        .expect(201);
      expect(finalRetry.body.currentStage).toBe("coding");
      expect(finalRetry.body.turns).toHaveLength(session.turns.length);
    } finally {
      proposalSpy.mockRestore();
      branchSpy.mockRestore();
      configSpy.mockRestore();
    }
  });

  it("captures readiness before a real interview and calibrates its outcome", async () => {
    const snapshot = await request(app.getHttpServer())
      .post("/api/v1/learning/readiness/predictions")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId: "yandex", applicationId: null })
      .expect(201);
    expect(snapshot.body).toMatchObject({
      targetId: "yandex",
      forecastProbability: null,
      calibrationStatus: "uncalibrated",
    });

    await request(app.getHttpServer())
      .post("/api/v1/learning/readiness/outcomes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        predictionSnapshotId: snapshot.body.snapshotId,
        company: "yandex",
        technicalPassed: true,
        codingPassed: true,
        topics: ["JavaScript"],
        notes: "Технический этап пройден",
        occurredAt: new Date().toISOString(),
      })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get("/api/v1/learning/readiness/calibration")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(summary.body).toMatchObject({
      status: "uncalibrated",
      outcomeCount: 1,
      brierScore: expect.any(Number),
    });
    expect(summary.body.outcomes[0].predictionSnapshotId).toBe(snapshot.body.snapshotId);
  });

  it("saves an empty practice solution instead of failing validation", async () => {
    const blockId = YANDEX_SPRINT[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!blockId) throw new Error("Yandex sprint must contain a practice-capable block");
    await lessonModel.create({
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: blockId,
      title: "Интеграционный урок",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
      },
      quiz: [],
      summary: "Итог",
      resourceIds: [],
      version: 1,
      generatedAt: new Date().toISOString(),
    });

    const response = await request(app.getHttpServer())
      .put(`/api/v1/learning/tracks/yandex/items/${blockId}/practice`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonVersion: 1,
        solution: "",
        baseRevision: 0,
        operationId: "practice-empty-1",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      saved: true,
      progress: { revision: 1, solution: "" },
    });
  });

  it("serves the curriculum track through the same endpoints", async () => {
    const track = getStaticTrack("curriculum");
    const itemId = track.days[0]?.blocks.find((block) => block.kind !== "review")?.id;
    if (!itemId) throw new Error("Curriculum must contain a lesson-capable block");

    await lessonModel.create({
      courseKey: track.courseKey,
      courseVersion: track.courseVersion,
      itemId,
      title: "Урок учебного плана",
      goals: [],
      explanation: "Тест",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Практика",
        statement: "Решить задачу",
        constraints: [],
        examples: [],
      },
      quiz: [],
      summary: "Итог",
      resourceIds: [],
      version: 1,
      generatedAt: new Date().toISOString(),
    });

    const chatResponse = await request(app.getHttpServer())
      .get(`/api/v1/learning/tracks/curriculum/items/${itemId}/chat`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(chatResponse.body).toMatchObject({ itemId, messages: [] });

    const practiceResponse = await request(app.getHttpServer())
      .put(`/api/v1/learning/tracks/curriculum/items/${itemId}/practice`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonVersion: 1,
        solution: "const answer = 42;",
        baseRevision: 0,
        operationId: "curriculum-practice-1",
      })
      .expect(200);
    expect(practiceResponse.body).toMatchObject({ saved: true });

    const progressResponse = await request(app.getHttpServer())
      .get("/api/v1/learning/bootstrap/progress")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(progressResponse.body.ai.lessons.curriculum[itemId]).toMatchObject({
      itemId,
      title: "Урок учебного плана",
    });
    expect(progressResponse.body.ai.practiceProgress.curriculum[itemId]).toMatchObject({
      solution: "const answer = 42;",
    });
  });

  it("accepts a whitespace-only mock answer without a server error", async () => {
    const interviewResponse = await request(app.getHttpServer())
      .post("/api/v1/learning/mock-interviews")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const questionId = interviewResponse.body.questions[0].id as string;

    const response = await request(app.getHttpServer())
      .put(
        `/api/v1/learning/mock-interviews/${interviewResponse.body.id}/answers/${questionId}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " })
      .expect(200);

    expect(response.body.answers[questionId]).toBe("");
  });

  it("runs a Yandex platform mock without leaking answers before prediction", async () => {
    const started = await request(app.getHttpServer())
      .post("/api/v1/learning/yandex-platform-mocks/yandex-d07")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(started.body).toMatchObject({
      dayId: "yandex-d07",
      status: "in_progress",
      durationMinutes: 60,
      score: null,
    });
    expect(started.body.questions).toHaveLength(17);
    expect(
      started.body.questions.every(
        (question: { expectedAnswer: string | null }) =>
          question.expectedAnswer === null,
      ),
    ).toBe(true);

    let attempt = started.body;
    for (const [index, question] of attempt.questions.entries()) {
      attempt = (
        await request(app.getHttpServer())
          .put(
            `/api/v1/learning/yandex-platform-mocks/attempts/${attempt.id}/questions/${question.id}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ response: `Мой прогноз ${index + 1}` })
          .expect(200)
      ).body;
      expect(attempt.questions[index].expectedAnswer).toBeTruthy();

      attempt = (
        await request(app.getHttpServer())
          .put(
            `/api/v1/learning/yandex-platform-mocks/attempts/${attempt.id}/questions/${question.id}/grade`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ verdict: index < 4 ? "correct" : "incorrect" })
          .expect(200)
      ).body;
    }

    const completed = await request(app.getHttpServer())
      .post(
        `/api/v1/learning/yandex-platform-mocks/attempts/${attempt.id}/complete`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(completed.body).toMatchObject({
      status: "completed",
      score: 24,
    });

    const restored = await request(app.getHttpServer())
      .get("/api/v1/learning/yandex-platform-mocks/yandex-d07")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(restored.body.id).toBe(attempt.id);
    expect(restored.body.questions.every(
      (question: { explanation: string | null }) => Boolean(question.explanation),
    )).toBe(true);
  });

  it("extends an active Yandex mock without losing saved answers", async () => {
    const started = await request(app.getHttpServer())
      .post("/api/v1/learning/yandex-platform-mocks/yandex-d07")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const firstQuestion = started.body.questions[0] as { id: string };
    await request(app.getHttpServer())
      .put(
        `/api/v1/learning/yandex-platform-mocks/attempts/${started.body.id}/questions/${firstQuestion.id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ response: "Сохранённый прогноз" })
      .expect(200);

    await yandexMockAttemptModel.updateOne(
      { _id: started.body.id },
      {
        $set: {
          questionIds: started.body.questions
            .slice(0, 6)
            .map((question: { id: string }) => question.id),
          answers: started.body.questions.slice(0, 6).map(
            (question: { id: string }, index: number) => ({
              questionId: question.id,
              response: index === 0 ? "Сохранённый прогноз" : "",
              verdict: null,
            }),
          ),
        },
      },
    );

    const restored = await request(app.getHttpServer())
      .get("/api/v1/learning/yandex-platform-mocks/yandex-d07")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(restored.body.questions).toHaveLength(17);
    expect(restored.body.questions[0].response).toBe("Сохранённый прогноз");
    expect(restored.body.questions[16].response).toBe("");
  });
});
