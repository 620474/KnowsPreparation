import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { DIFFICULTIES, type Difficulty } from "../schemas/algorithm-entry.schema";
import { AI_LEVELS, type AiLevel } from "../schemas/ai-course.schema";
import {
  QUESTION_STATUSES,
  type QuestionStatus,
} from "../schemas/question-progress.schema";

export class UpdateSettingsDto {
  @IsDateString({ strict: true })
  startDate!: string;
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
