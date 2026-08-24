import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  YandexMockDayId,
  YandexMockVerdict,
  YandexPlatformMockAttempt as SerializedAttempt,
} from "@prep/contracts";
import { isValidObjectId, type Model } from "mongoose";

import type {
  GradeYandexMockResponseDto,
  SaveYandexMockResponseDto,
} from "./dto/learning.dto";
import {
  YandexPlatformMockAttempt,
  type YandexPlatformMockAttemptDocument,
} from "./schemas/yandex-platform-mock.schema";
import {
  getYandexPlatformMockQuestion,
  getYandexPlatformMockQuestions,
  YANDEX_PLATFORM_MOCK_DAY_IDS,
} from "./yandex-platform-mocks";

const isMockDayId = (value: string): value is YandexMockDayId =>
  YANDEX_PLATFORM_MOCK_DAY_IDS.some((dayId) => dayId === value);

@Injectable()
export class YandexPlatformMockService {
  constructor(
    @InjectModel(YandexPlatformMockAttempt.name)
    private readonly attemptModel: Model<YandexPlatformMockAttempt>,
  ) {}

  async getLatest(dayIdValue: string): Promise<SerializedAttempt | null> {
    const dayId = this.parseDayId(dayIdValue);
    const attempt = await this.attemptModel
      .findOne({ dayId })
      .sort({ status: -1, updatedAt: -1 })
      .lean()
      .exec();
    return attempt ? this.serialize(attempt) : null;
  }

  async start(dayIdValue: string): Promise<SerializedAttempt> {
    const dayId = this.parseDayId(dayIdValue);
    const current = await this.attemptModel
      .findOne({ dayId, status: "in_progress" })
      .sort({ updatedAt: -1 })
      .exec();
    if (current) return this.serialize(current);

    const questions = getYandexPlatformMockQuestions(dayId);
    const attempt = await this.attemptModel.create({
      dayId,
      status: "in_progress",
      questionIds: questions.map((question) => question.id),
      answers: questions.map((question) => ({
        questionId: question.id,
        response: "",
        verdict: null,
      })),
      durationMinutes: 60,
      startedAt: new Date(),
      completedAt: null,
      score: null,
    });
    return this.serialize(attempt);
  }

  async saveResponse(
    attemptId: string,
    questionId: string,
    dto: SaveYandexMockResponseDto,
  ): Promise<SerializedAttempt> {
    const attempt = await this.getDocument(attemptId);
    this.assertInProgress(attempt);
    const answer = this.getAnswer(attempt, questionId);
    answer.response = dto.response.trim();
    answer.verdict = null;
    attempt.markModified("answers");
    await attempt.save();
    return this.serialize(attempt);
  }

  async gradeResponse(
    attemptId: string,
    questionId: string,
    dto: GradeYandexMockResponseDto,
  ): Promise<SerializedAttempt> {
    const attempt = await this.getDocument(attemptId);
    this.assertInProgress(attempt);
    const answer = this.getAnswer(attempt, questionId);
    if (!answer.response.trim()) {
      throw new BadRequestException("Сначала зафиксируй свой ответ");
    }
    answer.verdict = dto.verdict;
    attempt.markModified("answers");
    await attempt.save();
    return this.serialize(attempt);
  }

  async complete(attemptId: string): Promise<SerializedAttempt> {
    const attempt = await this.getDocument(attemptId);
    this.assertInProgress(attempt);
    if (attempt.answers.some((answer) => answer.verdict === null)) {
      throw new BadRequestException("Оцени ответ на каждый вопрос");
    }
    const correct = attempt.answers.filter(
      (answer) => answer.verdict === "correct",
    ).length;
    attempt.status = "completed";
    attempt.completedAt = new Date();
    attempt.score = Math.round((correct / attempt.answers.length) * 100);
    await attempt.save();
    return this.serialize(attempt);
  }

  private parseDayId(value: string): YandexMockDayId {
    if (!isMockDayId(value)) {
      throw new BadRequestException(
        `Мок доступен только для дней: ${YANDEX_PLATFORM_MOCK_DAY_IDS.join(", ")}`,
      );
    }
    return value;
  }

  private async getDocument(attemptId: string) {
    if (!isValidObjectId(attemptId)) throw new NotFoundException("Попытка не найдена");
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) throw new NotFoundException("Попытка не найдена");
    return attempt;
  }

  private assertInProgress(attempt: YandexPlatformMockAttemptDocument) {
    if (attempt.status !== "in_progress") {
      throw new BadRequestException("Эта попытка уже завершена");
    }
  }

  private getAnswer(attempt: YandexPlatformMockAttemptDocument, questionId: string) {
    const answer = attempt.answers.find((item) => item.questionId === questionId);
    if (!answer) throw new NotFoundException("Вопрос не входит в эту попытку");
    return answer;
  }

  private serialize(
    attempt: unknown,
  ): SerializedAttempt {
    const source = attempt as unknown as {
      _id: { toString(): string };
      dayId: YandexMockDayId;
      status: "in_progress" | "completed";
      durationMinutes: number;
      startedAt: Date;
      completedAt: Date | null;
      score: number | null;
      questionIds: string[];
      answers: Array<{
        questionId: string;
        response: string;
        verdict: YandexMockVerdict | null;
      }>;
    };
    const answerMap = new Map(source.answers.map((answer) => [answer.questionId, answer]));
    return {
      id: source._id.toString(),
      dayId: source.dayId,
      status: source.status,
      durationMinutes: source.durationMinutes,
      startedAt: source.startedAt.toISOString(),
      completedAt: source.completedAt?.toISOString() ?? null,
      score: source.score,
      questions: source.questionIds.map((questionId) => {
        const definition = getYandexPlatformMockQuestion(source.dayId, questionId);
        if (!definition) throw new Error(`Unknown Yandex mock question: ${questionId}`);
        const answer = answerMap.get(questionId) ?? {
          questionId,
          response: "",
          verdict: null,
        };
        const revealed = Boolean(answer.response.trim()) || source.status === "completed";
        return {
          id: definition.id,
          topic: definition.topic,
          prompt: definition.prompt,
          code: definition.code,
          response: answer.response,
          verdict: answer.verdict,
          expectedAnswer: revealed ? definition.expectedAnswer : null,
          explanation: revealed ? definition.explanation : null,
        };
      }),
    };
  }
}
