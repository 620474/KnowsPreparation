export type QuestionStatus = "new" | "learning" | "review" | "mastered";
export type Difficulty = "easy" | "medium" | "hard";
export type AiLevel = "middle" | "middle-plus" | "senior";
export type AiChatScope = "course" | "yandex";
export type StudyBlockKind = "theory" | "practice" | "ai" | "review";
export type ResourceLanguage = "ru" | "en";
export type ResourceKind = "main" | "deep-dive" | "practice" | "reference" | "case-study";
export type ResourceLevel = "basic" | "beginner" | "intermediate" | "advanced";
export type ResourceStatus = "current" | "evergreen" | "historical";
export type ResourcePriority = "must" | "should" | "optional";
export type ResourceTopic =
  | "AI"
  | "JavaScript"
  | "React"
  | "TypeScript"
  | "Algorithms"
  | "Browser"
  | "Performance"
  | "CSS"
  | "Accessibility"
  | "Architecture"
  | "Testing"
  | "Security"
  | "Interview";

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  provider: string;
  language: ResourceLanguage;
  kind: ResourceKind;
  topics: ResourceTopic[];
  estimatedMinutes: number;
  description: string;
  publishedYear?: number;
  tags?: string[];
  level?: ResourceLevel;
  status?: ResourceStatus;
  paywall?: boolean;
  registrationRequired?: boolean;
  learningGoal?: string;
  whySelected?: string;
  verifiedAt?: string;
  priority?: ResourcePriority;
  practicalTask?: string;
  interviewQuestions?: string[];
}

export interface StudyExerciseExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface StudyExercise {
  statement: string;
  signature?: string;
  constraints: string[];
  examples: StudyExerciseExample[];
}

export interface StudyBlock {
  id: string;
  kind: StudyBlockKind;
  title: string;
  description: string;
  minutes: number;
  resourceIds: string[];
  exercise?: StudyExercise;
}

export interface StudyDay {
  id: string;
  dayNumber: number;
  offset: number;
  title: string;
  blocks: StudyBlock[];
}

export interface StudyWeek {
  number: number;
  title: string;
  outcome: string;
  isBuffer: boolean;
  days: StudyDay[];
}

export interface InterviewQuestion {
  id: string;
  number: number;
  category: string;
  prompt: string;
}

export interface TaskProgress {
  completed: boolean;
  note: string;
  customTask: string;
  solution: string;
}

export type TaskProgressPatch = Partial<TaskProgress>;
export type TaskUpdateHandler = (
  taskId: string,
  progress: TaskProgressPatch,
) => Promise<boolean>;

export interface QuestionProgress {
  status: QuestionStatus;
  note: string;
}

export interface AlgorithmEntry {
  id: string;
  title: string;
  pattern: string;
  difficulty: Difficulty;
  solvedAt: string;
  note: string;
}

export interface AiCourseProfile {
  goal: string;
  level: AiLevel;
  deadline: string;
  dailyMinutes: number;
  targetCompanies: string[];
  weakTopics: string[];
}

export interface AiCourseItem {
  id: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  resourceIds: string[];
}

export interface AiCourse extends AiCourseProfile {
  title: string;
  summary: string;
  version: number;
  generatedAt: string;
  items: AiCourseItem[];
}

export interface AiDiagramNode {
  id: string;
  label: string;
  detail: string;
  row: number;
  column: number;
}

export interface AiDiagramEdge {
  from: string;
  to: string;
  label: string;
}

export interface AiDiagram {
  title: string;
  description: string;
  nodes: AiDiagramNode[];
  edges: AiDiagramEdge[];
}

export interface AiLesson {
  itemId: string;
  title: string;
  goals: string[];
  explanation: string;
  codeExamples: Array<{
    title: string;
    code: string;
    explanation: string;
  }>;
  diagrams: AiDiagram[];
  commonMistakes: string[];
  interviewQuestions: string[];
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
  resourceIds: string[];
  version: number;
  generatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiChatHistory {
  itemId: string;
  title: string;
  messages: AiChatMessage[];
}

export interface AiLessonQuestionContext {
  section: string;
  excerpt: string;
}

export interface BootstrapData {
  settings: {
    startDate: string;
    dailyMinutes: number;
    coreWeeks: number;
    bufferWeeks: number;
  };
  curriculum: StudyWeek[];
  yandexSprint: StudyDay[];
  resources: LearningResource[];
  questions: InterviewQuestion[];
  algorithmPatterns: string[];
  progress: {
    tasks: Record<string, TaskProgress>;
    questions: Record<string, QuestionProgress>;
  };
  algorithms: AlgorithmEntry[];
  ai: {
    enabled: boolean;
    model: string;
    course: AiCourse | null;
    lessons: Record<string, AiLesson>;
    yandexLessons: Record<string, AiLesson>;
  };
}
