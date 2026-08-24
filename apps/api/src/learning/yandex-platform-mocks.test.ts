import { describe, expect, it } from "vitest";

import {
  getYandexPlatformMockQuestion,
  getYandexPlatformMockQuestions,
  YANDEX_PLATFORM_MOCK_DAY_IDS,
} from "./yandex-platform-mocks";

describe("Yandex platform mock banks", () => {
  it("provides fifty unique fragments across all mock days", () => {
    const ids = new Set<string>();
    const expectedSizes = {
      "yandex-d07": 17,
      "yandex-d14": 17,
      "yandex-d21": 16,
    } as const;
    for (const dayId of YANDEX_PLATFORM_MOCK_DAY_IDS) {
      const questions = getYandexPlatformMockQuestions(dayId);
      expect(questions).toHaveLength(expectedSizes[dayId]);
      for (const question of questions) {
        expect(ids.has(question.id)).toBe(false);
        ids.add(question.id);
        expect(question.code.trim()).toBeTruthy();
        expect(question.expectedAnswer.trim()).toBeTruthy();
        expect(question.explanation.trim()).toBeTruthy();
        expect(getYandexPlatformMockQuestion(dayId, question.id)).toBe(question);
      }
    }
    expect(ids.size).toBe(50);
  });
});
