import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  LEARNING_BACKUP_FORMAT,
  LEARNING_BACKUP_VERSION,
  parseLearningBackup,
  type LearningBackupV1,
} from "./backup";

const createBackup = (): LearningBackupV1 => ({
  format: LEARNING_BACKUP_FORMAT,
  version: LEARNING_BACKUP_VERSION,
  exportedAt: "2026-08-18T10:00:00.000Z",
  data: {
    settings: [],
    tasks: [],
    questions: [],
    algorithms: [],
    aiCourses: [],
    aiLessons: [],
    aiChatMessages: [],
    aiPracticeProgresses: [],
    practiceAttempts: [],
    learningSignals: [],
    aiQuizProgresses: [],
    mockInterviews: [],
  },
});

describe("parseLearningBackup", () => {
  it("accepts a complete versioned backup", () => {
    const backup = createBackup();
    backup.data.tasks.push({ taskId: "task-1", completed: true });

    expect(parseLearningBackup(backup)).toEqual(backup);
  });

  it("rejects unsupported and incomplete backups", () => {
    expect(() => parseLearningBackup({ ...createBackup(), version: 2 })).toThrow(
      BadRequestException,
    );
    const incomplete = createBackup();
    const incompleteData: Partial<LearningBackupV1["data"]> = { ...incomplete.data };
    delete incompleteData.questions;
    expect(() => parseLearningBackup({ ...incomplete, data: incompleteData })).toThrow(
      BadRequestException,
    );
  });

  it("accepts backups created before practice drafts were added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.aiPracticeProgresses;
    const legacy = { ...backup, data: legacyData };

    expect(parseLearningBackup(legacy).data.aiPracticeProgresses).toEqual([]);
  });

  it("accepts backups created before verified attempts were added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.practiceAttempts;

    expect(parseLearningBackup({ ...backup, data: legacyData }).data.practiceAttempts)
      .toEqual([]);
  });

  it("accepts backups created before learning signals were added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.learningSignals;

    expect(parseLearningBackup({ ...backup, data: legacyData }).data.learningSignals)
      .toEqual([]);
  });
});
