import type { StudyBlock, StudyDay, StudyExercise } from "./curriculum";

export interface CompanySprintDayDefinition {
  title: string;
  theory: {
    title: string;
    description: string;
    resourceIds?: string[];
  };
  practice: {
    title: string;
    description: string;
    resourceIds?: string[];
    exercise?: StudyExercise;
  };
  reflection: string;
}

export function buildCompanySprint(
  prefix: string,
  definitions: CompanySprintDayDefinition[],
): StudyDay[] {
  return definitions.map((definition, index) => {
    const dayNumber = index + 1;
    const dayId = `${prefix}-d${String(dayNumber).padStart(2, "0")}`;
    const blocks: StudyBlock[] = [
      {
        id: `${dayId}-theory`,
        kind: "theory",
        title: definition.theory.title,
        description: definition.theory.description,
        minutes: 40,
        resourceIds: definition.theory.resourceIds ?? [],
      },
      {
        id: `${dayId}-practice`,
        kind: "practice",
        title: definition.practice.title,
        description: definition.practice.description,
        minutes: 60,
        resourceIds: definition.practice.resourceIds ?? [],
        exercise: definition.practice.exercise,
      },
      {
        id: `${dayId}-review`,
        kind: "review",
        title: "Защитить результат",
        description: definition.reflection,
        minutes: 20,
        resourceIds: [],
      },
    ];

    return {
      id: dayId,
      dayNumber,
      offset: index,
      title: definition.title,
      blocks,
    };
  });
}
