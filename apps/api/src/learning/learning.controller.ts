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
import { ExamAiLockService } from "../agents/exam-ai-lock.service";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  GenerateAdaptivePlanDto,
  GradeYandexMockResponseDto,
  GetLearningAnalyticsDto,
  ImportBackupDto,
  ListInterviewSessionsDto,
  ListPracticeAttemptsDto,
  LearningMissionActionDto,
  ReviewQuestionDto,
  SubmitQuestionAttemptDto,
  SubmitTransferAssessmentDto,
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
import { MasteryService } from "./mastery/mastery.service";
import { MasteryV2Service } from "./mastery/mastery-v2.service";
import { LearningMissionService } from "./learning-mission.service";

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
    private readonly examAiLock: ExamAiLockService,
    private readonly yandexPlatformMockService: YandexPlatformMockService,
    private readonly masteryService: MasteryService,
    private readonly masteryV2Service: MasteryV2Service,
    private readonly missionService: LearningMissionService,
  ) {}

  @Get("knowledge/skills")
  @Header("Cache-Control", "private, max-age=300")
  listSkills() {
    return this.masteryService.listSkills();
  }

  @Get("knowledge/overview")
  @Header("Cache-Control", "private, no-store")
  knowledgeOverview(@Query("target") target?: string) {
    return this.masteryService.getOverview(target);
  }

  @Get("knowledge/skills/:skillId")
  @Header("Cache-Control", "private, no-store")
  skillDetail(@Param("skillId") skillId: string) {
    return this.masteryService.getSkillDetail(skillId);
  }

  @Get("knowledge/v2/overview")
  @Header("Cache-Control", "private, no-store")
  knowledgeOverviewV2(@Query("target") target?: string) {
    return this.masteryV2Service.getOverview(target);
  }

  @Get("knowledge/v2/comparison")
  @Header("Cache-Control", "private, no-store")
  masteryComparison(@Query("target") target?: string) {
    return this.masteryService.compareWithV2(target);
  }

  @Get("knowledge/v2/skills/:skillId")
  @Header("Cache-Control", "private, no-store")
  skillDetailV2(@Param("skillId") skillId: string) {
    return this.masteryV2Service.getSkillDetail(skillId);
  }

  @Get("adaptive/today")
  @Header("Cache-Control", "private, no-store")
  adaptiveToday() {
    return this.adaptivePlanService.getToday();
  }

  @Post("adaptive/today/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async generateAdaptiveToday(@Body() dto: GenerateAdaptivePlanDto) {
    await this.examAiLock.assertAvailable();
    return this.adaptivePlanService.generateToday(dto);
  }

  @Post("adaptive/today/skip")
  skipAdaptiveRecommendation(@Body() dto: SkipAdaptiveRecommendationDto) {
    return this.adaptivePlanService.skipRecommendation(
      dto.recommendationId,
      dto.operationId,
    );
  }

  @Get("missions/today")
  @Header("Cache-Control", "private, no-store")
  missionsToday(@Query("target") target?: string) {
    return this.missionService.getToday(target);
  }

  @Get("missions/:missionId")
  @Header("Cache-Control", "private, no-store")
  mission(@Param("missionId") missionId: string) {
    return this.missionService.getMission(missionId);
  }

  @Post("missions/:missionId/actions")
  updateMission(
    @Param("missionId") missionId: string,
    @Body() dto: LearningMissionActionDto,
  ) {
    return this.missionService.applyAction(missionId, dto.action, dto);
  }

  @Post("missions/:missionId/transfer-attempts")
  submitTransferAssessment(
    @Param("missionId") missionId: string,
    @Body() dto: SubmitTransferAssessmentDto,
  ) {
    return this.missionService.submitTransferAssessment(missionId, dto);
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
  async generateAiCourse(@Body() dto: GenerateAiCourseDto) {
    await this.examAiLock.assertAvailable();
    return this.learningService.generateAiCourse(dto);
  }

  @Post("tracks/:trackKey/items/:itemId/lesson")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async generateTrackLesson(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
  ) {
    await this.examAiLock.assertAvailable();
    return this.learningService.generateTrackLesson(trackKey, itemId);
  }

  @Post("tracks/:trackKey/items/:itemId/lesson/stream")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async streamTrackLesson(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Res() response: Response,
  ) {
    await this.examAiLock.assertAvailable();
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
  async sendTrackChatMessage(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
  ) {
    await this.examAiLock.assertAvailable();
    return this.learningService.sendTrackChatMessage(trackKey, itemId, dto);
  }

  @Post("tracks/:trackKey/items/:itemId/chat/stream")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  async streamTrackChatMessage(
    @Param("trackKey", ParseTrackKeyPipe) trackKey: TrackKey,
    @Param("itemId") itemId: string,
    @Body() dto: SendAiChatMessageDto,
    @Res() response: Response,
  ) {
    await this.examAiLock.assertAvailable();
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

  @Post("questions/:questionId/attempts")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  submitQuestionAttempt(
    @Param("questionId") questionId: string,
    @Body() dto: SubmitQuestionAttemptDto,
  ) {
    return this.learningService.submitQuestionAttempt(questionId, dto);
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
  async completeMockInterview(@Param("interviewId") interviewId: string) {
    await this.examAiLock.assertAvailable();
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
  async transcribeMockAnswer(
    @Param("interviewId") interviewId: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    if (!audio) throw new BadRequestException("Добавь аудиозапись ответа");
    await this.examAiLock.assertAvailable();
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
