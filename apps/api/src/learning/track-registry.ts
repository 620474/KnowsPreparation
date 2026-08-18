import { NotFoundException } from "@nestjs/common";

import type { StudyBlock, StudyDay } from "./curriculum";
import {
  OZON_SPRINT,
  OZON_SPRINT_AI_KEY,
  OZON_SPRINT_AI_VERSION,
} from "./ozon-sprint";
import {
  YANDEX_SPRINT,
  YANDEX_SPRINT_AI_KEY,
  YANDEX_SPRINT_AI_VERSION,
} from "./yandex-sprint";

export type SprintTrackScope = "yandex" | "ozon";

export interface SprintTrackDefinition {
  scope: SprintTrackScope;
  company: "Яндекс" | "Ozon";
  courseKey: string;
  courseVersion: number;
  days: StudyDay[];
  missingBlockMessage: string;
  saveLessonError: string;
}

export const SPRINT_TRACKS = {
  yandex: {
    scope: "yandex",
    company: "Яндекс",
    courseKey: YANDEX_SPRINT_AI_KEY,
    courseVersion: YANDEX_SPRINT_AI_VERSION,
    days: YANDEX_SPRINT,
    missingBlockMessage: "Тема Яндекс-спринта не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Яндекса",
  },
  ozon: {
    scope: "ozon",
    company: "Ozon",
    courseKey: OZON_SPRINT_AI_KEY,
    courseVersion: OZON_SPRINT_AI_VERSION,
    days: OZON_SPRINT,
    missingBlockMessage: "Тема Ozon-спринта не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Ozon",
  },
} satisfies Record<SprintTrackScope, SprintTrackDefinition>;

export const SPRINT_TRACK_LIST = Object.values(SPRINT_TRACKS);

export const SPRINT_TASK_IDS = new Set(
  SPRINT_TRACK_LIST.flatMap((track) =>
    track.days.flatMap((day) => day.blocks.map((block) => block.id)),
  ),
);

export function getSprintTrack(scope: SprintTrackScope) {
  return SPRINT_TRACKS[scope];
}

export function findSprintTrackByCourse(courseKey: string, courseVersion: number) {
  return SPRINT_TRACK_LIST.find(
    (track) =>
      track.courseKey === courseKey && track.courseVersion === courseVersion,
  );
}

export function getSprintBlock(scope: SprintTrackScope, blockId: string): {
  track: SprintTrackDefinition;
  day: StudyDay;
  block: StudyBlock;
} {
  const track = getSprintTrack(scope);
  for (const day of track.days) {
    const block = day.blocks.find((candidate) => candidate.id === blockId);
    if (block) return { track, day, block };
  }
  throw new NotFoundException(track.missingBlockMessage);
}
