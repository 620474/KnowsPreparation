import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import type { LearningBackup } from "../types";
import {
  readPendingPracticeDrafts,
  type LocalPracticeDraft,
} from "./practice-drafts";

const BACKUP_FORMAT = "knows-preparation-backup";
const CLIENT_BACKUP_FORMAT = "frontend-sprint-device-backup";

export interface PortableBackup {
  server: LearningBackup;
  localPracticeDrafts: LocalPracticeDraft[];
}

export const createBackupFilename = (exportedAt: string) => {
  const date = new Date(exportedAt);
  const safeDate = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
  return `frontend-sprint-backup-${safeDate}.json`;
};

export function parseBackupJson(content: string): PortableBackup {
  const value: unknown = JSON.parse(content);
  if (
    typeof value === "object" &&
    value !== null &&
    "format" in value &&
    value.format === CLIENT_BACKUP_FORMAT &&
    "version" in value &&
    value.version === 2 &&
    "server" in value &&
    "localPracticeDrafts" in value &&
    Array.isArray(value.localPracticeDrafts)
  ) {
    return {
      server: value.server as LearningBackup,
      localPracticeDrafts: value.localPracticeDrafts,
    };
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("format" in value) ||
    value.format !== BACKUP_FORMAT ||
    !("version" in value) ||
    value.version !== 1
  ) {
    throw new Error("Выбранный JSON не является бэкапом Frontend Sprint");
  }
  return { server: value as LearningBackup, localPracticeDrafts: [] };
}

export async function saveBackupFile(backup: LearningBackup) {
  const filename = createBackupFilename(backup.exportedAt);
  const content = JSON.stringify({
    format: CLIENT_BACKUP_FORMAT,
    version: 2,
    exportedAt: backup.exportedAt,
    server: backup,
    localPracticeDrafts: await readPendingPracticeDrafts(),
  }, null, 2);
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Бэкап Frontend Sprint",
      text: "Сохрани файл в надёжное место.",
      url: saved.uri,
      dialogTitle: "Сохранить или отправить бэкап",
    });
    return;
  }

  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
