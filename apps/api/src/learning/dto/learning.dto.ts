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
  @IsString()
  @MaxLength(80)
  operationId?: string;
}

export class UpdateMockAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content!: string;
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
