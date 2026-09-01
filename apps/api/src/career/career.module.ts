import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agents/agent.module";
import { CareerController } from "./career.controller";
import { CareerService } from "./career.service";
import {
  CareerActivityEntry,
  CareerActivityEntrySchema,
} from "./schemas/career-activity.schema";
import {
  CareerApplicationEntry,
  CareerApplicationEntrySchema,
} from "./schemas/career-application.schema";
import {
  CareerSettingsEntry,
  CareerSettingsEntrySchema,
} from "./schemas/career-settings.schema";

@Module({
  imports: [
    AuthModule,
    AgentModule,
    MongooseModule.forFeature([
      { name: CareerActivityEntry.name, schema: CareerActivityEntrySchema },
      { name: CareerApplicationEntry.name, schema: CareerApplicationEntrySchema },
      { name: CareerSettingsEntry.name, schema: CareerSettingsEntrySchema },
    ]),
  ],
  controllers: [CareerController],
  providers: [CareerService],
  exports: [MongooseModule],
})
export class CareerModule {}
