import { getConnectionToken, MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Connection } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LearningCleanupService } from "./learning-cleanup.service";
import { AiChatMessage, AiChatMessageSchema } from "./schemas/ai-chat-message.schema";
import { AiLesson, AiLessonSchema } from "./schemas/ai-course.schema";
import {
  AiPracticeProgress,
  AiPracticeProgressSchema,
} from "./schemas/ai-practice-progress.schema";
import { AiQuizProgress, AiQuizProgressSchema } from "./schemas/ai-quiz-progress.schema";

const COURSE_KEY = "main";

const lessonFixture = (courseVersion: number, itemId: string, version: number) => ({
  courseKey: COURSE_KEY,
  courseVersion,
  itemId,
  title: "Урок",
  goals: [],
  explanation: "Текст",
  codeExamples: [],
  diagrams: [],
  commonMistakes: [],
  interviewQuestions: [],
  practice: {
    title: "Практика",
    statement: "Решить задачу",
    constraints: [],
    examples: [],
    runner: { starterCode: "function solve() {}", testCases: [] },
  },
  quiz: [],
  summary: "Итог",
  resourceIds: [],
  version,
  generatedAt: new Date().toISOString(),
});

const practiceFixture = (
  courseVersion: number,
  itemId: string,
  lessonVersion: number,
  solution: string,
) => ({
  courseKey: COURSE_KEY,
  courseVersion,
  itemId,
  lessonVersion,
  solution,
  revision: 1,
  lastOperationId: null,
});

const quizFixture = (courseVersion: number, itemId: string, lessonVersion: number) => ({
  courseKey: COURSE_KEY,
  courseVersion,
  itemId,
  lessonVersion,
  attempts: [],
});

describe("LearningCleanupService", () => {
  let mongo: MongoMemoryServer;
  let connection: Connection;
  let cleanup: LearningCleanupService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: AiLesson.name, schema: AiLessonSchema },
          { name: AiChatMessage.name, schema: AiChatMessageSchema },
          { name: AiQuizProgress.name, schema: AiQuizProgressSchema },
          { name: AiPracticeProgress.name, schema: AiPracticeProgressSchema },
        ]),
      ],
      providers: [LearningCleanupService],
    }).compile();
    await moduleRef.init();
    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    cleanup = moduleRef.get(LearningCleanupService);
  }, 120_000);

  beforeEach(async () => {
    const collections = await connection.db?.collections();
    await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await connection?.close();
    await mongo?.stop();
  });

  it("removes data of previous course versions and keeps the current one", async () => {
    const lessons = connection.model<AiLesson>(AiLesson.name);
    const chat = connection.model<AiChatMessage>(AiChatMessage.name);
    const quiz = connection.model<AiQuizProgress>(AiQuizProgress.name);
    const practice = connection.model<AiPracticeProgress>(AiPracticeProgress.name);

    await lessons.create([
      lessonFixture(1, "lesson-01", 1),
      lessonFixture(2, "lesson-01", 1),
    ]);
    await chat.create([
      { courseKey: COURSE_KEY, courseVersion: 1, itemId: "lesson-01", role: "user", content: "Старый" },
      { courseKey: COURSE_KEY, courseVersion: 2, itemId: "lesson-01", role: "user", content: "Новый" },
    ]);
    await quiz.create([quizFixture(1, "lesson-01", 1), quizFixture(2, "lesson-01", 1)]);
    await practice.create([
      practiceFixture(1, "lesson-01", 1, "старое решение"),
      practiceFixture(2, "lesson-01", 1, "новое решение"),
    ]);

    const result = await cleanup.pruneCourseVersions(COURSE_KEY, 2);

    expect(result).toEqual({
      lessons: 1,
      chatMessages: 1,
      quizProgress: 1,
      practiceProgress: 1,
    });
    expect(await lessons.countDocuments()).toBe(1);
    expect(await chat.countDocuments({ courseVersion: 2 })).toBe(1);
    expect(await practice.findOne({}).lean()).toMatchObject({
      courseVersion: 2,
      solution: "новое решение",
    });
  });

  it("keeps everything when the course version did not change", async () => {
    const lessons = connection.model<AiLesson>(AiLesson.name);
    await lessons.create(lessonFixture(1, "lesson-01", 1));

    const result = await cleanup.pruneCourseVersions(COURSE_KEY, 1);

    expect(result).toEqual({
      lessons: 0,
      chatMessages: 0,
      quizProgress: 0,
      practiceProgress: 0,
    });
    expect(await lessons.countDocuments()).toBe(1);
  });

  it("drops stale quiz attempts and carries the practice solution forward", async () => {
    const quiz = connection.model<AiQuizProgress>(AiQuizProgress.name);
    const practice = connection.model<AiPracticeProgress>(AiPracticeProgress.name);
    await quiz.create([quizFixture(1, "lesson-01", 1), quizFixture(1, "lesson-01", 2)]);
    await practice.create(practiceFixture(1, "lesson-01", 1, "мой код"));

    const result = await cleanup.pruneLessonVersions(COURSE_KEY, 1, "lesson-01", 2);

    expect(result).toEqual({
      quizProgress: 1,
      practiceProgress: 1,
      carriedSolution: true,
    });
    const remaining = await practice.find().lean();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      lessonVersion: 2,
      solution: "мой код",
      revision: 1,
    });
    expect(await quiz.countDocuments()).toBe(1);
  });

  it("does not overwrite a solution already saved for the current version", async () => {
    const practice = connection.model<AiPracticeProgress>(AiPracticeProgress.name);
    await practice.create([
      practiceFixture(1, "lesson-01", 1, "старое"),
      practiceFixture(1, "lesson-01", 2, "актуальное"),
    ]);

    const result = await cleanup.pruneLessonVersions(COURSE_KEY, 1, "lesson-01", 2);

    expect(result.carriedSolution).toBe(false);
    const remaining = await practice.find().lean();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ lessonVersion: 2, solution: "актуальное" });
  });

  it("ignores empty previous solutions and other lessons", async () => {
    const practice = connection.model<AiPracticeProgress>(AiPracticeProgress.name);
    await practice.create([
      practiceFixture(1, "lesson-01", 1, ""),
      practiceFixture(1, "lesson-02", 1, "решение другой темы"),
    ]);

    const result = await cleanup.pruneLessonVersions(COURSE_KEY, 1, "lesson-01", 2);

    expect(result).toEqual({
      quizProgress: 0,
      practiceProgress: 1,
      carriedSolution: false,
    });
    const remaining = await practice.find().lean();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ itemId: "lesson-02", lessonVersion: 1 });
  });
});
