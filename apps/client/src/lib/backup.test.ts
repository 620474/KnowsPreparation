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
      ).server.version,
    ).toBe(1);
    expect(() => parseBackupJson('{"format":"other","version":1}')).toThrow();
  });

  it("keeps dirty device drafts in a version 2 envelope", () => {
    const backup = parseBackupJson(JSON.stringify({
      format: "frontend-sprint-device-backup",
      version: 2,
      exportedAt: "2026-09-02T00:00:00.000Z",
      server: {
        format: "knows-preparation-backup",
        version: 1,
        exportedAt: "2026-09-02T00:00:00.000Z",
        data: {},
      },
      localPracticeDrafts: [{ key: "course:1:item:1", dirty: true }],
    }));

    expect(backup.server.version).toBe(1);
    expect(backup.localPracticeDrafts).toHaveLength(1);
  });
});
