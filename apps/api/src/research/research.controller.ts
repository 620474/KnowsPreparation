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
import { ResearchService } from "../learning/research.service";
import { ResearchPayloadDto } from "./dto/research-payload.dto";

@UseGuards(JwtAuthGuard)
@Controller("learning/research")
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

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
}
