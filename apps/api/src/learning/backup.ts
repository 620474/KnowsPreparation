import { BadRequestException } from "@nestjs/common";

export const LEARNING_BACKUP_FORMAT = "knows-preparation-backup";
export const LEARNING_BACKUP_VERSION = 1;

export const LEARNING_BACKUP_COLLECTIONS = [
  "settings",
  "tasks",
  "questions",
  "algorithms",
  "aiCourses",
  "aiLessons",
  "aiChatMessages",
  "aiPracticeProgresses",
  "practiceAttempts",
  "learningSignals",
  "aiQuizProgresses",
  "mockInterviews",
  "interviewSessions",
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
      collection === "practiceAttempts" ||
      collection === "learningSignals" ||
      collection === "interviewSessions"
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
