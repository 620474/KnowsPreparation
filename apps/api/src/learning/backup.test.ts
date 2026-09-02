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
  questionAttempts: [],
    algorithms: [],
    aiCourses: [],
    aiLessons: [],
    aiChatMessages: [],
    aiPracticeProgresses: [],
    practiceAttempts: [],
    learningSignals: [],
  evidenceEvents: [],
  masterySnapshots: [],
  assessmentResultsV2: [],
  evidenceEventsV2: [],
  masterySnapshotsV2: [],
    aiQuizProgresses: [],
    mockInterviews: [],
    interviewSessions: [],
    interviewTurns: [],
    readinessPredictions: [],
    readinessOutcomes: [],
    yandexPlatformMockAttempts: [],
    researchProjects: [],
    researchEvidence: [],
    researchClaims: [],
    researchActions: [],
    researchAgentRuns: [],
    careerActivities: [],
    careerApplications: [],
    careerSettings: [],
    adaptiveDayPlans: [],
    learningMissions: [],
    learningMissionEvents: [],
    transferAssessmentAttempts: [],
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

  it("accepts backups created before interview sessions were added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.interviewSessions;

    expect(parseLearningBackup({ ...backup, data: legacyData }).data.interviewSessions)
      .toEqual([]);
  });

  it("accepts backups created before research tracking was added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.researchProjects;
    delete legacyData.researchEvidence;
    delete legacyData.researchClaims;
    delete legacyData.researchActions;
    delete legacyData.researchAgentRuns;

    const data = parseLearningBackup({ ...backup, data: legacyData }).data;
    expect(data.researchProjects).toEqual([]);
    expect(data.researchEvidence).toEqual([]);
    expect(data.researchClaims).toEqual([]);
    expect(data.researchActions).toEqual([]);
    expect(data.researchAgentRuns).toEqual([]);
  });

  it("accepts backups created before career tracking was added", () => {
    const backup = createBackup();
    const legacyData: Partial<LearningBackupV1["data"]> = { ...backup.data };
    delete legacyData.careerActivities;
    delete legacyData.careerApplications;
    delete legacyData.careerSettings;

    const data = parseLearningBackup({ ...backup, data: legacyData }).data;
    expect(data.careerActivities).toEqual([]);
    expect(data.careerApplications).toEqual([]);
    expect(data.careerSettings).toEqual([]);
  });
});
