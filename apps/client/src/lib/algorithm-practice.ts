import type { StudyBlock, StudyDay, StudyExercise, TrackKey } from "../types";

export interface PracticeTask {
  id: string;
  source: "Яндекс" | "Ozon";
  track: Extract<TrackKey, "yandex" | "ozon">;
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

export function getPracticeTasks(yandexSprint: StudyDay[], ozonSprint: StudyDay[]) {
  return [
    ...collectPracticeTasks("Яндекс", "yandex", yandexSprint),
    ...collectPracticeTasks("Ozon", "ozon", ozonSprint),
  ];
}
