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
import { ResearchService } from "../learning/research.service";
import { ResearchPayloadDto } from "./dto/research-payload.dto";
import { ResearchAgentService } from "./research-agent.service";

@UseGuards(JwtAuthGuard)
@Controller("learning/research")
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly researchAgentService: ResearchAgentService,
    private readonly examAiLock: ExamAiLockService,
  ) {}

  @Get("projects")
  @Header("Cache-Control", "private, no-store")
  listProjects() {
    return this.researchService.listProjects();
  }

  @Post("projects")
  createProject(@Body() dto: ResearchPayloadDto) {
    return this.researchService.createProject(dto.data);
  }

  @Get("projects/:projectId")
  @Header("Cache-Control", "private, no-store")
  getWorkspace(@Param("projectId") projectId: string) {
    return this.researchService.getWorkspace(projectId);
  }

  @Patch("projects/:projectId")
  updateProject(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateProject(projectId, dto.data);
  }

  @Delete("projects/:projectId")
  deleteProject(@Param("projectId") projectId: string) {
    return this.researchService.deleteProject(projectId);
  }

  @Post("projects/:projectId/evidence")
  createEvidence(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.createEvidence(projectId, dto.data);
  }

  @Patch("projects/:projectId/evidence/:evidenceId")
  updateEvidence(
    @Param("projectId") projectId: string,
    @Param("evidenceId") evidenceId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateEvidence(projectId, evidenceId, dto.data);
  }

  @Delete("projects/:projectId/evidence/:evidenceId")
  deleteEvidence(
    @Param("projectId") projectId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.researchService.deleteEvidence(projectId, evidenceId);
  }

  @Post("projects/:projectId/claims")
  createClaim(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.createClaim(projectId, dto.data);
  }

  @Patch("projects/:projectId/claims/:claimId")
  updateClaim(
    @Param("projectId") projectId: string,
    @Param("claimId") claimId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateClaim(projectId, claimId, dto.data);
  }

  @Delete("projects/:projectId/claims/:claimId")
  deleteClaim(
    @Param("projectId") projectId: string,
    @Param("claimId") claimId: string,
  ) {
    return this.researchService.deleteClaim(projectId, claimId);
  }

  @Patch("projects/:projectId/actions/:actionId")
  updateActionStatus(
    @Param("projectId") projectId: string,
    @Param("actionId") actionId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchService.updateActionStatus(projectId, actionId, dto.data);
  }

  @Post("projects/:projectId/agent-runs")
  async startAgentRun(
    @Param("projectId") projectId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    await this.examAiLock.assertAvailable();
    return this.researchAgentService.startRun(projectId, dto.data);
  }

  @Get("projects/:projectId/agent-runs/latest")
  @Header("Cache-Control", "private, no-store")
  getLatestAgentRun(@Param("projectId") projectId: string) {
    return this.researchAgentService.getLatestRun(projectId);
  }

  @Get("projects/:projectId/agent-runs/:runId")
  @Header("Cache-Control", "private, no-store")
  getAgentRun(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
  ) {
    return this.researchAgentService.getRun(projectId, runId);
  }

  @Post("projects/:projectId/agent-runs/:runId/cancel")
  cancelAgentRun(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
  ) {
    return this.researchAgentService.cancelRun(projectId, runId);
  }

  @Post("projects/:projectId/agent-runs/:runId/apply")
  applyAgentRun(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
    @Body() dto: ResearchPayloadDto,
  ) {
    return this.researchAgentService.applyRun(projectId, runId, dto.data);
  }
}
