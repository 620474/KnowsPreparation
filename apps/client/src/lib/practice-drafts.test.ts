import { describe, expect, it } from "vitest";

import type { AiLesson, PracticeSolutionProgress } from "../types";
import {
  markPracticeDraftEdited,
  reconcilePracticeDraft,
  reconcilePracticeSaveResult,
} from "./practice-drafts";

const lesson: AiLesson = {
  itemId: "lesson-01",
  courseVersion: 2,
  title: "Замыкания",
  goals: [],
  explanation: "Материал",
  codeExamples: [],
  diagrams: [],
  commonMistakes: [],
  interviewQuestions: [],
  practice: {
    title: "Практика",
    statement: "Решить",
    constraints: [],
    examples: [],
    runner: { starterCode: "function solve() {}", testCases: [] },
  },
  quiz: [],
  summary: "Итог",
  resourceIds: [],
  version: 3,
  generatedAt: "2026-08-18T10:00:00.000Z",
};

const serverProgress = (revision: number, solution: string): PracticeSolutionProgress => ({
  itemId: lesson.itemId,
  courseVersion: lesson.courseVersion,
  lessonVersion: lesson.version,
  solution,
  revision,
  updatedAt: `2026-08-18T10:0${revision}:00.000Z`,
});

describe("practice draft reconciliation", () => {
  it("replaces a clean local copy with a newer server revision", () => {
    const local = reconcilePracticeDraft(
      "course",
      lesson,
      undefined,
      serverProgress(1, "version one"),
    ).draft;

    const result = reconcilePracticeDraft(
      "course",
      lesson,
      local,
      serverProgress(2, "version two"),
    );

    expect(result.shouldSync).toBe(false);
    expect(result.draft).toMatchObject({ solution: "version two", revision: 2 });
  });

  it("keeps an offline edit when the server revision did not advance", () => {
    const synced = reconcilePracticeDraft(
      "course",
      lesson,
      undefined,
      serverProgress(2, "server"),
    ).draft;
    const local = markPracticeDraftEdited(synced, "offline edit");

    const result = reconcilePracticeDraft(
      "course",
      lesson,
      local,
      serverProgress(2, "server"),
    );

    expect(result.shouldSync).toBe(true);
    expect(result.draft.solution).toBe("offline edit");
  });

  it("preserves a local conflict when another device advanced the server", () => {
    const synced = reconcilePracticeDraft(
      "course",
      lesson,
      undefined,
      serverProgress(2, "server"),
    ).draft;
    const local = markPracticeDraftEdited(synced, "phone edit");

    const result = reconcilePracticeDraft(
      "course",
      lesson,
      local,
      serverProgress(3, "desktop edit"),
    );

    expect(result.shouldSync).toBe(false);
    expect(result.draft.solution).toBe("desktop edit");
    expect(result.draft.conflictSolution).toBe("phone edit");
  });

  it("keeps typing made while an earlier save was in flight", () => {
    const submitted = markPracticeDraftEdited(
      reconcilePracticeDraft("course", lesson, undefined, undefined).draft,
      "first edit",
    );
    const current = markPracticeDraftEdited(submitted, "second edit");
    const result = reconcilePracticeSaveResult(current, submitted, {
      saved: true,
      progress: serverProgress(1, "first edit"),
    });

    expect(result.shouldSync).toBe(true);
    expect(result.draft).toMatchObject({
      solution: "second edit",
      revision: 1,
      baseRevision: 1,
      dirty: true,
    });
  });
});
