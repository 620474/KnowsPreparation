import type { StudyBlock, StudyDay, StudyExercise } from "../types";

export interface PracticeTask {
  id: string;
  source: "Яндекс" | "Ozon";
  dayNumber: number;
  dayTitle: string;
  block: StudyBlock & { exercise: StudyExercise };
}

const collectPracticeTasks = (
  source: PracticeTask["source"],
  days: StudyDay[],
): PracticeTask[] =>
  days.flatMap((day) =>
    day.blocks.flatMap((block) =>
      block.kind === "practice" && block.exercise
        ? [
            {
              id: block.id,
              source,
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
    ...collectPracticeTasks("Яндекс", yandexSprint),
    ...collectPracticeTasks("Ozon", ozonSprint),
  ];
}
