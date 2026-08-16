import { describe, expect, it } from "vitest";

import { buildAiChatDraft } from "./ai-chat-draft";

describe("buildAiChatDraft", () => {
  it("formats a lesson excerpt as a quoted question", () => {
    expect(
      buildAiChatDraft({
        section: "Объяснение",
        excerpt: "Сначала выполняется стек.\nЗатем микрозадачи.",
      }),
    ).toBe(
      "Хочу уточнить фрагмент из раздела «Объяснение»:\n\n" +
        "> Сначала выполняется стек.\n> Затем микрозадачи.\n\nМой вопрос: ",
    );
  });

  it("limits a selected excerpt", () => {
    const draft = buildAiChatDraft({ section: "Код", excerpt: "a".repeat(2_100) });

    expect(draft).not.toContain("a".repeat(2_001));
    expect(draft).toContain(`> ${"a".repeat(2_000)}`);
  });
});
