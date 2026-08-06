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

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateAlgorithmDto,
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
