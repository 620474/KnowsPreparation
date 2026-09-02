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

export class SubmitInterviewExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  solution!: string;
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
