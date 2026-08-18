import { describe, expect, it } from "vitest";

import { createBackupFilename, parseBackupJson } from "./backup";

describe("backup helpers", () => {
  it("creates a stable dated filename", () => {
    expect(createBackupFilename("2026-08-18T10:00:00.000Z")).toBe(
      "frontend-sprint-backup-2026-08-18.json",
    );
  });

  it("parses only supported backup files", () => {
    expect(
      parseBackupJson(
        JSON.stringify({
          format: "knows-preparation-backup",
          version: 1,
          exportedAt: "2026-08-18T10:00:00.000Z",
          data: {},
        }),
      ).version,
    ).toBe(1);
    expect(() => parseBackupJson('{"format":"other","version":1}')).toThrow();
  });
});
