import { IsObject } from "class-validator";

export class CareerPayloadDto {
  @IsObject()
  data!: Record<string, unknown>;
}
