import { describe, expect, it } from "vitest";

import { OpenAiSseParser } from "./openai-sse";

describe("OpenAiSseParser", () => {
  it("parses events split across network chunks", () => {
    const parser = new OpenAiSseParser();
    const first = parser.push('event: response.output_text.delta\ndata: {"type":"response.output_');
    const second = parser.push('text.delta","delta":"Привет"}\n\n');

    expect(first).toEqual([]);
    expect(second).toEqual([{ type: "response.output_text.delta", delta: "Привет" }]);
  });

  it("ignores the terminal marker", () => {
    const parser = new OpenAiSseParser();

    expect(parser.push("data: [DONE]\n\n")).toEqual([]);
  });
});
