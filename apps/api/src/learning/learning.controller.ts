import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  SendAiChatMessageDto,
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

  @Post("yandex-sprint/blocks/:blockId/lesson/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateYandexLesson(@Param("blockId") blockId: string) {
    return this.learningService.generateYandexLesson(blockId);
  }

  @Post("ozon-sprint/blocks/:blockId/lesson/generate")
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  generateOzonLesson(@Param("blockId") blockId: string) {
    return this.learningService.generateOzonLesson(blockId);
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

  @Post("algorithms")
  addAlgorithm(@Body() dto: CreateAlgorithmDto) {
    return this.learningService.addAlgorithm(dto);
  }

  @Delete("algorithms/:id")
  deleteAlgorithm(@Param("id") id: string) {
    return this.learningService.deleteAlgorithm(id);
  }
}
