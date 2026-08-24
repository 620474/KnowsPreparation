import { describe, expect, it } from "vitest";

import {
  getYandexPlatformMockQuestion,
  getYandexPlatformMockQuestions,
  YANDEX_PLATFORM_MOCK_DAY_IDS,
} from "./yandex-platform-mocks";

describe("Yandex platform mock banks", () => {
  it("provides six unique fragments for every mock day", () => {
    const ids = new Set<string>();
    for (const dayId of YANDEX_PLATFORM_MOCK_DAY_IDS) {
      const questions = getYandexPlatformMockQuestions(dayId);
      expect(questions).toHaveLength(6);
      for (const question of questions) {
        expect(ids.has(question.id)).toBe(false);
        ids.add(question.id);
        expect(question.code.trim()).toBeTruthy();
        expect(question.expectedAnswer.trim()).toBeTruthy();
        expect(question.explanation.trim()).toBeTruthy();
        expect(getYandexPlatformMockQuestion(dayId, question.id)).toBe(question);
      }
    }
  });
});
