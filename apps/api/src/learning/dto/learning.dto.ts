import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { DIFFICULTIES, type Difficulty } from "../schemas/algorithm-entry.schema";
import {
  QUESTION_STATUSES,
  type QuestionStatus,
} from "../schemas/question-progress.schema";

export class UpdateSettingsDto {
  @IsDateString({ strict: true })
  startDate!: string;
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
