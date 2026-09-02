import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import {
  LEARNING_BACKUP_FORMAT,
  LEARNING_BACKUP_VERSION,
  parseLearningBackup,
  type LearningBackupRecord,
} from "./backup";
import type { ImportBackupDto } from "./dto/learning.dto";
import { CareerActivityEntry } from "../career/schemas/career-activity.schema";
import { CareerApplicationEntry } from "../career/schemas/career-application.schema";
import { CareerSettingsEntry } from "../career/schemas/career-settings.schema";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AdaptiveDayPlan } from "./schemas/adaptive-day-plan.schema";
import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AiPracticeProgress } from "./schemas/ai-practice-progress.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { LearningSignal } from "./schemas/learning-signal.schema";
import { EvidenceEvent } from "./schemas/evidence-event.schema";
import { MasterySnapshot } from "./schemas/mastery-snapshot.schema";
import { AssessmentResultV2Entry } from "./schemas/assessment-result-v2.schema";
import { EvidenceEventV2Entry } from "./schemas/evidence-event-v2.schema";
import { MasterySnapshotV2Entry } from "./schemas/mastery-snapshot-v2.schema";
import { InterviewSession } from "./schemas/interview-session.schema";
import { InterviewTurnEntry } from "./schemas/interview-turn.schema";
import { ReadinessOutcomeEntry } from "./schemas/readiness-outcome.schema";
import { ReadinessPredictionEntry } from "./schemas/readiness-prediction.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { QuestionAttempt } from "./schemas/question-attempt.schema";
import { PracticeAttempt } from "./schemas/practice-attempt.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { YandexPlatformMockAttempt } from "./schemas/yandex-platform-mock.schema";
import { LearningMission } from "./schemas/learning-mission.schema";
import { LearningMissionEventEntry } from "./schemas/learning-mission-event.schema";
import { TransferAssessmentAttempt } from "./schemas/transfer-assessment-attempt.schema";
import { ResearchProject } from "./schemas/research-project.schema";
import { ResearchEvidenceEntry } from "./schemas/research-evidence.schema";
import { ResearchClaimEntry } from "./schemas/research-claim.schema";
import { ResearchAgentRunEntry } from "../research/schemas/research-agent-run.schema";
import { ResearchActionEntry } from "../research/schemas/research-action.schema";

@Injectable()
export class LearningBackupService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
    @InjectModel(QuestionAttempt.name)
    private readonly questionAttemptModel: Model<QuestionAttempt>,
    @InjectModel(AlgorithmEntry.name)
    private readonly algorithmModel: Model<AlgorithmEntry>,
    @InjectModel(AiCourse.name) private readonly aiCourseModel: Model<AiCourse>,
    @InjectModel(AiLesson.name) private readonly aiLessonModel: Model<AiLesson>,
    @InjectModel(AiChatMessage.name)
    private readonly aiChatMessageModel: Model<AiChatMessage>,
    @InjectModel(AiQuizProgress.name)
    private readonly aiQuizProgressModel: Model<AiQuizProgress>,
    @InjectModel(AiPracticeProgress.name)
    private readonly aiPracticeProgressModel: Model<AiPracticeProgress>,
    @InjectModel(PracticeAttempt.name)
    private readonly practiceAttemptModel: Model<PracticeAttempt>,
    @InjectModel(LearningSignal.name)
    private readonly learningSignalModel: Model<LearningSignal>,
    @InjectModel(EvidenceEvent.name)
    private readonly evidenceEventModel: Model<EvidenceEvent>,
    @InjectModel(MasterySnapshot.name)
    private readonly masterySnapshotModel: Model<MasterySnapshot>,
    @InjectModel(AssessmentResultV2Entry.name)
    private readonly assessmentResultV2Model: Model<AssessmentResultV2Entry>,
    @InjectModel(EvidenceEventV2Entry.name)
    private readonly evidenceEventV2Model: Model<EvidenceEventV2Entry>,
    @InjectModel(MasterySnapshotV2Entry.name)
    private readonly masterySnapshotV2Model: Model<MasterySnapshotV2Entry>,
    @InjectModel(MockInterview.name)
    private readonly mockInterviewModel: Model<MockInterview>,
    @InjectModel(InterviewSession.name)
    private readonly interviewSessionModel: Model<InterviewSession>,
    @InjectModel(InterviewTurnEntry.name)
    private readonly interviewTurnModel: Model<InterviewTurnEntry>,
    @InjectModel(ReadinessPredictionEntry.name)
    private readonly readinessPredictionModel: Model<ReadinessPredictionEntry>,
    @InjectModel(ReadinessOutcomeEntry.name)
    private readonly readinessOutcomeModel: Model<ReadinessOutcomeEntry>,
    @InjectModel(YandexPlatformMockAttempt.name)
    private readonly yandexPlatformMockAttemptModel: Model<YandexPlatformMockAttempt>,
    @InjectModel(ResearchProject.name)
    private readonly researchProjectModel: Model<ResearchProject>,
    @InjectModel(ResearchEvidenceEntry.name)
    private readonly researchEvidenceModel: Model<ResearchEvidenceEntry>,
    @InjectModel(ResearchClaimEntry.name)
    private readonly researchClaimModel: Model<ResearchClaimEntry>,
    @InjectModel(ResearchAgentRunEntry.name)
    private readonly researchAgentRunModel: Model<ResearchAgentRunEntry>,
    @InjectModel(ResearchActionEntry.name)
    private readonly researchActionModel: Model<ResearchActionEntry>,
    @InjectModel(CareerApplicationEntry.name)
    private readonly careerApplicationModel: Model<CareerApplicationEntry>,
    @InjectModel(CareerActivityEntry.name)
    private readonly careerActivityModel: Model<CareerActivityEntry>,
    @InjectModel(CareerSettingsEntry.name)
    private readonly careerSettingsModel: Model<CareerSettingsEntry>,
    @InjectModel(AdaptiveDayPlan.name)
    private readonly adaptiveDayPlanModel: Model<AdaptiveDayPlan>,
    @InjectModel(LearningMission.name)
    private readonly learningMissionModel: Model<LearningMission>,
    @InjectModel(LearningMissionEventEntry.name)
    private readonly learningMissionEventModel: Model<LearningMissionEventEntry>,
    @InjectModel(TransferAssessmentAttempt.name)
    private readonly transferAssessmentAttemptModel: Model<TransferAssessmentAttempt>,
  ) {}

  async exportBackup() {
    const [
      settings,
      tasks,
      questions,
      questionAttempts,
      algorithms,
      aiCourses,
      aiLessons,
      aiChatMessages,
      aiPracticeProgresses,
      practiceAttempts,
      learningSignals,
      evidenceEvents,
      masterySnapshots,
      assessmentResultsV2,
      evidenceEventsV2,
      masterySnapshotsV2,
      aiQuizProgresses,
      mockInterviews,
      interviewSessions,
      interviewTurns,
      readinessPredictions,
      readinessOutcomes,
      yandexPlatformMockAttempts,
      researchProjects,
      researchEvidence,
      researchClaims,
      researchAgentRuns,
      researchActions,
      careerActivities,
      careerApplications,
      careerSettings,
      adaptiveDayPlans,
      learningMissions,
      learningMissionEvents,
      transferAssessmentAttempts,
    ] = await Promise.all([
      this.settingsModel.find().lean().exec(),
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.questionAttemptModel.find().lean().exec(),
      this.algorithmModel.find().lean().exec(),
      this.aiCourseModel.find().lean().exec(),
      this.aiLessonModel.find().lean().exec(),
      this.aiChatMessageModel.find().lean().exec(),
      this.aiPracticeProgressModel.find().lean().exec(),
      this.practiceAttemptModel.find().lean().exec(),
      this.learningSignalModel.find().lean().exec(),
      this.evidenceEventModel.find().lean().exec(),
      this.masterySnapshotModel.find().lean().exec(),
      this.assessmentResultV2Model.find().lean().exec(),
      this.evidenceEventV2Model.find().lean().exec(),
      this.masterySnapshotV2Model.find().lean().exec(),
      this.aiQuizProgressModel.find().lean().exec(),
      this.mockInterviewModel.find().lean().exec(),
      this.interviewSessionModel.find().lean().exec(),
      this.interviewTurnModel.find().lean().exec(),
      this.readinessPredictionModel.find().lean().exec(),
      this.readinessOutcomeModel.find().lean().exec(),
      this.yandexPlatformMockAttemptModel.find().lean().exec(),
      this.researchProjectModel.find().lean().exec(),
      this.researchEvidenceModel.find().lean().exec(),
      this.researchClaimModel.find().lean().exec(),
      this.researchAgentRunModel.find().lean().exec(),
      this.researchActionModel.find().lean().exec(),
      this.careerActivityModel.find().lean().exec(),
      this.careerApplicationModel.find().lean().exec(),
      this.careerSettingsModel.find().lean().exec(),
      this.adaptiveDayPlanModel.find().lean().exec(),
      this.learningMissionModel.find().lean().exec(),
      this.learningMissionEventModel.find().lean().exec(),
      this.transferAssessmentAttemptModel.find().lean().exec(),
    ]);

    return {
      format: LEARNING_BACKUP_FORMAT,
      version: LEARNING_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        tasks,
        questions,
        questionAttempts,
        algorithms,
        aiCourses,
        aiLessons,
        aiChatMessages,
        aiPracticeProgresses,
        practiceAttempts,
        learningSignals,
        evidenceEvents,
        masterySnapshots,
        assessmentResultsV2,
        evidenceEventsV2,
        masterySnapshotsV2,
        aiQuizProgresses,
        mockInterviews,
        interviewSessions,
        interviewTurns,
        readinessPredictions,
        readinessOutcomes,
        yandexPlatformMockAttempts,
        researchProjects,
        researchEvidence,
        researchClaims,
        researchAgentRuns,
        researchActions,
        careerActivities,
        careerApplications,
        careerSettings,
        adaptiveDayPlans,
        learningMissions,
        learningMissionEvents,
        transferAssessmentAttempts,
      },
    };
  }

  async importBackup(dto: ImportBackupDto) {
    const backup = parseLearningBackup(dto.backup);
    const prepared = {
      settings: await this.validateRecords(this.settingsModel, backup.data.settings),
      tasks: await this.validateRecords(this.taskModel, backup.data.tasks),
      questions: await this.validateRecords(this.questionModel, backup.data.questions),
      questionAttempts: await this.validateRecords(
        this.questionAttemptModel,
        backup.data.questionAttempts,
      ),
      algorithms: await this.validateRecords(
        this.algorithmModel,
        backup.data.algorithms,
      ),
      aiCourses: await this.validateRecords(
        this.aiCourseModel,
        backup.data.aiCourses,
      ),
      aiLessons: await this.validateRecords(
        this.aiLessonModel,
        backup.data.aiLessons,
      ),
      aiChatMessages: await this.validateRecords(
        this.aiChatMessageModel,
        backup.data.aiChatMessages,
      ),
      aiQuizProgresses: await this.validateRecords(
        this.aiQuizProgressModel,
        backup.data.aiQuizProgresses,
      ),
      aiPracticeProgresses: await this.validateRecords(
        this.aiPracticeProgressModel,
        backup.data.aiPracticeProgresses,
      ),
      practiceAttempts: await this.validateRecords(
        this.practiceAttemptModel,
        backup.data.practiceAttempts,
      ),
      learningSignals: await this.validateRecords(
        this.learningSignalModel,
        backup.data.learningSignals,
      ),
      evidenceEvents: await this.validateRecords(
        this.evidenceEventModel,
        backup.data.evidenceEvents,
      ),
      masterySnapshots: await this.validateRecords(
        this.masterySnapshotModel,
        backup.data.masterySnapshots,
      ),
      assessmentResultsV2: await this.validateRecords(
        this.assessmentResultV2Model,
        backup.data.assessmentResultsV2,
      ),
      evidenceEventsV2: await this.validateRecords(
        this.evidenceEventV2Model,
        backup.data.evidenceEventsV2,
      ),
      masterySnapshotsV2: await this.validateRecords(
        this.masterySnapshotV2Model,
        backup.data.masterySnapshotsV2,
      ),
      mockInterviews: await this.validateRecords(
        this.mockInterviewModel,
        backup.data.mockInterviews,
      ),
      interviewSessions: await this.validateRecords(
        this.interviewSessionModel,
        backup.data.interviewSessions,
      ),
      interviewTurns: await this.validateRecords(
        this.interviewTurnModel,
        backup.data.interviewTurns,
      ),
      readinessPredictions: await this.validateRecords(
        this.readinessPredictionModel,
        backup.data.readinessPredictions,
      ),
      readinessOutcomes: await this.validateRecords(
        this.readinessOutcomeModel,
        backup.data.readinessOutcomes,
      ),
      yandexPlatformMockAttempts: await this.validateRecords(
        this.yandexPlatformMockAttemptModel,
        backup.data.yandexPlatformMockAttempts,
      ),
      researchProjects: await this.validateRecords(
        this.researchProjectModel,
        backup.data.researchProjects,
      ),
      researchEvidence: await this.validateRecords(
        this.researchEvidenceModel,
        backup.data.researchEvidence,
      ),
      researchClaims: await this.validateRecords(
        this.researchClaimModel,
        backup.data.researchClaims,
      ),
      researchAgentRuns: await this.validateRecords(
        this.researchAgentRunModel,
        backup.data.researchAgentRuns,
      ),
      researchActions: await this.validateRecords(
        this.researchActionModel,
        backup.data.researchActions,
      ),
      careerApplications: await this.validateRecords(
        this.careerApplicationModel,
        backup.data.careerApplications,
      ),
      careerActivities: await this.validateRecords(
        this.careerActivityModel,
        backup.data.careerActivities,
      ),
      careerSettings: await this.validateRecords(
        this.careerSettingsModel,
        backup.data.careerSettings,
      ),
      adaptiveDayPlans: await this.validateRecords(
        this.adaptiveDayPlanModel,
        backup.data.adaptiveDayPlans,
      ),
      learningMissions: await this.validateRecords(
        this.learningMissionModel,
        backup.data.learningMissions,
      ),
      learningMissionEvents: await this.validateRecords(
        this.learningMissionEventModel,
        backup.data.learningMissionEvents,
      ),
      transferAssessmentAttempts: await this.validateRecords(
        this.transferAssessmentAttemptModel,
        backup.data.transferAssessmentAttempts,
      ),
    };

    await Promise.all([
      this.mergeRecords(this.settingsModel, prepared.settings, (record) => ({
        key: record.key,
      })),
      this.mergeRecords(this.taskModel, prepared.tasks, (record) => ({
        taskId: record.taskId,
      })),
      this.mergeRecords(this.questionModel, prepared.questions, (record) => ({
        questionId: record.questionId,
      })),
      this.mergeRecords(
        this.questionAttemptModel,
        prepared.questionAttempts,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(this.algorithmModel, prepared.algorithms, (record) => ({
        _id: record._id,
      })),
      this.mergeRecords(this.aiCourseModel, prepared.aiCourses, (record) => ({
        key: record.key,
      })),
      this.mergeRecords(this.aiLessonModel, prepared.aiLessons, (record) => ({
        courseKey: record.courseKey,
        courseVersion: record.courseVersion,
        itemId: record.itemId,
      })),
      this.mergeRecords(this.aiChatMessageModel, prepared.aiChatMessages, (record) => ({
        _id: record._id,
      })),
      this.mergeRecords(
        this.aiPracticeProgressModel,
        prepared.aiPracticeProgresses,
        (record) => ({
          courseKey: record.courseKey,
          courseVersion: record.courseVersion,
          itemId: record.itemId,
          lessonVersion: record.lessonVersion,
        }),
      ),
      this.mergeRecords(
        this.aiQuizProgressModel,
        prepared.aiQuizProgresses,
        (record) => ({
          courseKey: record.courseKey,
          courseVersion: record.courseVersion,
          itemId: record.itemId,
          lessonVersion: record.lessonVersion,
        }),
      ),
      this.mergeRecords(
        this.practiceAttemptModel,
        prepared.practiceAttempts,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.learningSignalModel,
        prepared.learningSignals,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.evidenceEventModel,
        prepared.evidenceEvents,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.masterySnapshotModel,
        prepared.masterySnapshots,
        (record) => ({
          ontologyVersion: record.ontologyVersion,
          masteryModelVersion: record.masteryModelVersion,
          skillId: record.skillId,
        }),
      ),
      this.mergeRecords(
        this.assessmentResultV2Model,
        prepared.assessmentResultsV2,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.evidenceEventV2Model,
        prepared.evidenceEventsV2,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.masterySnapshotV2Model,
        prepared.masterySnapshotsV2,
        (record) => ({ snapshotId: record.snapshotId }),
      ),
      this.mergeRecords(
        this.mockInterviewModel,
        prepared.mockInterviews,
        (record) => ({ _id: record._id }),
      ),
      this.mergeRecords(
        this.interviewSessionModel,
        prepared.interviewSessions,
        (record) => ({ _id: record._id }),
      ),
      this.mergeRecords(
        this.interviewTurnModel,
        prepared.interviewTurns,
        (record) => ({ turnId: record.turnId }),
      ),
      this.mergeRecords(
        this.readinessPredictionModel,
        prepared.readinessPredictions,
        (record) => ({ snapshotId: record.snapshotId }),
      ),
      this.mergeRecords(
        this.readinessOutcomeModel,
        prepared.readinessOutcomes,
        (record) => ({ outcomeId: record.outcomeId }),
      ),
      this.mergeRecords(
        this.yandexPlatformMockAttemptModel,
        prepared.yandexPlatformMockAttempts,
        (record) => ({ _id: record._id }),
      ),
      this.mergeRecords(
        this.researchProjectModel,
        prepared.researchProjects,
        (record) => ({ projectId: record.projectId }),
      ),
      this.mergeRecords(
        this.researchEvidenceModel,
        prepared.researchEvidence,
        (record) => ({ evidenceId: record.evidenceId }),
      ),
      this.mergeRecords(
        this.researchClaimModel,
        prepared.researchClaims,
        (record) => ({ claimId: record.claimId }),
      ),
      this.mergeRecords(
        this.researchAgentRunModel,
        prepared.researchAgentRuns,
        (record) => ({ runId: record.runId }),
      ),
      this.mergeRecords(
        this.researchActionModel,
        prepared.researchActions,
        (record) => ({ actionId: record.actionId }),
      ),
      this.mergeRecords(
        this.careerApplicationModel,
        prepared.careerApplications,
        (record) => ({ applicationId: record.applicationId }),
      ),
      this.mergeRecords(
        this.careerActivityModel,
        prepared.careerActivities,
        (record) => ({ activityId: record.activityId }),
      ),
      this.mergeRecords(
        this.careerSettingsModel,
        prepared.careerSettings,
        (record) => ({ key: record.key }),
      ),
      this.mergeRecords(
        this.adaptiveDayPlanModel,
        prepared.adaptiveDayPlans,
        (record) => ({ date: record.date }),
      ),
      this.mergeRecords(
        this.learningMissionModel,
        prepared.learningMissions,
        (record) => ({ missionId: record.missionId }),
      ),
      this.mergeRecords(
        this.learningMissionEventModel,
        prepared.learningMissionEvents,
        (record) => ({ operationId: record.operationId }),
      ),
      this.mergeRecords(
        this.transferAssessmentAttemptModel,
        prepared.transferAssessmentAttempts,
        (record) => ({ operationId: record.operationId }),
      ),
    ]);

    const imported = Object.fromEntries(
      Object.entries(prepared).map(([collection, records]) => [
        collection,
        records.length,
      ]),
    );
    return {
      imported,
      total: Object.values(imported).reduce((sum, count) => sum + count, 0),
    };
  }

  private async validateRecords<T>(
    model: Model<T>,
    records: LearningBackupRecord[],
  ): Promise<LearningBackupRecord[]> {
    return Promise.all(
      records.map(async (record) => {
        const document = new model(record);
        try {
          await document.validate();
        } catch {
          throw new BadRequestException(
            "Бэкап содержит данные, несовместимые с текущей версией",
          );
        }
        return document.toObject({ versionKey: false }) as LearningBackupRecord;
      }),
    );
  }

  private async mergeRecords<T>(
    model: Model<T>,
    records: LearningBackupRecord[],
    getFilter: (record: LearningBackupRecord) => LearningBackupRecord,
  ) {
    if (records.length === 0) return;
    const operations = records.map((record) => {
      const update = { ...record };
      delete update._id;
      return {
        updateOne: {
          filter: getFilter(record),
          update: { $set: update },
          upsert: true,
        },
      };
    });
    await model.bulkWrite(operations as Parameters<typeof model.bulkWrite>[0]);
  }
}
