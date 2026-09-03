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
import { LearningV2Controller } from "./learning-v2.controller";
import { LearningV3Controller } from "./learning-v3.controller";
import { LearningService } from "./learning.service";
import { LearningSignalService } from "./learning-signal.service";
import { LearningMissionService } from "./learning-mission.service";
import { ReadinessCalibrationService } from "./readiness-calibration.service";
import { EvidenceService } from "./evidence/evidence.service";
import { EvidenceV2Service } from "./evidence/evidence-v2.service";
import { EvidenceV3Service } from "./evidence/evidence-v3.service";
import { MasteryService } from "./mastery/mastery.service";
import { MasteryV2Service } from "./mastery/mastery-v2.service";
import { MasteryV3Service } from "./mastery/mastery-v3.service";
import { TargetProfileService } from "./target-profile.service";
import { DecisionV8Service } from "./decision-v8.service";
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
  InterviewTurnEntry,
  InterviewTurnEntrySchema,
} from "./schemas/interview-turn.schema";
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
import {
  AssessmentResultV2Entry,
  AssessmentResultV2EntrySchema,
} from "./schemas/assessment-result-v2.schema";
import {
  EvidenceEventV2Entry,
  EvidenceEventV2EntrySchema,
} from "./schemas/evidence-event-v2.schema";
import {
  MasterySnapshotV2Entry,
  MasterySnapshotV2EntrySchema,
} from "./schemas/mastery-snapshot-v2.schema";
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
import { LearningMission, LearningMissionSchema } from "./schemas/learning-mission.schema";
import {
  LearningMissionEventEntry,
  LearningMissionEventEntrySchema,
} from "./schemas/learning-mission-event.schema";
import {
  TransferAssessmentAttempt,
  TransferAssessmentAttemptSchema,
} from "./schemas/transfer-assessment-attempt.schema";
import {
  ReadinessPredictionEntry,
  ReadinessPredictionEntrySchema,
} from "./schemas/readiness-prediction.schema";
import {
  ReadinessOutcomeEntry,
  ReadinessOutcomeEntrySchema,
} from "./schemas/readiness-outcome.schema";
import { AssessmentEventV3Entry, AssessmentEventV3EntrySchema } from "./schemas/assessment-event-v3.schema";
import { MasterySnapshotV3Entry, MasterySnapshotV3EntrySchema } from "./schemas/mastery-snapshot-v3.schema";
import { TargetProfileV2Entry, TargetProfileV2EntrySchema } from "./schemas/target-profile-v2.schema";
import { ReadinessSnapshotV2Entry, ReadinessSnapshotV2EntrySchema } from "./schemas/readiness-snapshot-v2.schema";
import { ReadinessOutcomeV2Entry, ReadinessOutcomeV2EntrySchema } from "./schemas/readiness-outcome-v2.schema";
import { AiInvocationEntry, AiInvocationEntrySchema } from "./schemas/ai-invocation.schema";
import { AiObservabilityService } from "./ai-observability.service";
import { VerificationV9Service } from "./verification-v9.service";
import { VerificationMigrationService } from "./verification-migration.service";
import { AssessmentEventV4Entry, AssessmentEventV4EntrySchema } from "./schemas/assessment-event-v4.schema";
import { CheckpointSessionEntry, CheckpointSessionEntrySchema } from "./schemas/checkpoint-session.schema";
import { ItemExposureEntry, ItemExposureEntrySchema } from "./schemas/item-exposure.schema";
import { ReadinessSnapshotV3Entry, ReadinessSnapshotV3EntrySchema } from "./schemas/readiness-snapshot-v3.schema";
import { InterviewOutcomeV3Entry, InterviewOutcomeV3EntrySchema } from "./schemas/interview-outcome-v3.schema";

@Module({
  imports: [
    AuthModule,
    AgentModule,
    CareerModule,
    ResearchModule,
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: AdaptiveDayPlan.name, schema: AdaptiveDayPlanSchema },
      { name: LearningMission.name, schema: LearningMissionSchema },
      { name: LearningMissionEventEntry.name, schema: LearningMissionEventEntrySchema },
      { name: TransferAssessmentAttempt.name, schema: TransferAssessmentAttemptSchema },
      { name: ReadinessPredictionEntry.name, schema: ReadinessPredictionEntrySchema },
      { name: ReadinessOutcomeEntry.name, schema: ReadinessOutcomeEntrySchema },
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
      { name: AssessmentResultV2Entry.name, schema: AssessmentResultV2EntrySchema },
      { name: EvidenceEventV2Entry.name, schema: EvidenceEventV2EntrySchema },
      { name: MasterySnapshotV2Entry.name, schema: MasterySnapshotV2EntrySchema },
      { name: AssessmentEventV3Entry.name, schema: AssessmentEventV3EntrySchema },
      { name: MasterySnapshotV3Entry.name, schema: MasterySnapshotV3EntrySchema },
      { name: TargetProfileV2Entry.name, schema: TargetProfileV2EntrySchema },
      { name: ReadinessSnapshotV2Entry.name, schema: ReadinessSnapshotV2EntrySchema },
      { name: ReadinessOutcomeV2Entry.name, schema: ReadinessOutcomeV2EntrySchema },
      { name: AiInvocationEntry.name, schema: AiInvocationEntrySchema },
      { name: AssessmentEventV4Entry.name, schema: AssessmentEventV4EntrySchema },
      { name: CheckpointSessionEntry.name, schema: CheckpointSessionEntrySchema },
      { name: ItemExposureEntry.name, schema: ItemExposureEntrySchema },
      { name: ReadinessSnapshotV3Entry.name, schema: ReadinessSnapshotV3EntrySchema },
      { name: InterviewOutcomeV3Entry.name, schema: InterviewOutcomeV3EntrySchema },
      { name: AiQuizProgress.name, schema: AiQuizProgressSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: InterviewTurnEntry.name, schema: InterviewTurnEntrySchema },
      {
        name: YandexPlatformMockAttempt.name,
        schema: YandexPlatformMockAttemptSchema,
      },
    ]),
  ],
  controllers: [LearningController, LearningV2Controller, LearningV3Controller],
  providers: [
    AiContentService,
    AdaptivePlanService,
    LearningAnalyticsService,
    LearningBackupService,
    LearningBootstrapService,
    LearningCleanupService,
    LearningService,
    EvidenceService,
    EvidenceV2Service,
    EvidenceV3Service,
    MasteryService,
    MasteryV2Service,
    MasteryV3Service,
    TargetProfileService,
    DecisionV8Service,
    AiObservabilityService,
    VerificationV9Service,
    VerificationMigrationService,
    LearningSignalService,
    LearningMissionService,
    ReadinessCalibrationService,
    InterviewSessionService,
    YandexPlatformMockService,
  ],
})
export class LearningModule {}
