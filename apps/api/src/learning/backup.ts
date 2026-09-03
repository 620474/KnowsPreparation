import { BadRequestException } from "@nestjs/common";

export const LEARNING_BACKUP_FORMAT = "knows-preparation-backup";
export const LEARNING_BACKUP_VERSION = 1;

export const LEARNING_BACKUP_COLLECTIONS = [
  "settings",
  "tasks",
  "questions",
  "questionAttempts",
  "algorithms",
  "aiCourses",
  "aiLessons",
  "aiChatMessages",
  "aiPracticeProgresses",
  "practiceAttempts",
  "learningSignals",
  "evidenceEvents",
  "masterySnapshots",
  "assessmentResultsV2",
  "evidenceEventsV2",
  "masterySnapshotsV2",
  "assessmentEventsV3",
  "masterySnapshotsV3",
  "targetProfilesV2",
  "readinessSnapshotsV2",
  "readinessOutcomesV2",
  "assessmentEventsV4",
  "checkpointSessionsV1",
  "itemExposuresV1",
  "exposureEventsV2",
  "readinessSnapshotsV3",
  "interviewOutcomesV3",
  "aiQuizProgresses",
  "mockInterviews",
  "interviewSessions",
  "interviewTurns",
  "interviewTimelineEventsV1",
  "readinessPredictions",
  "readinessOutcomes",
  "yandexPlatformMockAttempts",
  "researchProjects",
  "researchEvidence",
  "researchClaims",
  "researchActions",
  "researchAgentRuns",
  "careerActivities",
  "careerApplications",
  "careerSettings",
  "adaptiveDayPlans",
  "learningMissions",
  "learningMissionEvents",
  "transferAssessmentAttempts",
] as const;

export type LearningBackupCollection = (typeof LEARNING_BACKUP_COLLECTIONS)[number];
export type LearningBackupRecord = Record<string, unknown>;

export interface LearningBackupV1 {
  format: typeof LEARNING_BACKUP_FORMAT;
  version: typeof LEARNING_BACKUP_VERSION;
  exportedAt: string;
  data: Record<LearningBackupCollection, LearningBackupRecord[]>;
}

const MAX_RECORDS_PER_COLLECTION = 20_000;
const MAX_TOTAL_RECORDS = 50_000;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

export function parseLearningBackup(value: unknown): LearningBackupV1 {
  if (!isPlainObject(value)) {
    throw new BadRequestException("Файл бэкапа должен содержать JSON-объект");
  }
  if (value.format !== LEARNING_BACKUP_FORMAT) {
    throw new BadRequestException("Это не бэкап Frontend Sprint");
  }
  if (value.version !== LEARNING_BACKUP_VERSION) {
    throw new BadRequestException("Версия бэкапа пока не поддерживается");
  }
  if (typeof value.exportedAt !== "string" || Number.isNaN(Date.parse(value.exportedAt))) {
    throw new BadRequestException("В бэкапе отсутствует корректная дата экспорта");
  }
  if (!isPlainObject(value.data)) {
    throw new BadRequestException("В бэкапе отсутствует раздел data");
  }

  let totalRecords = 0;
  const data = {} as LearningBackupV1["data"];
  for (const collection of LEARNING_BACKUP_COLLECTIONS) {
    const records = value.data[collection] ??
      (collection === "aiPracticeProgresses" ||
      collection === "questionAttempts" ||
      collection === "practiceAttempts" ||
      collection === "learningSignals" ||
      collection === "evidenceEvents" ||
      collection === "masterySnapshots" ||
      collection === "assessmentResultsV2" ||
      collection === "evidenceEventsV2" ||
      collection === "masterySnapshotsV2" ||
      collection === "assessmentEventsV3" ||
      collection === "masterySnapshotsV3" ||
      collection === "targetProfilesV2" ||
      collection === "readinessSnapshotsV2" ||
      collection === "readinessOutcomesV2" ||
      collection === "assessmentEventsV4" ||
      collection === "checkpointSessionsV1" ||
      collection === "itemExposuresV1" ||
      collection === "exposureEventsV2" ||
      collection === "readinessSnapshotsV3" ||
      collection === "interviewOutcomesV3" ||
      collection === "interviewSessions" ||
      collection === "interviewTurns" ||
      collection === "interviewTimelineEventsV1" ||
      collection === "readinessPredictions" ||
      collection === "readinessOutcomes" ||
      collection === "yandexPlatformMockAttempts" ||
      collection === "researchProjects" ||
      collection === "researchEvidence" ||
      collection === "researchClaims" ||
      collection === "researchActions" ||
      collection === "researchAgentRuns" ||
      collection === "careerActivities" ||
      collection === "careerApplications" ||
      collection === "careerSettings"
      || collection === "adaptiveDayPlans"
      || collection === "learningMissions"
      || collection === "learningMissionEvents"
      || collection === "transferAssessmentAttempts"
        ? []
        : undefined);
    if (!Array.isArray(records)) {
      throw new BadRequestException(`Раздел ${collection} должен быть массивом`);
    }
    if (records.length > MAX_RECORDS_PER_COLLECTION) {
      throw new BadRequestException(`В разделе ${collection} слишком много записей`);
    }
    if (!records.every(isPlainObject)) {
      throw new BadRequestException(`Раздел ${collection} содержит некорректную запись`);
    }
    totalRecords += records.length;
    data[collection] = records;
  }
  if (totalRecords > MAX_TOTAL_RECORDS) {
    throw new BadRequestException("Бэкап содержит слишком много записей");
  }

  return {
    format: LEARNING_BACKUP_FORMAT,
    version: LEARNING_BACKUP_VERSION,
    exportedAt: value.exportedAt,
    data,
  };
}
