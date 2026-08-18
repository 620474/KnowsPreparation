import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpException,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  ImportBackupDto,
  ReviewQuestionDto,
  SendAiChatMessageDto,
  SubmitLessonQuizDto,
  UpdateMockAnswerDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { LearningService } from "./learning.service";
import { LearningBackupService } from "./learning-backup.service";
import { LearningBootstrapService } from "./learning-bootstrap.service";

@UseGuards(JwtAuthGuard)
@Controller("learning")
export class LearningController {
  private readonly logger = new Logger(LearningController.name);

  constructor(
    private readonly learningService: LearningService,
    private readonly bootstrapService: LearningBootstrapService,
    private readonly backupService: LearningBackupService,
  ) {}

  @Get("bootstrap")
  @Header("Cache-Control", "private, no-store")
  bootstrap() {
    return this.bootstrapService.getLegacyBootstrap();
  }

  @Get("bootstrap/content")
  bootstrapContent(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=86400");
    response.setHeader("ETag", this.bootstrapService.contentEtag);
    return this.bootstrapService.getContent();
  }

  @Get("bootstrap/progress")
  @Header("Cache-Control", "private, no-store")
  bootstrapProgress() {
    return this.bootstrapService.getProgress();
  }

  @Get("backup")
  @Header("Cache-Control", "private, no-store")
  exportBackup() {
    return this.backupService.exportBackup();
  }

  @Post("backup/import")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  importBackup(@Body() dto: ImportBackupDto) {
    return this.backupService.importBackup(dto);
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.generateAiLesson(itemId, onDelta, signal),
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.generateYandexLesson(blockId, onDelta, signal),
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.generateOzonLesson(blockId, onDelta, signal),
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.sendAiChatMessage(itemId, dto, onDelta, signal),
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.sendYandexAiChatMessage(blockId, dto, onDelta, signal),
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
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.sendOzonAiChatMessage(blockId, dto, onDelta, signal),
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

  @Post("mock-interviews/:interviewId/transcribe")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) =>
        callback(null, file.mimetype.startsWith("audio/")),
    }),
  )
  transcribeMockAnswer(
    @Param("interviewId") interviewId: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    if (!audio) throw new BadRequestException("Добавь аудиозапись ответа");
    return this.learningService.transcribeMockAnswer(interviewId, audio);
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
    run: (onDelta: (delta: string) => void, signal: AbortSignal) => Promise<T>,
  ) {
    const controller = new AbortController();
    const handleClose = () => {
      if (response.writableEnded || controller.signal.aborted) return;
      controller.abort();
      this.logger.debug({
        event: "sse_client_disconnected",
        path: response.req.originalUrl,
      });
    };
    response.once("close", handleClose);
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    const send = (event: string, data: unknown) => {
      if (response.destroyed || response.writableEnded || controller.signal.aborted) return;
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (!response.destroyed && !response.writableEnded && !controller.signal.aborted) {
        response.write(": keep-alive\n\n");
      }
    }, 15_000);
    try {
      const result = await run((delta) => send("delta", { delta }), controller.signal);
      send("result", result);
    } catch (error) {
      if (controller.signal.aborted) return;
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
      response.removeListener("close", handleClose);
      if (!response.destroyed && !response.writableEnded) response.end();
    }
  }
}
