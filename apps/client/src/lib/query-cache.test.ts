import { describe, expect, it } from "vitest";

import { isFreshQueryCache } from "./query-cache";

describe("query cache", () => {
  it("keeps cache for seven days", () => {
    const now = Date.UTC(2026, 7, 18);

    expect(isFreshQueryCache(now - 6 * 24 * 60 * 60 * 1_000, now)).toBe(true);
    expect(isFreshQueryCache(now - 8 * 24 * 60 * 60 * 1_000, now)).toBe(false);
  });
});
