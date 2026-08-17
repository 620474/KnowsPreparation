import { describe, expect, it } from "vitest";

import type { StudyDay } from "../types";
import { getPracticeTasks } from "./algorithm-practice";

const createDay = (id: string, dayNumber: number): StudyDay => ({
  id,
  dayNumber,
  offset: dayNumber - 1,
  title: `День ${dayNumber}`,
  blocks: [
    {
      id: `${id}-theory`,
      kind: "theory",
      title: "Теория",
      description: "Повторить тему",
      minutes: 40,
      resourceIds: [],
    },
    {
      id: `${id}-practice`,
      kind: "practice",
      title: "Задача",
      description: "Решить задачу",
      minutes: 50,
      resourceIds: [],
      exercise: {
        statement: "Верни сумму чисел.",
        signature: "sum(values: number[]): number",
        constraints: ["Не изменяй массив"],
        examples: [{ input: "[1, 2]", output: "3" }],
      },
    },
  ],
});

describe("getPracticeTasks", () => {
  it("collects only practice blocks with exercises from both sprints", () => {
    const tasks = getPracticeTasks(
      [createDay("yandex-d01", 1)],
      [createDay("ozon-d01", 1)],
    );

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.source)).toEqual(["Яндекс", "Ozon"]);
    expect(tasks.map((task) => task.id)).toEqual([
      "yandex-d01-practice",
      "ozon-d01-practice",
    ]);
  });
});
