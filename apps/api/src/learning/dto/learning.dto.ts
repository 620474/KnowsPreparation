import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type {
  InterviewSessionCompany,
  InterviewSessionMode,
  PracticeAttemptSource,
} from "@prep/contracts";

import {
  INTERVIEW_SESSION_COMPANIES,
  INTERVIEW_SESSION_MODES,
} from "../schemas/interview-session.schema";

import { DIFFICULTIES, type Difficulty } from "../schemas/algorithm-entry.schema";
import { AI_LEVELS, type AiLevel } from "../schemas/ai-course.schema";
import {
  QUESTION_STATUSES,
  REVIEW_RATINGS,
  type QuestionStatus,
  type ReviewRating,
} from "../schemas/question-progress.schema";

export class UpdateSettingsDto {
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  reminderTime?: string;

  @IsOptional()
  @IsBoolean()
  adaptiveTodayEnabled?: boolean;
}

export class GetLearningAnalyticsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 30])
  days = 30;
}

export class SkipAdaptiveRecommendationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  recommendationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;
}

export class GenerateAdaptivePlanDto {
  @IsInt()
  @Min(15)
  @Max(360)
  availableMinutes!: number;

  @IsIn(["low", "normal", "high"])
  energy!: "low" | "normal" | "high";

  @IsIn(["mixed", "yandex", "ozon", "core", "job_search"])
  focus!: "mixed" | "yandex" | "ozon" | "core" | "job_search";

  @IsString()
  @MaxLength(1000)
  note!: string;
}

export class LearningMissionActionDto {
  @IsIn(["start", "complete_intervention", "defer", "skip"])
  action!: "start" | "complete_intervention" | "defer" | "skip";

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  deferredUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class SubmitTransferAssessmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  answer!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  confidence!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  responseTimeMs!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;
}

export class CreateCheckpointV9Dto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  targetId = "general";

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  availableMinutes!: number;
}

export class SubmitCheckpointAttemptV9Dto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  leaseId!: string;

  @IsString() @MinLength(1) @MaxLength(80) operationId!: string;
  @IsString() @MinLength(1) @MaxLength(50_000) answer!: string;
  @IsOptional() @IsString() @MaxLength(8_000) explanation?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) selectedOptionIndex?: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) confidenceBefore!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) confidenceAfter?: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(3_600_000) durationMs!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) runCount = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) failedTestCount = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) revisionCount = 0;
  @IsOptional() @IsBoolean() networkInterrupted = false;
  @IsOptional() @IsIn(["mobile", "desktop", "unknown"]) deviceClass: "mobile" | "desktop" | "unknown" = "unknown";
}

export class RecordInterviewOutcomeV3Dto {
  @IsString() @MinLength(1) @MaxLength(80) operationId!: string;
  @IsString() @MinLength(1) @MaxLength(80) snapshotId!: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(200) role?: string;
  @IsIn(["screening", "technical", "live_coding", "system_design", "final"]) stage!: "screening" | "technical" | "live_coding" | "system_design" | "final";
  @IsIn(["passed", "failed", "pending", "withdrawn"]) result!: "passed" | "failed" | "pending" | "withdrawn";
  @IsArray() @ArrayMaxSize(30) questions!: Array<Record<string, unknown>>;
  @IsOptional() @IsString() @MaxLength(4_000) feedback?: string;
  @IsDateString({ strict: true }) occurredAt!: string;
}

export class ImportBackupDto {
  @IsObject()
  backup!: Record<string, unknown>;
}

export class GenerateAiCourseDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  goal!: string;

  @IsIn(AI_LEVELS)
  level!: AiLevel;

  @IsDateString({ strict: true })
  deadline!: string;

  @IsInt()
  @Min(30)
  @Max(240)
  dailyMinutes!: number;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  targetCompanies!: string[];

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  weakTopics!: string[];
}

export class SendAiChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content!: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  customTask?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  solution?: string;
}

export class UpdateQuestionDto {
  @IsIn(QUESTION_STATUSES)
  status!: QuestionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}

export class ReviewQuestionDto {
  @IsIn(REVIEW_RATINGS)
  rating!: ReviewRating;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  operationId?: string;
}

export class SubmitQuestionAttemptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  explanation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  selectedOptionIndex?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  confidence!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  responseTimeMs!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;
}

export class LessonQuizAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedOptionIndex!: number;
}

export class SubmitLessonQuizDto {
  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LessonQuizAnswerDto)
  answers!: LessonQuizAnswerDto[];

  @IsOptional()
  @IsIn(["core", "deep"])
  tier?: "core" | "deep";

  @IsOptional()
  @IsString()
  @MaxLength(80)
  operationId?: string;
}

export class UpdatePracticeSolutionDto {
  @IsInt()
  @Min(1)
  lessonVersion!: number;

  @IsString()
  @MaxLength(12_000)
  solution!: string;

  @IsInt()
  @Min(0)
  baseRevision!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;
}

export class SubmitPracticeAttemptDto {
  @IsIn(["task", "lesson"])
  source!: PracticeAttemptSource;

  @IsOptional()
  @IsInt()
  @Min(1)
  lessonVersion?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  solution!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  responseTimeMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  runCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000)
  hintCount?: number;

  @IsOptional()
  @IsBoolean()
  aiAssisted?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  confidence?: number;
}

export class ListPracticeAttemptsDto {
  @IsIn(["task", "lesson"])
  source!: PracticeAttemptSource;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;
}

export class UpdateMockAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content!: string;
}

export class SaveYandexMockResponseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  response!: string;
}

export class GradeYandexMockResponseDto {
  @IsIn(["correct", "incorrect"])
  verdict!: "correct" | "incorrect";
}

export class StartInterviewSessionDto {
  @IsIn(INTERVIEW_SESSION_MODES)
  mode!: InterviewSessionMode;

  @IsIn(INTERVIEW_SESSION_COMPANIES)
  company!: InterviewSessionCompany;

  @IsOptional()
  @IsIn(["training", "exam"])
  kind?: "training" | "exam";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  applicationId?: string;
}

export class ListInterviewSessionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class UpdateInterviewPlatformAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  followUpAnswer?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  secondFollowUpAnswer?: string;
}

export class SubmitInterviewTurnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  answer!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  operationId!: string;
}

export class CreateTargetProfileV2Dto {
  @IsString()
  @MinLength(20)
  @MaxLength(30_000)
  vacancyText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  seniority?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  interviewAt?: string;
}

export class FreezeReadinessV8Dto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  applicationId?: string;
}

export class RecordReadinessOutcomeV2Dto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  snapshotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsBoolean()
  technicalPassed!: boolean;

  @IsOptional()
  @IsBoolean()
  codingPassed?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  topics?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  notes?: string;

  @IsDateString({ strict: true })
  occurredAt!: string;
}

export class GetDecisionPlanV8Dto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  targetId = "general";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(360)
  availableMinutes = 90;
}

export class CreateReadinessPredictionDto {
  @IsIn(INTERVIEW_SESSION_COMPANIES)
  targetId!: InterviewSessionCompany;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  applicationId?: string | null;
}

export class CreateReadinessOutcomeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  predictionSnapshotId!: string;

  @IsIn(INTERVIEW_SESSION_COMPANIES)
  company!: InterviewSessionCompany;

  @IsBoolean()
  technicalPassed!: boolean;

  @IsOptional()
  @IsBoolean()
  codingPassed?: boolean | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  notes?: string;

  @IsString()
  occurredAt!: string;
}

export class SubmitInterviewExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  solution!: string;

  @IsOptional()
  @IsObject()
  telemetry?: {
    durationMs?: number;
    runCount?: number;
    failedTestCount?: number;
    revisionCount?: number;
  };
}

export class SendInterviewAiMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  solution?: string;
}

export class UpdateInterviewDefenseAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  answer!: string;
}

export class CreateAlgorithmDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  pattern!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: Difficulty;

  @IsDateString({ strict: true })
  solvedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
