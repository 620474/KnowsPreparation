import { describe, expect, it } from "vitest";

import { buildTaskProgressUpdate } from "./task-progress";

describe("buildTaskProgressUpdate", () => {
  it("keeps only fields supplied by the client", () => {
    expect(buildTaskProgressUpdate({ solution: "return 42;" })).toEqual({
      solution: "return 42;",
    });
  });

  it("keeps false and empty strings as intentional values", () => {
    expect(
      buildTaskProgressUpdate({
        completed: false,
        note: "",
        customTask: undefined,
      }),
    ).toEqual({ completed: false, note: "" });
  });
});
