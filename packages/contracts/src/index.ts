import { z } from "zod";

export const questionStatusSchema = z.enum(["new", "learning", "review", "mastered"]);
export const reviewRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const aiLevelSchema = z.enum(["middle", "middle-plus", "senior"]);
export const TRACK_KEYS = ["course", "curriculum", "yandex", "ozon"] as const;
export const trackKeySchema = z.enum(TRACK_KEYS);
export type TrackKey = z.infer<typeof trackKeySchema>;
export const SKILL_KEYS = [
  "javascript",
  "typescript",
  "async",
  "react",
  "browser",
  "algorithms",
  "testing",
  "architecture",
  "css-a11y",
  "ai",
] as const;
export const skillKeySchema = z.enum(SKILL_KEYS);
export type SkillKey = z.infer<typeof skillKeySchema>;
export const studyBlockKindSchema = z.enum(["theory", "practice", "ai", "review"]);
export const resourceLanguageSchema = z.enum(["ru", "en"]);
export const resourceKindSchema = z.enum([
  "main",
  "deep-dive",
  "practice",
  "reference",
  "case-study",
]);
export const resourceLevelSchema = z.enum([
  "basic",
  "beginner",
  "intermediate",
  "advanced",
]);
export const resourceStatusSchema = z.enum(["current", "evergreen", "historical"]);
export const resourcePrioritySchema = z.enum(["must", "should", "optional"]);
export const resourceTopicSchema = z.enum([
  "AI",
  "JavaScript",
  "React",
  "TypeScript",
  "Algorithms",
  "Browser",
  "Performance",
  "CSS",
  "Accessibility",
  "Architecture",
  "Testing",
  "Security",
  "Interview",
]);

export const learningResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  provider: z.string(),
  language: resourceLanguageSchema,
  kind: resourceKindSchema,
  topics: z.array(resourceTopicSchema),
  estimatedMinutes: z.number(),
  description: z.string(),
  publishedYear: z.number().optional(),
  tags: z.array(z.string()).optional(),
  level: resourceLevelSchema.optional(),
  status: resourceStatusSchema.optional(),
  paywall: z.boolean().optional(),
  registrationRequired: z.boolean().optional(),
  learningGoal: z.string().optional(),
  whySelected: z.string().optional(),
  verifiedAt: z.string().optional(),
  priority: resourcePrioritySchema.optional(),
  practicalTask: z.string().optional(),
  interviewQuestions: z.array(z.string()).optional(),
});

export const studyExerciseExampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

export const studyExerciseTestCaseSchema = z.object({
  title: z.string(),
  expression: z.string(),
  expected: z.unknown().optional(),
  expectedError: z.string().optional(),
});

export const studyExerciseRunnerSchema = z.object({
  starterCode: z.string(),
  testCases: z.array(studyExerciseTestCaseSchema),
});

export const studyExerciseSchema = z.object({
  statement: z.string(),
  signature: z.string().optional(),
  constraints: z.array(z.string()),
  examples: z.array(studyExerciseExampleSchema),
  runner: studyExerciseRunnerSchema.optional(),
});

export const studyBlockSchema = z.object({
  id: z.string(),
  kind: studyBlockKindSchema,
  title: z.string(),
  description: z.string(),
  minutes: z.number(),
  resourceIds: z.array(z.string()),
  exercise: studyExerciseSchema.optional(),
});

export const studyDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  offset: z.number(),
  title: z.string(),
  blocks: z.array(studyBlockSchema),
});

export const studyWeekSchema = z.object({
  number: z.number(),
  title: z.string(),
  outcome: z.string(),
  isBuffer: z.boolean(),
  days: z.array(studyDaySchema),
});

export const interviewQuestionSchema = z.object({
  id: z.string(),
  number: z.number(),
  category: z.string(),
  prompt: z.string(),
});

export const taskProgressSchema = z.object({
  completed: z.boolean(),
  note: z.string(),
  customTask: z.string(),
  solution: z.string(),
});

export const questionProgressSchema = z.object({
  status: questionStatusSchema,
  note: z.string(),
  easeFactor: z.number(),
  intervalDays: z.number(),
  repetitions: z.number(),
  nextReviewAt: z.string().nullable(),
  lastReviewedAt: z.string().nullable(),
  reviewCount: z.number(),
  lapseCount: z.number(),
  lastRating: reviewRatingSchema.nullable(),
});

export const algorithmEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  pattern: z.string(),
  difficulty: difficultySchema,
  solvedAt: z.string(),
  note: z.string(),
});

export const aiCourseProfileSchema = z.object({
  goal: z.string(),
  level: aiLevelSchema,
  deadline: z.string(),
  dailyMinutes: z.number(),
  targetCompanies: z.array(z.string()),
  weakTopics: z.array(z.string()),
});

export const aiCourseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  estimatedMinutes: z.number(),
  resourceIds: z.array(z.string()),
});

export const aiCourseSchema = aiCourseProfileSchema.extend({
  title: z.string(),
  summary: z.string(),
  version: z.number(),
  generatedAt: z.string(),
  items: z.array(aiCourseItemSchema),
});

export const aiDiagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  row: z.number(),
  column: z.number(),
});

export const aiDiagramEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
});

export const aiDiagramSchema = z.object({
  title: z.string(),
  description: z.string(),
  nodes: z.array(aiDiagramNodeSchema),
  edges: z.array(aiDiagramEdgeSchema),
});

export const aiQuizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()),
  correctOptionIndex: z.number(),
  explanation: z.string(),
  topic: z.string(),
});

export const aiLessonSchema = z.object({
  itemId: z.string(),
  courseVersion: z.number(),
  title: z.string(),
  goals: z.array(z.string()),
  explanation: z.string(),
  codeExamples: z.array(z.object({
    title: z.string(),
    code: z.string(),
    explanation: z.string(),
  })),
  diagrams: z.array(aiDiagramSchema),
  commonMistakes: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
  practice: z.object({
    title: z.string(),
    statement: z.string(),
    constraints: z.array(z.string()),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string(),
    })),
    runner: studyExerciseRunnerSchema.optional(),
  }),
  quiz: z.array(aiQuizQuestionSchema),
  summary: z.string(),
  resourceIds: z.array(z.string()),
  version: z.number(),
  generatedAt: z.string(),
});

export const lessonQuizAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptionIndex: z.number(),
  correct: z.boolean(),
  topic: z.string(),
});

export const lessonQuizAttemptSchema = z.object({
  score: z.number(),
  answers: z.array(lessonQuizAnswerSchema),
  completedAt: z.string(),
});

export const lessonQuizProgressSchema = z.object({
  itemId: z.string(),
  lessonVersion: z.number(),
  attempts: z.array(lessonQuizAttemptSchema),
});

export const practiceSolutionProgressSchema = z.object({
  itemId: z.string(),
  courseVersion: z.number(),
  lessonVersion: z.number(),
  solution: z.string(),
  revision: z.number(),
  updatedAt: z.string(),
});

export const practiceSolutionSaveResultSchema = z.object({
  saved: z.boolean(),
  progress: practiceSolutionProgressSchema.nullable(),
});

export const practiceAttemptSourceSchema = z.enum(["task", "lesson"]);

export const practiceAttemptTestResultSchema = z.object({
  title: z.string(),
  passed: z.boolean(),
  error: z.string().optional(),
});

export const practiceAttemptSchema = z.object({
  id: z.string(),
  track: trackKeySchema,
  itemId: z.string(),
  source: practiceAttemptSourceSchema,
  exerciseVersion: z.string(),
  skillKeys: z.array(skillKeySchema),
  solution: z.string(),
  passed: z.boolean(),
  passedCount: z.number(),
  totalCount: z.number(),
  durationMs: z.number(),
  error: z.string().nullable(),
  tests: z.array(practiceAttemptTestResultSchema),
  createdAt: z.string(),
});

export const practiceAttemptHistorySchema = z.object({
  attempts: z.array(practiceAttemptSchema),
});

export const aiChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});

export const aiChatHistorySchema = z.object({
  itemId: z.string(),
  title: z.string(),
  messages: z.array(aiChatMessageSchema),
});

export const aiLessonQuestionContextSchema = z.object({
  section: z.string(),
  excerpt: z.string(),
});

export const mockQuestionEvaluationSchema = z.object({
  questionId: z.string(),
  score: z.number(),
  feedback: z.string(),
  missingPoints: z.array(z.string()),
});

export const mockInterviewEvaluationSchema = z.object({
  overallScore: z.number(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weakTopics: z.array(z.string()),
  questions: z.array(mockQuestionEvaluationSchema),
});

export const mockInterviewSchema = z.object({
  id: z.string(),
  status: z.enum(["in_progress", "completed"]),
  durationMinutes: z.number(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  questions: z.array(interviewQuestionSchema),
  answers: z.record(z.string(), z.string()),
  evaluation: mockInterviewEvaluationSchema.nullable(),
});

export const appSettingsSchema = z.object({
  startDate: z.string(),
  dailyMinutes: z.number(),
  coreWeeks: z.number(),
  bufferWeeks: z.number(),
  reminderEnabled: z.boolean(),
  reminderTime: z.string(),
  adaptiveTodayEnabled: z.boolean().default(true),
});

export const adaptivePlanItemKindSchema = z.enum([
  "review",
  "practice",
  "lesson",
  "mock",
  "plan",
]);

export const adaptivePlanItemSchema = z.object({
  id: z.string(),
  kind: adaptivePlanItemKindSchema,
  title: z.string(),
  reason: z.string(),
  minutes: z.number(),
  score: z.number(),
  skillKeys: z.array(skillKeySchema),
  track: trackKeySchema.nullable(),
  itemId: z.string().nullable(),
  source: practiceAttemptSourceSchema.nullable(),
});

export const adaptivePlanSchema = z.object({
  date: z.string(),
  budgetMinutes: z.number(),
  totalMinutes: z.number(),
  generatedAt: z.string(),
  items: z.array(adaptivePlanItemSchema),
});

export const learningAnalyticsDaySchema = z.object({
  date: z.string(),
  activityCount: z.number(),
  practiceAttempts: z.number(),
  practicePassed: z.number(),
  quizAttempts: z.number(),
  quizAverage: z.number().nullable(),
  reviews: z.number(),
  mocks: z.number(),
  mockAverage: z.number().nullable(),
});

export const learningAnalyticsSkillSchema = z.object({
  key: skillKeySchema,
  label: z.string(),
  score: z.number().nullable(),
  signalCount: z.number(),
});

export const learningAnalyticsSchema = z.object({
  windowDays: z.number(),
  startedAt: z.string().nullable(),
  totals: z.object({
    activityCount: z.number(),
    practiceAttempts: z.number(),
    practicePassRate: z.number().nullable(),
    quizAttempts: z.number(),
    quizAverage: z.number().nullable(),
    reviews: z.number(),
    mocks: z.number(),
    mockAverage: z.number().nullable(),
  }),
  days: z.array(learningAnalyticsDaySchema),
  skills: z.array(learningAnalyticsSkillSchema),
});

export const learningBackupSchema = z.object({
  format: z.literal("knows-preparation-backup"),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.record(
    z.string(),
    z.array(z.record(z.string(), z.unknown())),
  ),
});

/** Данные, разложенные по учебным трекам: track -> itemId -> значение. */
const trackRecord = <T extends z.ZodType>(schema: T) =>
  z.object(
    Object.fromEntries(
      TRACK_KEYS.map((key) => [key, z.record(z.string(), schema)]),
    ) as {
      [Key in TrackKey]: z.ZodRecord<z.ZodString, T>;
    },
  );

/** Статический учебный контент. Кешируется и меняется только с новым релизом. */
export const bootstrapContentSchema = z.object({
  contentVersion: z.string(),
  curriculum: z.array(studyWeekSchema),
  yandexSprint: z.array(studyDaySchema),
  ozonSprint: z.array(studyDaySchema),
  resources: z.array(learningResourceSchema),
  questions: z.array(interviewQuestionSchema),
  algorithmPatterns: z.array(z.string()),
});

/** Персональный прогресс. Всегда запрашивается заново. */
export const bootstrapProgressSchema = z.object({
  settings: appSettingsSchema,
  progress: z.object({
    tasks: z.record(z.string(), taskProgressSchema),
    questions: z.record(z.string(), questionProgressSchema),
  }),
  algorithms: z.array(algorithmEntrySchema),
  mockInterviews: z.array(mockInterviewSchema),
  ai: z.object({
    enabled: z.boolean(),
    model: z.string(),
    course: aiCourseSchema.nullable(),
    lessons: trackRecord(aiLessonSchema),
    quizProgress: trackRecord(lessonQuizProgressSchema),
    practiceProgress: trackRecord(practiceSolutionProgressSchema),
  }),
});

/** Полное состояние приложения: контент и прогресс, склеенные на клиенте. */
export const bootstrapDataSchema = bootstrapContentSchema.extend(
  bootstrapProgressSchema.shape,
);

export type QuestionStatus = z.infer<typeof questionStatusSchema>;
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type AiLevel = z.infer<typeof aiLevelSchema>;
/** Данные, разложенные по трекам: track -> itemId -> значение. */
export type TrackRecord<T> = Record<TrackKey, Record<string, T>>;
export type StudyBlockKind = z.infer<typeof studyBlockKindSchema>;
export type ResourceLanguage = z.infer<typeof resourceLanguageSchema>;
export type ResourceKind = z.infer<typeof resourceKindSchema>;
export type ResourceLevel = z.infer<typeof resourceLevelSchema>;
export type ResourceStatus = z.infer<typeof resourceStatusSchema>;
export type ResourcePriority = z.infer<typeof resourcePrioritySchema>;
export type ResourceTopic = z.infer<typeof resourceTopicSchema>;
export type LearningResource = z.infer<typeof learningResourceSchema>;
export type StudyExerciseExample = z.infer<typeof studyExerciseExampleSchema>;
export type StudyExerciseTestCase = z.infer<typeof studyExerciseTestCaseSchema>;
export type StudyExerciseRunner = z.infer<typeof studyExerciseRunnerSchema>;
export type StudyExercise = z.infer<typeof studyExerciseSchema>;
export type StudyBlock = z.infer<typeof studyBlockSchema>;
export type StudyDay = z.infer<typeof studyDaySchema>;
export type StudyWeek = z.infer<typeof studyWeekSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type TaskProgress = z.infer<typeof taskProgressSchema>;
export type TaskProgressPatch = Partial<TaskProgress>;
export type TaskUpdateHandler = (
  taskId: string,
  progress: TaskProgressPatch,
) => Promise<boolean>;
export type QuestionProgress = z.infer<typeof questionProgressSchema>;
export type AlgorithmEntry = z.infer<typeof algorithmEntrySchema>;
export type AiCourseProfile = z.infer<typeof aiCourseProfileSchema>;
export type AiCourseItem = z.infer<typeof aiCourseItemSchema>;
export type AiCourse = z.infer<typeof aiCourseSchema>;
export type AiDiagramNode = z.infer<typeof aiDiagramNodeSchema>;
export type AiDiagramEdge = z.infer<typeof aiDiagramEdgeSchema>;
export type AiDiagram = z.infer<typeof aiDiagramSchema>;
export type AiQuizQuestion = z.infer<typeof aiQuizQuestionSchema>;
export type AiLesson = z.infer<typeof aiLessonSchema>;
export type LessonQuizAnswer = z.infer<typeof lessonQuizAnswerSchema>;
export type LessonQuizAttempt = z.infer<typeof lessonQuizAttemptSchema>;
export type LessonQuizProgress = z.infer<typeof lessonQuizProgressSchema>;
export type PracticeSolutionProgress = z.infer<typeof practiceSolutionProgressSchema>;
export type PracticeSolutionSaveResult = z.infer<typeof practiceSolutionSaveResultSchema>;
export type PracticeAttemptSource = z.infer<typeof practiceAttemptSourceSchema>;
export type PracticeAttemptTestResult = z.infer<typeof practiceAttemptTestResultSchema>;
export type PracticeAttempt = z.infer<typeof practiceAttemptSchema>;
export type PracticeAttemptHistory = z.infer<typeof practiceAttemptHistorySchema>;
export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AiChatHistory = z.infer<typeof aiChatHistorySchema>;
export type AiLessonQuestionContext = z.infer<typeof aiLessonQuestionContextSchema>;
export type MockQuestionEvaluation = z.infer<typeof mockQuestionEvaluationSchema>;
export type MockInterviewEvaluation = z.infer<typeof mockInterviewEvaluationSchema>;
export type MockInterview = z.infer<typeof mockInterviewSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    "startDate" | "reminderEnabled" | "reminderTime" | "adaptiveTodayEnabled"
  >
>;
export type AdaptivePlanItemKind = z.infer<typeof adaptivePlanItemKindSchema>;
export type AdaptivePlanItem = z.infer<typeof adaptivePlanItemSchema>;
export type AdaptivePlan = z.infer<typeof adaptivePlanSchema>;
export type LearningAnalyticsDay = z.infer<typeof learningAnalyticsDaySchema>;
export type LearningAnalyticsSkill = z.infer<typeof learningAnalyticsSkillSchema>;
export type LearningAnalytics = z.infer<typeof learningAnalyticsSchema>;
export type LearningBackup = z.infer<typeof learningBackupSchema>;
export type BootstrapContent = z.infer<typeof bootstrapContentSchema>;
export type BootstrapProgress = z.infer<typeof bootstrapProgressSchema>;
export type BootstrapData = z.infer<typeof bootstrapDataSchema>;
