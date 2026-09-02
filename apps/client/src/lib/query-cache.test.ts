import { describe, expect, it } from "vitest";

import {
  isFreshQueryCache,
  isPersistedQueryRoot,
  migratePersistedQueryCache,
  type PersistedQueryCache,
} from "./query-cache";

describe("query cache", () => {
  it("keeps cache for seven days", () => {
    const now = Date.UTC(2026, 7, 18);

    expect(isFreshQueryCache(now - 6 * 24 * 60 * 60 * 1_000, now)).toBe(true);
    expect(isFreshQueryCache(now - 8 * 24 * 60 * 60 * 1_000, now)).toBe(false);
  });

  it("persists missions for offline reading", () => {
    expect(isPersistedQueryRoot("learning-missions")).toBe(true);
    expect(isPersistedQueryRoot("research-agent-runs")).toBe(false);
  });

  it("drops an incompatible bootstrap and migrates queued track variables", () => {
    const legacy = {
      timestamp: Date.UTC(2026, 7, 18),
      state: {
        queries: [
          { queryKey: ["bootstrap"], state: { data: { legacy: true } } },
          { queryKey: ["ai-chat", "yandex", "item-1"], state: { data: {} } },
        ],
        mutations: [
          {
            mutationKey: ["offline", "quiz"],
            state: { variables: { scope: "yandex", itemId: "item-1" } },
          },
        ],
      },
    } as unknown as PersistedQueryCache;

    const migrated = migratePersistedQueryCache(legacy);

    expect(migrated.version).toBe(2);
    expect(migrated.state.queries).toHaveLength(1);
    expect(migrated.state.queries[0]?.queryKey[0]).toBe("ai-chat");
    expect(migrated.state.mutations[0]?.state.variables).toEqual({
      track: "yandex",
      itemId: "item-1",
    });
  });
});
