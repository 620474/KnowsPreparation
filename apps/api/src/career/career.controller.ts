import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ExamAiLockService } from "../agents/exam-ai-lock.service";
import { CareerService } from "./career.service";
import { CareerPayloadDto } from "./dto/career-payload.dto";

@UseGuards(JwtAuthGuard)
@Controller("career")
export class CareerController {
  constructor(
    private readonly careerService: CareerService,
    private readonly examAiLock: ExamAiLockService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  getWorkspace() {
    return this.careerService.getWorkspace();
  }

  @Post("applications")
  createApplication(@Body() dto: CareerPayloadDto) {
    return this.careerService.createApplication(dto.data);
  }

  @Patch("applications/:applicationId")
  updateApplication(
    @Param("applicationId") applicationId: string,
    @Body() dto: CareerPayloadDto,
  ) {
    return this.careerService.updateApplication(applicationId, dto.data);
  }

  @Delete("applications/:applicationId")
  deleteApplication(@Param("applicationId") applicationId: string) {
    return this.careerService.deleteApplication(applicationId);
  }

  @Post("applications/:applicationId/analyze")
  async analyzeApplication(@Param("applicationId") applicationId: string) {
    await this.examAiLock.assertAvailable();
    return this.careerService.analyzeApplication(applicationId);
  }

  @Post("applications/:applicationId/interviews")
  createInterview(
    @Param("applicationId") applicationId: string,
    @Body() dto: CareerPayloadDto,
  ) {
    return this.careerService.createInterview(applicationId, dto.data);
  }

  @Patch("applications/:applicationId/interviews/:interviewId")
  updateInterview(
    @Param("applicationId") applicationId: string,
    @Param("interviewId") interviewId: string,
    @Body() dto: CareerPayloadDto,
  ) {
    return this.careerService.updateInterview(applicationId, interviewId, dto.data);
  }

  @Delete("applications/:applicationId/interviews/:interviewId")
  deleteInterview(
    @Param("applicationId") applicationId: string,
    @Param("interviewId") interviewId: string,
  ) {
    return this.careerService.deleteInterview(applicationId, interviewId);
  }

  @Patch("settings")
  updateSettings(@Body() dto: CareerPayloadDto) {
    return this.careerService.updateSettings(dto.data);
  }

  @Post("activities")
  createActivity(@Body() dto: CareerPayloadDto) {
    return this.careerService.createActivity(dto.data);
  }

  @Delete("activities/:activityId")
  deleteActivity(@Param("activityId") activityId: string) {
    return this.careerService.deleteActivity(activityId);
  }
}
