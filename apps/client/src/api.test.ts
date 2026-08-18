import { describe, expect, it } from "vitest";

import { normalizeApiUrl } from "./api";

describe("API URL migration", () => {
  it("adds the v1 segment to a legacy API base URL", () => {
    expect(normalizeApiUrl("https://example.code.run/api/"))
      .toBe("https://example.code.run/api/v1");
  });

  it("keeps an already versioned URL unchanged", () => {
    expect(normalizeApiUrl("https://example.code.run/api/v1"))
      .toBe("https://example.code.run/api/v1");
  });
});
