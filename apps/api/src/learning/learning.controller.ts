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
  Query,
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
  GradeYandexMockResponseDto,
  GetLearningAnalyticsDto,
  ImportBackupDto,
  ListInterviewSessionsDto,
  ListPracticeAttemptsDto,
  ReviewQuestionDto,
  SendAiChatMessageDto,
  SkipAdaptiveRecommendationDto,
  StartInterviewSessionDto,
  SubmitInterviewExerciseDto,
  SubmitLessonQuizDto,
  SubmitPracticeAttemptDto,
  UpdateMockAnswerDto,
  UpdateInterviewDefenseAnswerDto,
  UpdateInterviewPlatformAnswerDto,
  UpdatePracticeSolutionDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
  SendInterviewAiMessageDto,
  SaveYandexMockResponseDto,
  ResearchPayloadDto,
} from "./dto/learning.dto";
import { InterviewSessionService } from "./interview-session.service";
import { LearningService } from "./learning.service";
import { AdaptivePlanService } from "./adaptive-plan.service";
import { LearningAnalyticsService } from "./learning-analytics.service";
import { LearningBackupService } from "./learning-backup.service";
import { LearningBootstrapService } from "./learning-bootstrap.service";
import { ParseTrackKeyPipe } from "./parse-track-key.pipe";
import type { TrackKey } from "./track-registry";
import { YandexPlatformMockService } from "./yandex-platform-mock.service";
import { ResearchService } from "./research.service";

@UseGuards(JwtAuthGuard)
@Controller("learning")
export class LearningController {
  private readonly logger = new Logger(LearningController.name);

  constructor(
    private readonly learningService: LearningService,
    private readonly adaptivePlanService: AdaptivePlanService,
    private readonly analyticsService: LearningAnalyticsService,
    private readonly bootstrapService: LearningBootstrapService,
    private readonly backupService: LearningBackupService,
    private readonly interviewSessionService: InterviewSessionService,
    private readonly yandexPlatformMockService: YandexPlatformMockService,
    private readonly researchService: ResearchService,
  ) {}

  @Get("research/projects")
  @Header("Cache-Control", "private, no-store")
  listResearchProjects() {
    return this.researchService.listProjects();
  }

  @Post("research/projects")
  createResearchProject(@Body() dto: ResearchPayloadDto) {
    return this.researchService.createProject(dto.data);
  }

  @Get("research/projects/:projectId")
  @Header("Cache-Control", "private, no-store")
  getResearchWorkspace(@Param("projectId") projectId: string) {
    return this.researchService.getWorkspace(projectId);
  }

  @Patch("research/projects/:projectId")
  updateResearchProject(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateProject(projectId, dto.data);
  }

  @Delete("research/projects/:projectId")
  deleteResearchProject(@Param("projectId") projectId: string) {
    return this.researchService.deleteProject(projectId);
  }

  @Post("research/projects/:projectId/evidence")
  createResearchEvidence(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.createEvidence(projectId, dto.data);
  }

  @Patch("research/projects/:projectId/evidence/:evidenceId")
  updateResearchEvidence(
    @Param("projectId") projectId: string,
    @Param("evidenceId") evidenceId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateEvidence(projectId, evidenceId, dto.data);
  }

  @Delete("research/projects/:projectId/evidence/:evidenceId")
  deleteResearchEvidence(
    @Param("projectId") projectId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.researchService.deleteEvidence(projectId, evidenceId);
  }

  @Post("research/projects/:projectId/claims")
  createResearchClaim(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.createClaim(projectId, dto.data);
  }

  @Patch("research/projects/:projectId/claims/:claimId")
  updateResearchClaim(
    @Param("projectId") projectId: string,
    @Param("claimId") claimId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateClaim(projectId, claimId, dto.data);
  }

  @Delete("research/projects/:projectId/claims/:claimId")
  deleteResearchClaim(
    @Param("projectId") projectId: string,
    @Param("claimId") claimId: string,
  ) {
    return this.researchService.deleteClaim(projectId, claimId);
  }

  @Get("adaptive/today")
  @Header("Cache-Control", "private, no-store")
  adaptiveToday() {
    return this.adaptivePlanService.getToday();
  }

  @Post("adaptive/today/skip")
  skipAdaptiveRecommendation(@Body() dto: SkipAdaptiveRecommendationDto) {
    return this.adaptivePlanService.skipRecommendation(
      dto.recommendationId,
      dto.operationId,
    );
  }

  @Get("analytics")
  @Header("Cache-Control", "private, no-store")
  learningAnalytics(@Query() dto: GetLearningAnalyticsDto) {
    return this.analyticsService.getAnalytics(dto.days);
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

  @Post("tracks/:trackKey/items/:itemId/lesson")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateTrackLesson(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
  ) {
    return this.learningService.generateTrackLesson(trackKey, itemId);
  }

  @Post("tracks/:trackKey/items/:itemId/lesson/stream")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  streamTrackLesson(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.generateTrackLesson(trackKey, itemId, onDelta, signal),
    );
  }

  @Post("tracks/:trackKey/items/:itemId/quiz")
  submitTrackQuiz(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SubmitLessonQuizDto,
  ) {
    return this.learningService.submitTrackQuiz(trackKey, itemId, dto);
  }

  @Put("tracks/:trackKey/items/:itemId/practice")
  saveTrackPracticeSolution(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: UpdatePracticeSolutionDto,
  ) {
    return this.learningService.saveTrackPracticeSolution(trackKey, itemId, dto);
  }

  @Get("tracks/:trackKey/items/:itemId/practice/attempts")
  listTrackPracticeAttempts(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Query() dto: ListPracticeAttemptsDto,
  ) {
    return this.learningService.listTrackPracticeAttempts(trackKey, itemId, dto);
  }

  @Post("tracks/:trackKey/items/:itemId/practice/attempts")
  submitTrackPracticeAttempt(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SubmitPracticeAttemptDto,
  ) {
    return this.learningService.submitTrackPracticeAttempt(trackKey, itemId, dto);
  }

  @Get("tracks/:trackKey/items/:itemId/chat")
  getTrackChat(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
  ) {
    return this.learningService.getTrackChat(trackKey, itemId);
  }

  @Post("tracks/:trackKey/items/:itemId/chat")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  sendTrackChatMessage(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
  ) {
    return this.learningService.sendTrackChatMessage(trackKey, itemId, dto);
  }

  @Post("tracks/:trackKey/items/:itemId/chat/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  streamTrackChatMessage(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta, signal) =>
      this.learningService.sendTrackChatMessage(trackKey, itemId, dto, onDelta, signal),
    );
  }

  @Delete("tracks/:trackKey/items/:itemId/chat")
  clearTrackChat(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
  ) {
    return this.learningService.clearTrackChat(trackKey, itemId);
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

  @Get("yandex-platform-mocks/:dayId")
  @Header("Cache-Control", "private, no-store")
  getYandexPlatformMock(@Param("dayId") dayId: string) {
    return this.yandexPlatformMockService.getLatest(dayId);
  }

  @Post("yandex-platform-mocks/:dayId")
  startYandexPlatformMock(@Param("dayId") dayId: string) {
    return this.yandexPlatformMockService.start(dayId);
  }

  @Put("yandex-platform-mocks/attempts/:attemptId/questions/:questionId")
  saveYandexPlatformMockResponse(
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SaveYandexMockResponseDto,
  ) {
    return this.yandexPlatformMockService.saveResponse(attemptId, questionId, dto);
  }

  @Put("yandex-platform-mocks/attempts/:attemptId/questions/:questionId/grade")
  gradeYandexPlatformMockResponse(
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: GradeYandexMockResponseDto,
  ) {
    return this.yandexPlatformMockService.gradeResponse(attemptId, questionId, dto);
  }

  @Post("yandex-platform-mocks/attempts/:attemptId/complete")
  completeYandexPlatformMock(@Param("attemptId") attemptId: string) {
    return this.yandexPlatformMockService.complete(attemptId);
  }

  @Get("interview-sessions/current")
  @Header("Cache-Control", "private, no-store")
  getCurrentInterviewSession() {
    return this.interviewSessionService.getCurrent();
  }

  @Get("interview-sessions")
  @Header("Cache-Control", "private, no-store")
  listInterviewSessions(@Query() dto: ListInterviewSessionsDto) {
    return this.interviewSessionService.list(dto.limit);
  }

  @Post("interview-sessions")
  startInterviewSession(@Body() dto: StartInterviewSessionDto) {
    return this.interviewSessionService.start(dto);
  }

  @Put("interview-sessions/:interviewId/platform/:questionId")
  updateInterviewPlatformAnswer(
    @Param("interviewId") interviewId: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateInterviewPlatformAnswerDto,
  ) {
    return this.interviewSessionService.updatePlatformAnswer(
      interviewId,
      questionId,
      dto,
    );
  }

  @Post("interview-sessions/:interviewId/coding/attempt")
  submitInterviewCodingAttempt(
    @Param("interviewId") interviewId: string,
    @Body() dto: SubmitInterviewExerciseDto,
  ) {
    return this.interviewSessionService.submitCodingAttempt(interviewId, dto);
  }

  @Post("interview-sessions/:interviewId/coding/complete")
  completeInterviewCoding(@Param("interviewId") interviewId: string) {
    return this.interviewSessionService.completeCoding(interviewId);
  }

  @Post("interview-sessions/:interviewId/ai/messages")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  sendInterviewAiMessage(
    @Param("interviewId") interviewId: string,
    @Body() dto: SendInterviewAiMessageDto,
  ) {
    return this.interviewSessionService.sendAiMessage(interviewId, dto);
  }

  @Post("interview-sessions/:interviewId/ai/messages/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  streamInterviewAiMessage(
    @Param("interviewId") interviewId: string,
    @Body() dto: SendInterviewAiMessageDto,
    @Res() response: Response,
  ) {
    return this.streamResponse(response, (onDelta, signal) =>
      this.interviewSessionService.sendAiMessage(
        interviewId,
        dto,
        onDelta,
        signal,
      ),
    );
  }

  @Post("interview-sessions/:interviewId/ai/attempt")
  submitInterviewAiAttempt(
    @Param("interviewId") interviewId: string,
    @Body() dto: SubmitInterviewExerciseDto,
  ) {
    return this.interviewSessionService.submitAiAttempt(interviewId, dto);
  }

  @Post("interview-sessions/:interviewId/ai/complete")
  completeInterviewAi(@Param("interviewId") interviewId: string) {
    return this.interviewSessionService.completeAi(interviewId);
  }

  @Put("interview-sessions/:interviewId/defense/:index")
  updateInterviewDefenseAnswer(
    @Param("interviewId") interviewId: string,
    @Param("index") index: string,
    @Body() dto: UpdateInterviewDefenseAnswerDto,
  ) {
    return this.interviewSessionService.updateDefenseAnswer(
      interviewId,
      Number(index),
      dto,
    );
  }

  @Post("interview-sessions/:interviewId/complete")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  completeInterviewSession(@Param("interviewId") interviewId: string) {
    return this.interviewSessionService.complete(interviewId);
  }

  @Post("interview-sessions/:interviewId/transcribe")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) =>
        callback(null, file.mimetype.startsWith("audio/")),
    }),
  )
  transcribeInterviewAnswer(
    @Param("interviewId") interviewId: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    if (!audio) throw new BadRequestException("Добавь аудиозапись ответа");
    return this.interviewSessionService.transcribe(interviewId, audio);
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
