import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { AgentModule } from "../agents/agent.module";
import { CareerModule } from "../career/career.module";
import { ResearchModule } from "../research/research.module";
import { AiContentService } from "./ai-content.service";
import { AdaptivePlanService } from "./adaptive-plan.service";
import { LearningAnalyticsService } from "./learning-analytics.service";
import { LearningBackupService } from "./learning-backup.service";
import { LearningBootstrapService } from "./learning-bootstrap.service";
import { LearningCleanupService } from "./learning-cleanup.service";
import { LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";
import { LearningSignalService } from "./learning-signal.service";
import { EvidenceService } from "./evidence/evidence.service";
import { MasteryService } from "./mastery/mastery.service";
import { InterviewSessionService } from "./interview-session.service";
import { YandexPlatformMockService } from "./yandex-platform-mock.service";
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
  InterviewSession,
  InterviewSessionSchema,
} from "./schemas/interview-session.schema";
import {
  QuestionProgress,
  QuestionProgressSchema,
} from "./schemas/question-progress.schema";
import {
  QuestionAttempt,
  QuestionAttemptSchema,
} from "./schemas/question-attempt.schema";
import {
  PracticeAttempt,
  PracticeAttemptSchema,
} from "./schemas/practice-attempt.schema";
import {
  LearningSignal,
  LearningSignalSchema,
} from "./schemas/learning-signal.schema";
import {
  EvidenceEvent,
  EvidenceEventSchema,
} from "./schemas/evidence-event.schema";
import {
  MasterySnapshot,
  MasterySnapshotSchema,
} from "./schemas/mastery-snapshot.schema";
import { Settings, SettingsSchema } from "./schemas/settings.schema";
import { TaskProgress, TaskProgressSchema } from "./schemas/task-progress.schema";
import {
  AdaptiveDayPlan,
  AdaptiveDayPlanSchema,
} from "./schemas/adaptive-day-plan.schema";
import {
  YandexPlatformMockAttempt,
  YandexPlatformMockAttemptSchema,
} from "./schemas/yandex-platform-mock.schema";

@Module({
  imports: [
    AuthModule,
    AgentModule,
    CareerModule,
    ResearchModule,
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: AdaptiveDayPlan.name, schema: AdaptiveDayPlanSchema },
      { name: TaskProgress.name, schema: TaskProgressSchema },
      { name: QuestionProgress.name, schema: QuestionProgressSchema },
      { name: QuestionAttempt.name, schema: QuestionAttemptSchema },
      { name: AlgorithmEntry.name, schema: AlgorithmEntrySchema },
      { name: AiCourse.name, schema: AiCourseSchema },
      { name: AiLesson.name, schema: AiLessonSchema },
      { name: AiChatMessage.name, schema: AiChatMessageSchema },
      { name: AiPracticeProgress.name, schema: AiPracticeProgressSchema },
      { name: PracticeAttempt.name, schema: PracticeAttemptSchema },
      { name: LearningSignal.name, schema: LearningSignalSchema },
      { name: EvidenceEvent.name, schema: EvidenceEventSchema },
      { name: MasterySnapshot.name, schema: MasterySnapshotSchema },
      { name: AiQuizProgress.name, schema: AiQuizProgressSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      {
        name: YandexPlatformMockAttempt.name,
        schema: YandexPlatformMockAttemptSchema,
      },
    ]),
  ],
  controllers: [LearningController],
  providers: [
    AiContentService,
    AdaptivePlanService,
    LearningAnalyticsService,
    LearningBackupService,
    LearningBootstrapService,
    LearningCleanupService,
    LearningService,
    EvidenceService,
    MasteryService,
    LearningSignalService,
    InterviewSessionService,
    YandexPlatformMockService,
  ],
})
export class LearningModule {}
