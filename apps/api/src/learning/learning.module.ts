import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { AiContentService } from "./ai-content.service";
import { LearningBackupService } from "./learning-backup.service";
import { LearningBootstrapService } from "./learning-bootstrap.service";
import { LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";
import { AlgorithmEntry, AlgorithmEntrySchema } from "./schemas/algorithm-entry.schema";
import {
  AiChatMessage,
  AiChatMessageSchema,
} from "./schemas/ai-chat-message.schema";
import {
  AiCourse,
  AiCourseSchema,
  AiLesson,
  AiLessonSchema,
} from "./schemas/ai-course.schema";
import {
  AiPracticeProgress,
  AiPracticeProgressSchema,
} from "./schemas/ai-practice-progress.schema";
import {
  AiQuizProgress,
  AiQuizProgressSchema,
} from "./schemas/ai-quiz-progress.schema";
import {
  MockInterview,
  MockInterviewSchema,
} from "./schemas/mock-interview.schema";
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
      { name: AiCourse.name, schema: AiCourseSchema },
      { name: AiLesson.name, schema: AiLessonSchema },
      { name: AiChatMessage.name, schema: AiChatMessageSchema },
      { name: AiPracticeProgress.name, schema: AiPracticeProgressSchema },
      { name: AiQuizProgress.name, schema: AiQuizProgressSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
    ]),
  ],
  controllers: [LearningController],
  providers: [
    AiContentService,
    LearningBackupService,
    LearningBootstrapService,
    LearningService,
  ],
})
export class LearningModule {}
