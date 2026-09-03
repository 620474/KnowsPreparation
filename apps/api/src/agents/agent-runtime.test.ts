import { describe, expect, it } from "vitest";

import { createAgentRunEnvelope, roleForOperation } from "./agent-runtime";

describe("agent runtime", () => {
  it("assigns constrained versioned roles", () => {
    expect(roleForOperation("autonomous_research_discovery")).toBe("researcher");
    const run = createAgentRunEnvelope("lesson_source_verification", "gpt-test", 20_000);
    expect(run.role).toBe("reviewer");
    expect(run.budget.maximumOutputTokens).toBe(8_000);
    expect(run.permissions).toContain("web_search");
  });
});
