import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiObservabilityService } from "./ai-observability.service";
import { DecisionV8Service } from "./decision-v8.service";
import {
  CreateTargetProfileV2Dto,
  FreezeReadinessV8Dto,
  GetDecisionPlanV8Dto,
  RecordReadinessOutcomeV2Dto,
} from "./dto/learning.dto";
import { MasteryV3Service } from "./mastery/mastery-v3.service";
import { TargetProfileService } from "./target-profile.service";

@UseGuards(JwtAuthGuard)
@Controller({ path: "learning", version: "2" })
export class LearningV2Controller {
  constructor(
    private readonly targets: TargetProfileService,
    private readonly mastery: MasteryV3Service,
    private readonly decisions: DecisionV8Service,
    private readonly aiObservability: AiObservabilityService,
  ) {}

  @Get("targets")
  listTargets() {
    return this.targets.list();
  }

  @Post("targets/from-vacancy")
  createTarget(@Body() dto: CreateTargetProfileV2Dto) {
    return this.targets.createFromVacancy({
      vacancyText: dto.vacancyText,
      company: dto.company ?? null,
      role: dto.role ?? null,
      seniority: dto.seniority ?? null,
      interviewAt: dto.interviewAt ?? null,
    });
  }

  @Get("knowledge/overview")
  @Header("Cache-Control", "private, no-store")
  overview(@Query("targetId") targetId?: string) {
    return this.mastery.getOverview(targetId);
  }

  @Get("knowledge/skills/:skillId")
  @Header("Cache-Control", "private, no-store")
  skillDetail(@Param("skillId") skillId: string, @Query("targetId") targetId?: string) {
    return this.mastery.getSkillDetail(skillId, targetId);
  }

  @Get("decision/today")
  @Header("Cache-Control", "private, no-store")
  decision(@Query() dto: GetDecisionPlanV8Dto) {
    return this.decisions.getPlan(dto.targetId, dto.availableMinutes);
  }

  @Post("readiness/snapshots")
  freezeReadiness(@Body() dto: FreezeReadinessV8Dto) {
    return this.mastery.freezeReadiness(dto.targetId, dto.applicationId ?? null);
  }

  @Post("readiness/outcomes")
  recordOutcome(@Body() dto: RecordReadinessOutcomeV2Dto) {
    return this.mastery.recordOutcome({
      snapshotId: dto.snapshotId,
      company: dto.company ?? null,
      technicalPassed: dto.technicalPassed,
      codingPassed: dto.codingPassed ?? null,
      topics: dto.topics ?? [],
      notes: dto.notes ?? "",
      occurredAt: dto.occurredAt,
    });
  }

  @Get("readiness/calibration")
  @Header("Cache-Control", "private, no-store")
  calibration(@Query("targetId") targetId?: string) {
    return this.mastery.calibration(targetId);
  }

  @Get("ai/observability")
  @Header("Cache-Control", "private, no-store")
  observability(@Query("days") days?: string) {
    const parsed = Number(days);
    return this.aiObservability.summary(
      Number.isFinite(parsed) ? Math.min(90, Math.max(1, parsed)) : 30,
    );
  }
}
