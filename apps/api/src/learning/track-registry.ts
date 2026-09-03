import { NotFoundException } from "@nestjs/common";
import { TRACK_KEYS, type TrackKey } from "@prep/contracts";

import { CURRICULUM, type StudyBlock, type StudyDay } from "./curriculum";
import { AVITO_SPRINT, AVITO_SPRINT_AI_KEY, AVITO_SPRINT_AI_VERSION } from "./avito-sprint";
import { OZON_SPRINT, OZON_SPRINT_AI_KEY, OZON_SPRINT_AI_VERSION } from "./ozon-sprint";
import { TBANK_SPRINT, TBANK_SPRINT_AI_KEY, TBANK_SPRINT_AI_VERSION } from "./tbank-sprint";
import {
  YANDEX_SPRINT,
  YANDEX_SPRINT_AI_KEY,
  YANDEX_SPRINT_AI_VERSION,
} from "./yandex-sprint";

/**
 * Учебная программа, для которой доступны AI-уроки, тесты, практика и чат.
 *
 * `course` описывает персональный AI-курс: его темы живут в документе AiCourse
 * и меняются при каждой перегенерации. Остальные треки статические: их дни
 * и блоки заданы в коде, поэтому у них фиксированные courseKey и courseVersion.
 */
export { TRACK_KEYS, type TrackKey } from "@prep/contracts";

export type StaticTrackKey = Exclude<TrackKey, "course">;

export const CURRICULUM_AI_KEY = "curriculum";
export const CURRICULUM_AI_VERSION = 2;

export const CURRICULUM_DAYS: StudyDay[] = CURRICULUM.flatMap((week) => week.days);

/** Инструкции промпта, специфичные для трека. Общая часть живёт в AiContentService. */
export interface TrackLessonPrompt {
  /** Имя запроса в логах и в json_schema. */
  name: string;
  /** Первая строка system-инструкции: кем себя считает модель. */
  role: string;
  /** Описание программы, в которую входит блок. */
  program: string;
  /** Завершающее уточнение, специфичное для трека. */
  note: string;
  /** Компания, если трек готовит к интервью в конкретную компанию. */
  targetCompany: string | null;
}

export interface StaticTrackDefinition {
  key: StaticTrackKey;
  courseKey: string;
  courseVersion: number;
  days: StudyDay[];
  /** Строка «Цель подготовки» в контексте AI-чата. */
  chatGoal: string;
  lessonPrompt: TrackLessonPrompt;
  missingItemMessage: string;
  saveLessonError: string;
}

export const STATIC_TRACKS = {
  curriculum: {
    key: "curriculum",
    courseKey: CURRICULUM_AI_KEY,
    courseVersion: CURRICULUM_AI_VERSION,
    days: CURRICULUM_DAYS,
    chatGoal: "пройти 12-недельную программу подготовки к frontend-собеседованиям",
    lessonPrompt: {
      name: "curriculum_lesson",
      role: "Ты сильный frontend-инженер и наставник, ведущий кандидата по 12-недельной программе подготовки.",
      program:
        "Подготовь самостоятельный урок на русском языке для Middle+/Senior frontend-разработчика по текущему блоку недельной программы.",
      note: "Программа рассчитана на 120 минут в день, поэтому уложи материал в отведённое блоку время и не выходи за его тему.",
      targetCompany: null,
    },
    missingItemMessage: "Тема учебного плана не найдена",
    saveLessonError: "Не удалось сохранить разбор темы учебного плана",
  },
  yandex: {
    key: "yandex",
    courseKey: YANDEX_SPRINT_AI_KEY,
    courseVersion: YANDEX_SPRINT_AI_VERSION,
    days: YANDEX_SPRINT,
    chatGoal: "пройти frontend-собеседование в Яндексе",
    lessonPrompt: {
      name: "yandex_frontend_interview_lesson",
      role: "Ты сильный frontend-инженер, готовящий кандидата к интервью в Яндекс.",
      program:
        "Подготовь самостоятельный урок на русском языке для Middle+/Senior frontend-разработчика по текущему блоку 21-дневного спринта.",
      note: "Ориентируй материал на заявленные секции frontend-интервью Яндекса.",
      targetCompany: "Яндекс",
    },
    missingItemMessage: "Тема Яндекс-спринта не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Яндекса",
  },
  ozon: {
    key: "ozon",
    courseKey: OZON_SPRINT_AI_KEY,
    courseVersion: OZON_SPRINT_AI_VERSION,
    days: OZON_SPRINT,
    chatGoal: "пройти frontend-собеседование в Ozon",
    lessonPrompt: {
      name: "ozon_frontend_interview_lesson",
      role: "Ты сильный frontend-инженер, готовящий кандидата к интервью в Ozon.",
      program:
        "Подготовь самостоятельный урок на русском языке для Middle+/Senior frontend-разработчика по текущему блоку 14-дневного спринта.",
      note: "Это React-transfer программа по пользовательским конспектам 2024 года, а не официальный актуальный стек Ozon. Явно отделяй переносимые темы JavaScript, async, браузера и алгоритмов от React-специфичных упражнений.",
      targetCompany: "Ozon",
    },
    missingItemMessage: "Тема Ozon-спринта не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Ozon",
  },
  avito: {
    key: "avito",
    courseKey: AVITO_SPRINT_AI_KEY,
    courseVersion: AVITO_SPRINT_AI_VERSION,
    days: AVITO_SPRINT,
    chatGoal: "пройти frontend-собеседование в Avito",
    lessonPrompt: {
      name: "avito_frontend_interview_lesson",
      role: "Ты сильный frontend-инженер, готовящий кандидата к интервью в Avito.",
      program: "Подготовь самостоятельный урок на русском языке по текущему блоку 12-дневного Avito-спринта.",
      note: "Ориентируй материал на Programming, Platform, Design и защиту сложности; не выдавай примеры задач за реальные вопросы компании.",
      targetCompany: "Avito",
    },
    missingItemMessage: "Тема Avito-спринта не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Avito",
  },
  tbank: {
    key: "tbank",
    courseKey: TBANK_SPRINT_AI_KEY,
    courseVersion: TBANK_SPRINT_AI_VERSION,
    days: TBANK_SPRINT,
    chatGoal: "пройти frontend-собеседование в Т-Банке",
    lessonPrompt: {
      name: "tbank_frontend_interview_lesson",
      role: "Ты сильный frontend-инженер, готовящий кандидата к интервью в Т-Банке.",
      program: "Подготовь самостоятельный урок на русском языке по текущему блоку 10-дневного спринта Т-Банка.",
      note: "Ориентируй материал на language/framework, algorithms, architecture и team matching; не выдавай учебные аналоги за реальные вопросы компании.",
      targetCompany: "Т-Банк",
    },
    missingItemMessage: "Тема спринта Т-Банка не найдена",
    saveLessonError: "Не удалось сохранить разбор темы Т-Банка",
  },
} satisfies Record<StaticTrackKey, StaticTrackDefinition>;

export const STATIC_TRACK_LIST: StaticTrackDefinition[] = Object.values(STATIC_TRACKS);

export const isTrackKey = (value: string): value is TrackKey =>
  (TRACK_KEYS as readonly string[]).includes(value);

export const isStaticTrackKey = (value: TrackKey): value is StaticTrackKey =>
  value !== "course";

/**
 * Идентификаторы блоков статических треков, для которых допустимо сохранять
 * прогресс. Учебный план исключён: его блоки уже входят в TASK_IDS.
 */
export const SPRINT_TASK_IDS = new Set(
  STATIC_TRACK_LIST.filter((track) => track.key !== "curriculum").flatMap((track) =>
    track.days.flatMap((day) => day.blocks.map((block) => block.id)),
  ),
);

export function getStaticTrack(key: StaticTrackKey) {
  return STATIC_TRACKS[key];
}

export function findStaticTrackByCourse(courseKey: string, courseVersion: number) {
  return STATIC_TRACK_LIST.find(
    (track) => track.courseKey === courseKey && track.courseVersion === courseVersion,
  );
}

export function getStaticTrackItem(
  key: StaticTrackKey,
  itemId: string,
): { track: StaticTrackDefinition; day: StudyDay; block: StudyBlock } {
  const track = getStaticTrack(key);
  for (const day of track.days) {
    const block = day.blocks.find((candidate) => candidate.id === itemId);
    if (block) return { track, day, block };
  }
  throw new NotFoundException(track.missingItemMessage);
}
