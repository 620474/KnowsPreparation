import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";
import { AlgorithmEntry, AlgorithmEntrySchema } from "./schemas/algorithm-entry.schema";
import {
  QuestionProgress,
  QuestionProgressSchema,
} from "./schemas/question-progress.schema";
import { Settings, SettingsSchema } from "./schemas/settings.schema";
import { TaskProgress, TaskProgressSchema } from "./schemas/task-progress.schema";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: TaskProgress.name, schema: TaskProgressSchema },
      { name: QuestionProgress.name, schema: QuestionProgressSchema },
      { name: AlgorithmEntry.name, schema: AlgorithmEntrySchema },
    ]),
  ],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
