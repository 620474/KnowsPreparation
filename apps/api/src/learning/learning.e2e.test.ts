import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Connection, Model } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AuthModule } from "../auth/auth.module";
import { QUESTION_BANK, TASK_IDS } from "./curriculum";
import { LearningModule } from "./learning.module";
import { AiLesson } from "./schemas/ai-course.schema";
import { YANDEX_SPRINT, YANDEX_SPRINT_AI_KEY, YANDEX_SPRINT_AI_VERSION } from "./yandex-sprint";

const TEST_PASSWORD = "integration-test-password";

describe("Learning API", () => {
  let app: INestApplication;
  let connection: Connection;
  let mongo: MongoMemoryServer;
  let lessonModel: Model<AiLesson>;
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
              OPENAI_API_KEY: "",
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri()),
        AuthModule,
        LearningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    lessonModel = app.get<Model<AiLesson>>(getModelToken(AiLesson.name));

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
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

    await request(app.getHttpServer()).get("/api/learning/bootstrap").expect(401);

    await request(app.getHttpServer())
      .put(`/api/learning/tasks/${taskId}`)
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
      .get("/api/learning/bootstrap")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(bootstrapResponse.body.progress.tasks[taskId]).toMatchObject({
      completed: true,
      note: "Проверено интеграционным тестом",
    });
  });

  it("applies a repeated review operation only once", async () => {
    const questionId = QUESTION_BANK[0]?.id;
    if (!questionId) throw new Error("Question bank must contain at least one question");
    const operationId = "review-operation-1";

    const firstResponse = await request(app.getHttpServer())
      .post(`/api/learning/questions/${questionId}/review`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: "easy", operationId })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/learning/questions/${questionId}/review`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: "easy", operationId })
      .expect(201);

    expect(firstResponse.body.reviewCount).toBe(1);
    expect(duplicateResponse.body).toEqual(firstResponse.body);

    const bootstrapResponse = await request(app.getHttpServer())
      .get("/api/learning/bootstrap")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(bootstrapResponse.body.progress.questions[questionId]).toMatchObject({
      reviewCount: 1,
      lastRating: "easy",
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
    const path = `/api/learning/yandex-sprint/blocks/${blockId}/quiz`;
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
  });
});
