import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCheckpointV9Dto, RecordInterviewOutcomeV3Dto, SubmitCheckpointAttemptV9Dto } from "./dto/learning.dto";
import { VerificationV9Service } from "./verification-v9.service";

@UseGuards(JwtAuthGuard)
@Controller({ path: "learning", version: "3" })
export class LearningV3Controller {
  constructor(private readonly verification: VerificationV9Service) {}

  @Post("checkpoints") createCheckpoint(@Body() dto: CreateCheckpointV9Dto) { return this.verification.createCheckpoint(dto.targetId, dto.availableMinutes); }
  @Get("checkpoints/:sessionId") getCheckpoint(@Param("sessionId") sessionId: string) { return this.verification.getCheckpoint(sessionId); }
  @Post("checkpoints/:sessionId/next") nextItem(@Param("sessionId") sessionId: string) { return this.verification.nextItem(sessionId); }
  @Post("checkpoints/:sessionId/attempts") submitAttempt(@Param("sessionId") sessionId: string, @Body() dto: SubmitCheckpointAttemptV9Dto) { return this.verification.submitAttempt(sessionId, dto); }
  @Post("checkpoints/:sessionId/complete") complete(@Param("sessionId") sessionId: string) { return this.verification.completeCheckpoint(sessionId); }
  @Post("checkpoints/:sessionId/abort") abort(@Param("sessionId") sessionId: string) { return this.verification.abortCheckpoint(sessionId); }
  @Get("readiness") @Header("Cache-Control", "private, no-store") readiness(@Query("targetId") targetId?: string) { return this.verification.readiness(targetId); }
  @Get("decision/today") @Header("Cache-Control", "private, no-store") decision(@Query("targetId") targetId?: string, @Query("availableMinutes") minutes?: string) { return this.verification.decision(targetId, Math.min(360, Math.max(5, Number(minutes) || 60))); }
  @Post("readiness/snapshots") freeze(@Body("targetId") targetId = "general") { return this.verification.freezeReadiness(targetId); }
  @Post("interview-outcomes") outcome(@Body() dto: RecordInterviewOutcomeV3Dto) { return this.verification.recordOutcome(dto); }
}
