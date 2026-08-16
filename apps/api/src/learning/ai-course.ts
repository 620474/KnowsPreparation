import type { LearningResource } from "./resources";

export interface GeneratedCourseItem {
  title: string;
  objective: string;
  estimatedMinutes: number;
  resourceTopics: string[];
}

export interface GeneratedCourse {
  title: string;
  summary: string;
  lessons: GeneratedCourseItem[];
}

export interface GeneratedDiagramNode {
  id: string;
  label: string;
  detail: string;
  row: number;
  column: number;
}

export interface GeneratedDiagramEdge {
  from: string;
  to: string;
  label: string;
}

export interface GeneratedDiagram {
  title: string;
  description: string;
  nodes: GeneratedDiagramNode[];
  edges: GeneratedDiagramEdge[];
}

export interface GeneratedLesson {
  goals: string[];
  explanation: string;
  codeExamples: Array<{
    title: string;
    code: string;
    explanation: string;
  }>;
  commonMistakes: string[];
  interviewQuestions: string[];
  diagrams: GeneratedDiagram[];
  practice: {
    title: string;
    statement: string;
    constraints: string[];
    examples: Array<{
      input: string;
      output: string;
      explanation: string;
    }>;
  };
  summary: string;
}

const asRecord = (value: unknown, label: string) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const asText = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim().slice(0, maxLength);
};

const asStringList = (value: unknown, label: string, limit: number, maxLength: number) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value
    .slice(0, limit)
    .map((item, index) => asText(item, `${label}.${index}`, maxLength));
};

const asGridPosition = (value: unknown, label: string) => {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`${label} must be an integer`);
  return Math.min(4, Math.max(0, number));
};

const normalizeDiagram = (value: unknown, diagramIndex: number): GeneratedDiagram => {
  const diagram = asRecord(value, `lesson.diagrams.${diagramIndex}`);
  if (!Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    throw new Error(`lesson.diagrams.${diagramIndex} nodes and edges must be arrays`);
  }

  const nodeIds = new Set<string>();
  const nodes = diagram.nodes.slice(0, 8).map((value, nodeIndex) => {
    const node = asRecord(value, `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}`);
    const id = asText(node.id, `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}.id`, 40);
    if (nodeIds.has(id)) throw new Error(`lesson.diagrams.${diagramIndex} node ids must be unique`);
    nodeIds.add(id);
    return {
      id,
      label: asText(node.label, `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}.label`, 100),
      detail: asText(node.detail, `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}.detail`, 800),
      row: asGridPosition(node.row, `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}.row`),
      column: asGridPosition(
        node.column,
        `lesson.diagrams.${diagramIndex}.nodes.${nodeIndex}.column`,
      ),
    };
  });
  if (nodes.length < 2) throw new Error(`lesson.diagrams.${diagramIndex} needs at least 2 nodes`);

  const edges = diagram.edges.slice(0, 12).map((value, edgeIndex) => {
    const edge = asRecord(value, `lesson.diagrams.${diagramIndex}.edges.${edgeIndex}`);
    const from = asText(edge.from, `lesson.diagrams.${diagramIndex}.edges.${edgeIndex}.from`, 40);
    const to = asText(edge.to, `lesson.diagrams.${diagramIndex}.edges.${edgeIndex}.to`, 40);
    if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) {
      throw new Error(`lesson.diagrams.${diagramIndex}.edges.${edgeIndex} references invalid nodes`);
    }
    return {
      from,
      to,
      label: asText(edge.label, `lesson.diagrams.${diagramIndex}.edges.${edgeIndex}.label`, 100),
    };
  });
  if (edges.length === 0) throw new Error(`lesson.diagrams.${diagramIndex} needs at least 1 edge`);

  return {
    title: asText(diagram.title, `lesson.diagrams.${diagramIndex}.title`, 160),
    description: asText(
      diagram.description,
      `lesson.diagrams.${diagramIndex}.description`,
      1_000,
    ),
    nodes,
    edges,
  };
};

export function normalizeGeneratedCourse(value: unknown, lessonCount: number): GeneratedCourse {
  const course = asRecord(value, "course");
  if (!Array.isArray(course.lessons) || course.lessons.length !== lessonCount) {
    throw new Error(`course.lessons must contain ${lessonCount} items`);
  }

  return {
    title: asText(course.title, "course.title", 160),
    summary: asText(course.summary, "course.summary", 1_500),
    lessons: course.lessons.map((value, index) => {
      const item = asRecord(value, `course.lessons.${index}`);
      const estimatedMinutes = Number(item.estimatedMinutes);
      if (!Number.isInteger(estimatedMinutes)) {
        throw new Error(`course.lessons.${index}.estimatedMinutes must be an integer`);
      }
      return {
        title: asText(item.title, `course.lessons.${index}.title`, 160),
        objective: asText(item.objective, `course.lessons.${index}.objective`, 800),
        estimatedMinutes: Math.min(240, Math.max(30, estimatedMinutes)),
        resourceTopics: asStringList(
          item.resourceTopics,
          `course.lessons.${index}.resourceTopics`,
          8,
          80,
        ),
      };
    }),
  };
}

export function normalizeGeneratedLesson(value: unknown): GeneratedLesson {
  const lesson = asRecord(value, "lesson");
  const practice = asRecord(lesson.practice, "lesson.practice");
  if (
    !Array.isArray(lesson.codeExamples) ||
    !Array.isArray(lesson.diagrams) ||
    !Array.isArray(practice.examples)
  ) {
    throw new Error("lesson examples must be arrays");
  }

  return {
    goals: asStringList(lesson.goals, "lesson.goals", 8, 300),
    explanation: asText(lesson.explanation, "lesson.explanation", 16_000),
    codeExamples: lesson.codeExamples.slice(0, 5).map((value, index) => {
      const example = asRecord(value, `lesson.codeExamples.${index}`);
      return {
        title: asText(example.title, `lesson.codeExamples.${index}.title`, 160),
        code: asText(example.code, `lesson.codeExamples.${index}.code`, 8_000),
        explanation: asText(
          example.explanation,
          `lesson.codeExamples.${index}.explanation`,
          2_000,
        ),
      };
    }),
    commonMistakes: asStringList(
      lesson.commonMistakes,
      "lesson.commonMistakes",
      10,
      500,
    ),
    interviewQuestions: asStringList(
      lesson.interviewQuestions,
      "lesson.interviewQuestions",
      10,
      500,
    ),
    diagrams: lesson.diagrams.slice(0, 2).map(normalizeDiagram),
    practice: {
      title: asText(practice.title, "lesson.practice.title", 160),
      statement: asText(practice.statement, "lesson.practice.statement", 4_000),
      constraints: asStringList(
        practice.constraints,
        "lesson.practice.constraints",
        12,
        500,
      ),
      examples: practice.examples.slice(0, 5).map((value, index) => {
        const example = asRecord(value, `lesson.practice.examples.${index}`);
        return {
          input: asText(example.input, `lesson.practice.examples.${index}.input`, 1_000),
          output: asText(example.output, `lesson.practice.examples.${index}.output`, 1_000),
          explanation: asText(
            example.explanation,
            `lesson.practice.examples.${index}.explanation`,
            1_000,
          ),
        };
      }),
    },
    summary: asText(lesson.summary, "lesson.summary", 2_000),
  };
}

const PRIORITY_SCORE = { must: 3, should: 2, optional: 1 } as const;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9+#]+/gi, " ")
    .trim();

const tokenize = (value: string) =>
  new Set(normalize(value).split(" ").filter((token) => token.length >= 3));

export function selectResourcesForCourseItem(
  item: GeneratedCourseItem,
  resources: LearningResource[],
  limit = 3,
) {
  const queryTokens = tokenize(
    [item.title, item.objective, ...item.resourceTopics].join(" "),
  );

  return resources
    .map((resource) => {
      const titleTokens = tokenize(resource.title);
      const tagTokens = tokenize([...(resource.tags ?? []), ...resource.topics].join(" "));
      const bodyTokens = tokenize(
        [resource.description, resource.learningGoal ?? "", resource.practicalTask ?? ""].join(
          " ",
        ),
      );
      let score = 0;
      for (const token of queryTokens) {
        if (titleTokens.has(token)) score += 5;
        if (tagTokens.has(token)) score += 3;
        if (bodyTokens.has(token)) score += 1;
      }
      score += resource.language === "ru" ? 1 : 0;
      score += resource.priority ? PRIORITY_SCORE[resource.priority] : 0;
      return { resource, score };
    })
    .filter(({ score }) => score > 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ resource }) => resource.id);
}

export function extractResponseText(value: unknown) {
  if (typeof value !== "object" || value === null || !("output" in value)) {
    throw new Error("OpenAI response does not contain output");
  }
  const output = (value as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    throw new Error("OpenAI response output is invalid");
  }

  for (const item of output) {
    if (typeof item !== "object" || item === null || !("content" in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "output_text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
    }
  }

  throw new Error("OpenAI response does not contain text");
}
