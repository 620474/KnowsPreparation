import { describe, expect, it } from "vitest";

import { SseParser } from "./sse";

describe("SseParser", () => {
  it("parses named events split across chunks", () => {
    const parser = new SseParser();

    expect(parser.push('event: delta\ndata: {"del')).toEqual([]);
    expect(parser.push('ta":"часть"}\n\n')).toEqual([
      { event: "delta", data: '{"delta":"часть"}' },
    ]);
  });

  it("ignores heartbeat comments", () => {
    const parser = new SseParser();

    expect(parser.push(": keep-alive\n\n")).toEqual([]);
  });
});
