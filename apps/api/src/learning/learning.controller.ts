import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  ReviewQuestionDto,
  SendAiChatMessageDto,
  SubmitLessonQuizDto,
  UpdateMockAnswerDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { LearningService } from "./learning.service";

@UseGuards(JwtAuthGuard)
@Controller("learning")
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get("bootstrap")
  @Header("Cache-Control", "private, no-store")
  bootstrap() {
    return this.learningService.getBootstrap();
  }

  @Post("ai-course/generate")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  generateAiCourse(@Body() dto: GenerateAiCourseDto) {
    return this.learningService.generateAiCourse(dto);
  }

  @Post("ai-course/lessons/:itemId/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateAiLesson(@Param("itemId") itemId: string) {
    return this.learningService.generateAiLesson(itemId);
  }

  @Post("ai-course/lessons/:itemId/generate/stream")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  streamAiLesson(@Param("itemId") itemId: string, @Res() response: Response) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.generateAiLesson(itemId, onDelta),
    );
  }

  @Post("yandex-sprint/blocks/:blockId/lesson/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateYandexLesson(@Param("blockId") blockId: string) {
    return this.learningService.generateYandexLesson(blockId);
  }

  @Post("yandex-sprint/blocks/:blockId/lesson/generate/stream")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  streamYandexLesson(@Param("blockId") blockId: string, @Res() response: Response) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.generateYandexLesson(blockId, onDelta),
    );
  }

  @Post("ozon-sprint/blocks/:blockId/lesson/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateOzonLesson(@Param("blockId") blockId: string) {
    return this.learningService.generateOzonLesson(blockId);
  }

  @Post("ozon-sprint/blocks/:blockId/lesson/generate/stream")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  streamOzonLesson(@Param("blockId") blockId: string, @Res() response: Response) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.generateOzonLesson(blockId, onDelta),
    );
  }

  @Post("ai-course/lessons/:itemId/quiz")
  submitAiLessonQuiz(
    @Param("itemId") itemId: string,
    @Body() dto: SubmitLessonQuizDto,
  ) {
    return this.learningService.submitAiLessonQuiz(itemId, dto);
  }

  @Post("yandex-sprint/blocks/:blockId/quiz")
  submitYandexLessonQuiz(
    @Param("blockId") blockId: string,
    @Body() dto: SubmitLessonQuizDto,
  ) {
    return this.learningService.submitYandexLessonQuiz(blockId, dto);
  }

  @Post("ozon-sprint/blocks/:blockId/quiz")
  submitOzonLessonQuiz(
    @Param("blockId") blockId: string,
    @Body() dto: SubmitLessonQuizDto,
  ) {
    return this.learningService.submitOzonLessonQuiz(blockId, dto);
  }

  @Get("ai-course/lessons/:itemId/chat")
  getAiChat(@Param("itemId") itemId: string) {
    return this.learningService.getAiChat(itemId);
  }

  @Post("ai-course/lessons/:itemId/chat")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  sendAiChatMessage(
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
  ) {
    return this.learningService.sendAiChatMessage(itemId, dto);
  }

  @Post("ai-course/lessons/:itemId/chat/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  streamAiChatMessage(
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.sendAiChatMessage(itemId, dto, onDelta),
    );
  }

  @Delete("ai-course/lessons/:itemId/chat")
  clearAiChat(@Param("itemId") itemId: string) {
    return this.learningService.clearAiChat(itemId);
  }

  @Get("yandex-sprint/blocks/:blockId/chat")
  getYandexAiChat(@Param("blockId") blockId: string) {
    return this.learningService.getYandexAiChat(blockId);
  }

  @Post("yandex-sprint/blocks/:blockId/chat")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  sendYandexAiChatMessage(
    @Param("blockId") blockId: string,
    @Body() dto: SendAiChatMessageDto,
  ) {
    return this.learningService.sendYandexAiChatMessage(blockId, dto);
  }

  @Post("yandex-sprint/blocks/:blockId/chat/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  streamYandexAiChatMessage(
    @Param("blockId") blockId: string,
    @Body() dto: SendAiChatMessageDto,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.sendYandexAiChatMessage(blockId, dto, onDelta),
    );
  }

  @Delete("yandex-sprint/blocks/:blockId/chat")
  clearYandexAiChat(@Param("blockId") blockId: string) {
    return this.learningService.clearYandexAiChat(blockId);
  }

  @Get("ozon-sprint/blocks/:blockId/chat")
  getOzonAiChat(@Param("blockId") blockId: string) {
    return this.learningService.getOzonAiChat(blockId);
  }

  @Post("ozon-sprint/blocks/:blockId/chat")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  sendOzonAiChatMessage(
    @Param("blockId") blockId: string,
    @Body() dto: SendAiChatMessageDto,
  ) {
    return this.learningService.sendOzonAiChatMessage(blockId, dto);
  }

  @Post("ozon-sprint/blocks/:blockId/chat/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  streamOzonAiChatMessage(
    @Param("blockId") blockId: string,
    @Body() dto: SendAiChatMessageDto,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta) =>
      this.learningService.sendOzonAiChatMessage(blockId, dto, onDelta),
    );
  }

  @Delete("ozon-sprint/blocks/:blockId/chat")
  clearOzonAiChat(@Param("blockId") blockId: string) {
    return this.learningService.clearOzonAiChat(blockId);
  }

  @Patch("settings")
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.learningService.updateSettings(dto);
  }

  @Put("tasks/:taskId")
  updateTask(@Param("taskId") taskId: string, @Body() dto: UpdateTaskDto) {
    return this.learningService.updateTask(taskId, dto);
  }

  @Put("questions/:questionId")
  updateQuestion(
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.learningService.updateQuestion(questionId, dto);
  }

  @Post("questions/:questionId/review")
  reviewQuestion(
    @Param("questionId") questionId: string,
    @Body() dto: ReviewQuestionDto,
  ) {
    return this.learningService.reviewQuestion(questionId, dto);
  }

  @Get("mock-interviews/current")
  getCurrentMockInterview() {
    return this.learningService.getCurrentMockInterview();
  }

  @Post("mock-interviews")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  startMockInterview() {
    return this.learningService.startMockInterview();
  }

  @Put("mock-interviews/:interviewId/answers/:questionId")
  updateMockAnswer(
    @Param("interviewId") interviewId: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateMockAnswerDto,
  ) {
    return this.learningService.updateMockAnswer(interviewId, questionId, dto);
  }

  @Post("mock-interviews/:interviewId/complete")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  completeMockInterview(@Param("interviewId") interviewId: string) {
    return this.learningService.completeMockInterview(interviewId);
  }

  @Post("algorithms")
  addAlgorithm(@Body() dto: CreateAlgorithmDto) {
    return this.learningService.addAlgorithm(dto);
  }

  @Delete("algorithms/:id")
  deleteAlgorithm(@Param("id") id: string) {
    return this.learningService.deleteAlgorithm(id);
  }

  private async streamResponse<T>(
    response: Response,
    run: (onDelta: (delta: string) => void) => Promise<T>,
  ) {
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    const send = (event: string, data: unknown) => {
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
    try {
      const result = await run((delta) => send("delta", { delta }));
      send("result", result);
    } catch (error) {
      const responseBody = error instanceof HttpException ? error.getResponse() : null;
      const message =
        typeof responseBody === "string"
          ? responseBody
          : typeof responseBody === "object" &&
              responseBody !== null &&
              "message" in responseBody
            ? String(responseBody.message)
            : error instanceof Error
              ? error.message
              : "Поток AI завершился с ошибкой";
      send("error", { message });
    } finally {
      clearInterval(heartbeat);
      response.end();
    }
  }
}
