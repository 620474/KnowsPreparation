import type { StudyBlock, StudyDay, StudyExercise, TrackKey } from "../types";

export interface PracticeTask {
  id: string;
  source: "Яндекс" | "Ozon" | "Avito" | "Т-Банк";
  track: Extract<TrackKey, "yandex" | "ozon" | "avito" | "tbank">;
  dayNumber: number;
  dayTitle: string;
  block: StudyBlock & { exercise: StudyExercise };
}

const collectPracticeTasks = (
  source: PracticeTask["source"],
  track: PracticeTask["track"],
  days: StudyDay[],
): PracticeTask[] =>
  days.flatMap((day) =>
    day.blocks.flatMap((block) =>
      block.kind === "practice" && block.exercise
        ? [
            {
              id: block.id,
              source,
              track,
              dayNumber: day.dayNumber,
              dayTitle: day.title,
              block: { ...block, exercise: block.exercise },
            },
          ]
        : [],
    ),
  );

export function getPracticeTasks(
  yandexSprint: StudyDay[],
  ozonSprint: StudyDay[],
  avitoSprint: StudyDay[] = [],
  tbankSprint: StudyDay[] = [],
) {
  return [
    ...collectPracticeTasks("Яндекс", "yandex", yandexSprint),
    ...collectPracticeTasks("Ozon", "ozon", ozonSprint),
    ...collectPracticeTasks("Avito", "avito", avitoSprint),
    ...collectPracticeTasks("Т-Банк", "tbank", tbankSprint),
  ];
}
