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
    runner: {
      starterCode: string;
      testCases: Array<{
        title: string;
        expression: string;
        expected: unknown;
      }>;
      hiddenTestCases?: Array<{
        title: string;
        expression: string;
        expected: unknown;
      }>;
    };
    referenceSolution: string;
  };
  quiz: Array<{
    id: string;
    prompt: string;
    options: string[];
    code?: string;
    correctOptionIndex: number;
    explanation: string;
    topic: string;
    tier?: "core" | "deep";
    capability?:
      | "recall"
      | "comprehension"
      | "prediction"
      | "debugging"
      | "application"
      | "transfer"
      | "tradeoff";
  }>;
  summary: string;
}

export const AI_LESSON_REVIEW_VERDICTS = [
  "approved",
  "revised",
  "rejected",
] as const;
export type AiLessonReviewVerdict =
  (typeof AI_LESSON_REVIEW_VERDICTS)[number];

export const AI_LESSON_REVIEW_SEVERITIES = ["warning", "critical"] as const;
export type AiLessonReviewSeverity =
  (typeof AI_LESSON_REVIEW_SEVERITIES)[number];

export interface GeneratedLessonReviewIssue {
  severity: AiLessonReviewSeverity;
  category: string;
  message: string;
}

export interface GeneratedLessonReview {
  verdict: AiLessonReviewVerdict;
  score: number;
  issues: GeneratedLessonReviewIssue[];
  correctedLesson: GeneratedLesson | null;
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
  const runner = asRecord(practice.runner, "lesson.practice.runner");
  if (
    !Array.isArray(lesson.codeExamples) ||
    !Array.isArray(lesson.diagrams) ||
    !Array.isArray(practice.examples) ||
    !Array.isArray(runner.testCases) ||
    !Array.isArray(runner.hiddenTestCases) ||
    !Array.isArray(lesson.quiz)
  ) {
    throw new Error("lesson examples must be arrays");
  }
  if (runner.testCases.length < 3 || runner.testCases.length > 6) {
    throw new Error("lesson.practice.runner.testCases must contain between 3 and 6 items");
  }
  if (runner.hiddenTestCases.length < 3 || runner.hiddenTestCases.length > 6) {
    throw new Error("lesson.practice.runner.hiddenTestCases must contain between 3 and 6 items");
  }
  if (lesson.quiz.length !== 20) {
    throw new Error("lesson.quiz must contain exactly 20 questions");
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
      runner: {
        starterCode: asText(
          runner.starterCode,
          "lesson.practice.runner.starterCode",
          12_000,
        ),
        testCases: runner.testCases.map((value, index) => {
          const testCase = asRecord(
            value,
            `lesson.practice.runner.testCases.${index}`,
          );
          const expectedSource = asText(
            testCase.expected,
            `lesson.practice.runner.testCases.${index}.expected`,
            4_000,
          );
          let expected: unknown;
          try {
            expected = JSON.parse(expectedSource);
          } catch {
            throw new Error(
              `lesson.practice.runner.testCases.${index}.expected must be valid JSON`,
            );
          }
          return {
            title: asText(
              testCase.title,
              `lesson.practice.runner.testCases.${index}.title`,
              200,
            ),
            expression: asText(
              testCase.expression,
              `lesson.practice.runner.testCases.${index}.expression`,
              2_000,
            ),
            expected,
          };
        }),
        hiddenTestCases: runner.hiddenTestCases.map((value, index) => {
          const testCase = asRecord(
            value,
            `lesson.practice.runner.hiddenTestCases.${index}`,
          );
          const expectedSource = asText(
            testCase.expected,
            `lesson.practice.runner.hiddenTestCases.${index}.expected`,
            2_000,
          );
          let expected: unknown;
          try {
            expected = JSON.parse(expectedSource);
          } catch {
            throw new Error(
              `lesson.practice.runner.hiddenTestCases.${index}.expected must be valid JSON`,
            );
          }
          return {
            title: asText(
              testCase.title,
              `lesson.practice.runner.hiddenTestCases.${index}.title`,
              200,
            ),
            expression: asText(
              testCase.expression,
              `lesson.practice.runner.hiddenTestCases.${index}.expression`,
              2_000,
            ),
            expected,
          };
        }),
      },
      referenceSolution: asText(
        practice.referenceSolution,
        "lesson.practice.referenceSolution",
        16_000,
      ),
    },
    quiz: (() => {
      const quiz = lesson.quiz.map((value, index) => {
      const question = asRecord(value, `lesson.quiz.${index}`);
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error(`lesson.quiz.${index}.options must contain exactly 4 items`);
      }
      const options = question.options.map((option, optionIndex) =>
        asText(option, `lesson.quiz.${index}.options.${optionIndex}`, 500),
      );
      if (new Set(options).size !== options.length) {
        throw new Error(`lesson.quiz.${index}.options must be unique`);
      }
      const correctOptionIndex = Number(question.correctOptionIndex);
      if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
        throw new Error(`lesson.quiz.${index}.correctOptionIndex must be between 0 and 3`);
      }
      const tier: "core" | "deep" = question.tier === "core" || question.tier === "deep"
        ? question.tier
        : (() => { throw new Error(`lesson.quiz.${index}.tier is invalid`); })();
      const capability = [
        "recall",
        "comprehension",
        "prediction",
        "debugging",
        "application",
        "transfer",
        "tradeoff",
      ].includes(String(question.capability))
        ? question.capability as NonNullable<GeneratedLesson["quiz"][number]["capability"]>
        : (() => { throw new Error(`lesson.quiz.${index}.capability is invalid`); })();
      return {
        id: `quiz-${String(index + 1).padStart(2, "0")}`,
        prompt: asText(question.prompt, `lesson.quiz.${index}.prompt`, 1_000),
        options,
        ...(typeof question.code === "string" && question.code.trim()
          ? { code: question.code.trim().slice(0, 4_000) }
          : {}),
        correctOptionIndex,
        explanation: asText(question.explanation, `lesson.quiz.${index}.explanation`, 1_500),
        topic: asText(question.topic, `lesson.quiz.${index}.topic`, 120),
        tier,
        capability,
        };
      });
      for (const tier of ["core", "deep"] as const) {
        if (quiz.filter((question) => question.tier === tier).length !== 10) {
          throw new Error(`lesson.quiz must contain exactly 10 ${tier} questions`);
        }
      }
      const quotas: Record<NonNullable<GeneratedLesson["quiz"][number]["capability"]>, number> = {
        recall: 2,
        comprehension: 4,
        prediction: 4,
        debugging: 3,
        application: 3,
        transfer: 2,
        tradeoff: 2,
      };
      for (const [capability, expected] of Object.entries(quotas)) {
        if (quiz.filter((question) => question.capability === capability).length !== expected) {
          throw new Error(`lesson.quiz capability ${capability} must contain exactly ${expected} questions`);
        }
      }
      if (quiz.filter((question) => question.code).length < 8) {
        throw new Error("lesson.quiz must contain at least 8 code questions");
      }
      return quiz;
    })(),
    summary: asText(lesson.summary, "lesson.summary", 2_000),
  };
}

export function normalizeGeneratedLessonReview(
  value: unknown,
): GeneratedLessonReview {
  const review = asRecord(value, "review");
  if (
    typeof review.verdict !== "string" ||
    !AI_LESSON_REVIEW_VERDICTS.includes(
      review.verdict as AiLessonReviewVerdict,
    )
  ) {
    throw new Error("review.verdict is invalid");
  }
  const verdict = review.verdict as AiLessonReviewVerdict;
  const score = Number(review.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error("review.score must be an integer between 0 and 100");
  }
  if (!Array.isArray(review.issues)) {
    throw new Error("review.issues must be an array");
  }
  const issues = review.issues.slice(0, 20).map((value, index) => {
    const issue = asRecord(value, `review.issues.${index}`);
    if (
      typeof issue.severity !== "string" ||
      !AI_LESSON_REVIEW_SEVERITIES.includes(
        issue.severity as AiLessonReviewSeverity,
      )
    ) {
      throw new Error(`review.issues.${index}.severity is invalid`);
    }
    return {
      severity: issue.severity as AiLessonReviewSeverity,
      category: asText(issue.category, `review.issues.${index}.category`, 80),
      message: asText(issue.message, `review.issues.${index}.message`, 1_000),
    };
  });
  const correctedLesson =
    review.correctedLesson === null
      ? null
      : normalizeGeneratedLesson(review.correctedLesson);
  if (verdict === "revised" && !correctedLesson) {
    throw new Error("review.correctedLesson is required for a revised lesson");
  }
  if (verdict !== "revised" && correctedLesson) {
    throw new Error("review.correctedLesson must be null unless the lesson is revised");
  }
  return { verdict, score, issues, correctedLesson };
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
