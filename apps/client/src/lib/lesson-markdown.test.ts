import { describe, expect, it } from "vitest";

import { parseLessonInline, parseLessonMarkdown } from "./lesson-markdown";

describe("lesson markdown", () => {
  it("parses headings, lists and fenced code", () => {
    const blocks = parseLessonMarkdown(
      "## Области видимости\n\n- **Глобальная** область\n- `Блочная` область\n\n```js\nconst value = 1;\n```",
    );

    expect(blocks).toEqual([
      { type: "heading", content: "Области видимости", level: 2 },
      {
        type: "unordered-list",
        items: ["**Глобальная** область", "`Блочная` область"],
      },
      { type: "code", content: "const value = 1;", language: "js" },
    ]);
  });

  it("parses bold and inline code without HTML", () => {
    expect(parseLessonInline("**Promise** попадает в `microtask`.")).toEqual([
      { type: "strong", content: "Promise" },
      { type: "text", content: " попадает в " },
      { type: "code", content: "microtask" },
      { type: "text", content: "." },
    ]);
  });
});
