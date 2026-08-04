import type { StudyDay, StudyWeek } from "../types";

const DAY_MS = 86_400_000;

function dateOnlyToUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function dateToInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStudyPosition(startDate: string, today = dateToInputValue()) {
  const rawOffset = Math.floor((dateOnlyToUtc(today) - dateOnlyToUtc(startDate)) / DAY_MS);
  return {
    rawOffset,
    weekNumber: Math.floor(Math.max(rawOffset, 0) / 7) + 1,
    dayNumber: (Math.max(rawOffset, 0) % 7) + 1,
  };
}

export function getDayForOffset(curriculum: StudyWeek[], rawOffset: number) {
  const days = curriculum.flatMap((week) => week.days);
  if (days.length === 0) return null;
  const safeOffset = Math.min(Math.max(rawOffset, 0), days.length - 1);
  return days[safeOffset] ?? null;
}

export function getWeekForDay(curriculum: StudyWeek[], day: StudyDay | null) {
  if (!day) return null;
  return curriculum.find((week) => week.days.some((candidate) => candidate.id === day.id)) ?? null;
}

export function getDateForOffset(startDate: string, offset: number) {
  const date = new Date(dateOnlyToUtc(startDate) + offset * DAY_MS);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}
