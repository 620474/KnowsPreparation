import { IsObject } from "class-validator";

export class ResearchPayloadDto {
  @IsObject()
  data!: Record<string, unknown>;
}
