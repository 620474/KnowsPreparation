import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  extractResponseText,
  normalizeGeneratedCourse,
  normalizeGeneratedLesson,
} from "./ai-course";
import type { InterviewQuestion, StudyBlock, StudyDay } from "./curriculum";
import type { GenerateAiCourseDto } from "./dto/learning.dto";
import { normalizeMockEvaluation } from "./mock-interview";
import { OpenAiSseParser } from "./openai-sse";
import type { AiCourseItem } from "./schemas/ai-course.schema";
import type { LearningResource } from "./resources";

export interface AiChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type AiDeltaHandler = (delta: string) => void;

const courseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    lessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          objective: { type: "string" },
          estimatedMinutes: { type: "integer" },
          resourceTopics: { type: "array", items: { type: "string" } },
        },
        required: ["title", "objective", "estimatedMinutes", "resourceTopics"],
      },
    },
  },
  required: ["title", "summary", "lessons"],
} as const;

const lessonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    goals: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
    codeExamples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          code: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["title", "code", "explanation"],
      },
    },
    diagrams: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          nodes: {
            type: "array",
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                detail: { type: "string" },
                row: { type: "integer", minimum: 0, maximum: 4 },
                column: { type: "integer", minimum: 0, maximum: 4 },
              },
              required: ["id", "label", "detail", "row", "column"],
            },
          },
          edges: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                label: { type: "string" },
              },
              required: ["from", "to", "label"],
            },
          },
        },
        required: ["title", "description", "nodes", "edges"],
      },
    },
    commonMistakes: { type: "array", items: { type: "string" } },
    interviewQuestions: { type: "array", items: { type: "string" } },
    practice: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        statement: { type: "string" },
        constraints: { type: "array", items: { type: "string" } },
        examples: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              input: { type: "string" },
              output: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["input", "output", "explanation"],
          },
        },
      },
      required: ["title", "statement", "constraints", "examples"],
    },
    quiz: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" },
          topic: { type: "string" },
        },
        required: [
          "prompt",
          "options",
          "correctOptionIndex",
          "explanation",
          "topic",
        ],
      },
    },
    summary: { type: "string" },
  },
  required: [
    "goals",
    "explanation",
    "codeExamples",
    "diagrams",
    "commonMistakes",
    "interviewQuestions",
    "practice",
    "quiz",
    "summary",
  ],
} as const;

const mockEvaluationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weakTopics: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          questionId: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 5 },
          feedback: { type: "string" },
          missingPoints: { type: "array", items: { type: "string" } },
        },
        required: ["questionId", "score", "feedback", "missingPoints"],
      },
    },
  },
  required: ["overallScore", "summary", "strengths", "weakTopics", "questions"],
} as const;

@Injectable()
export class AiContentService {
  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return Boolean(this.config.get<string>("OPENAI_API_KEY")?.trim());
  }

  get model() {
    return this.config.get<string>("OPENAI_MODEL")?.trim() || "gpt-5.6-sol";
  }

  get chatModel() {
    return this.config.get<string>("OPENAI_CHAT_MODEL")?.trim() || this.model;
  }

  async generateCourse(dto: GenerateAiCourseDto, lessonCount: number) {
    const result = await this.request<unknown>(
      "frontend_interview_course",
      courseSchema,
      [
        "Ты методист по подготовке frontend-разработчиков Middle+/Senior к собеседованиям в российский бигтех.",
        "Создай персональный учебный курс на русском языке.",
        "Темы должны идти от наиболее критичных к менее срочным и сочетать JavaScript-платформу, алгоритмы, React/TypeScript, архитектуру и работу с AI.",
        "Не копируй статьи и не выдумывай ссылки. В resourceTopics укажи только поисковые темы для привязки существующего каталога.",
        `Верни ровно ${lessonCount} уроков. Каждый урок должен помещаться в указанное дневное время.`,
      ].join(" "),
      JSON.stringify(dto),
      5_000,
    );
    try {
      return normalizeGeneratedCourse(result, lessonCount);
    } catch {
      throw new BadGatewayException("OpenAI вернул неполный план курса. Попробуй ещё раз.");
    }
  }

  async generateLesson(
    profile: GenerateAiCourseDto,
    item: AiCourseItem,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
  ) {
    const sourceContext = resources.map((resource) => ({
      title: resource.title,
      provider: resource.provider,
      description: resource.description,
      learningGoal: resource.learningGoal ?? "",
    }));
    const result = await this.request<unknown>(
      "frontend_interview_lesson",
      lessonSchema,
      [
        "Ты сильный frontend-инженер и наставник, готовящий Middle+/Senior разработчика к собеседованию в российский бигтех.",
        "Напиши самостоятельный урок на русском языке, а не пересказ источников.",
        "Объяснение должно быть точным, практичным и пригодным для ответа вслух на собеседовании.",
        "Используй современные примеры JavaScript/TypeScript без сторонних библиотек, если тема не требует иного.",
        "Практическая задача должна иметь однозначное условие, ограничения и примеры, но не содержать готовое решение.",
        "После урока добавь ровно 10 проверочных вопросов с четырьмя уникальными вариантами ответа, одним правильным вариантом и коротким объяснением.",
        "Распредели правильные варианты по разным позициям и проверяй понимание причин, а не запоминание формулировок.",
        "Если тема выигрывает от визуализации процесса или потока данных, добавь 1–2 содержательные диаграммы; иначе верни diagrams: [].",
        "В диаграмме используй уникальные id узлов, связывай рёбра только с существующими id и размещай узлы без наложений в сетке row/column от 0 до 4.",
        "Источники переданы только как ориентиры; не добавляй ссылки и не утверждай, что цитируешь их.",
      ].join(" "),
      JSON.stringify({ profile, lesson: item, sources: sourceContext }),
      14_000,
      onDelta,
    );
    try {
      return normalizeGeneratedLesson(result);
    } catch {
      throw new BadGatewayException("OpenAI вернул неполный урок. Попробуй ещё раз.");
    }
  }

  async generateYandexLesson(
    day: StudyDay,
    block: StudyBlock,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
  ) {
    return this.generateInterviewSprintLesson("Яндекс", day, block, resources, onDelta);
  }

  async generateOzonLesson(
    day: StudyDay,
    block: StudyBlock,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
  ) {
    return this.generateInterviewSprintLesson("Ozon", day, block, resources, onDelta);
  }

  private async generateInterviewSprintLesson(
    company: "Яндекс" | "Ozon",
    day: StudyDay,
    block: StudyBlock,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
  ) {
    const sourceContext = resources.map((resource) => ({
      title: resource.title,
      provider: resource.provider,
      description: resource.description,
      learningGoal: resource.learningGoal ?? "",
    }));
    const result = await this.request<unknown>(
      company === "Ozon"
        ? "ozon_frontend_interview_lesson"
        : "yandex_frontend_interview_lesson",
      lessonSchema,
      [
        `Ты сильный frontend-инженер, готовящий кандидата к интервью в ${company}.`,
        `Подготовь самостоятельный урок на русском языке для Middle+/Senior frontend-разработчика по текущему блоку ${company === "Ozon" ? "14" : "21"}-дневного спринта.`,
        "Материал должен помогать на секциях платформы, решения задач и работы с AI: объясняй причинно-следственные связи и формулировки для ответа вслух.",
        "Для алгоритмического блока обязательно разбери подходы, структуры данных и Big-O, но не выдавай готовое решение переданной задачи.",
        "Примеры кода должны иллюстрировать отдельные идеи и не должны целиком решать переданное упражнение.",
        "Сохрани исходные ограничения упражнения и добавь практику без готового решения.",
        "После урока добавь ровно 10 проверочных вопросов с четырьмя уникальными вариантами ответа, одним правильным вариантом и объяснением.",
        "Вопросы должны проверять материал текущего блока и быть полезными для собеседования.",
        "Если тема выигрывает от визуализации процесса или потока данных, добавь 1–2 содержательные диаграммы; иначе верни diagrams: [].",
        "В диаграмме используй уникальные id узлов, связывай рёбра только с существующими id и размещай узлы без наложений в сетке row/column от 0 до 4.",
        "Источники используй только как ориентиры: не добавляй новые ссылки и не утверждай, что цитируешь их.",
        company === "Ozon"
          ? "Программа составлена по пользовательским конспектам интервью 2024 года. Не называй её официальным процессом Ozon и используй React вместо других UI-фреймворков."
          : "Ориентируй материал на заявленные секции frontend-интервью Яндекса.",
      ].join(" "),
      JSON.stringify({
        targetCompany: company,
        day: { number: day.dayNumber, title: day.title },
        block,
        sources: sourceContext,
      }),
      14_000,
      onDelta,
    );
    try {
      return normalizeGeneratedLesson(result);
    } catch {
      throw new BadGatewayException("OpenAI вернул неполный разбор темы. Попробуй ещё раз.");
    }
  }

  async generateChatReply(
    lessonContext: string,
    history: AiChatHistoryMessage[],
    content: string,
    onDelta?: AiDeltaHandler,
  ) {
    return this.requestText(
      [
        "Ты персональный наставник по frontend-разработке и собеседованиям в российский бигтех.",
        "Отвечай на русском языке по текущей учебной теме и учитывай уровень Middle+/Senior.",
        "Если пользователь прислал код или ошибку, сначала объясни причину, затем предложи следующий шаг.",
        "Если пользователь решает задачу, не выдавай полное решение сразу: задай уточняющий вопрос или дай небольшую подсказку.",
        "Чётко отмечай предположения. Не выдумывай содержание источников, которых нет в контексте.",
        `\n\nКонтекст текущей темы:\n${lessonContext}`,
      ].join(" "),
      [
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content },
      ],
      2_500,
      onDelta,
    );
  }

  async evaluateMockInterview(
    entries: Array<{ question: InterviewQuestion; answer: string }>,
  ) {
    const result = await this.request<unknown>(
      "frontend_mock_interview_evaluation",
      mockEvaluationSchema,
      [
        "Ты проводишь тренировочное frontend-собеседование уровня Middle+/Senior.",
        "Оцени каждый ответ по точности, глубине, ясности и наличию практических примеров.",
        "Не завышай оценку за общие слова. Укажи конкретные пробелы и сильные стороны.",
        "Пиши по-русски, кратко и конструктивно. Верни оценку для каждого переданного questionId.",
      ].join(" "),
      JSON.stringify(
        entries.map(({ question, answer }) => ({
          questionId: question.id,
          category: question.category,
          question: question.prompt,
          answer,
        })),
      ),
      4_000,
    );
    try {
      return normalizeMockEvaluation(
        result,
        entries.map(({ question }) => question.id),
      );
    } catch {
      throw new BadGatewayException("OpenAI вернул неполную оценку интервью. Попробуй ещё раз.");
    }
  }

  private async request<T>(
    schemaName: string,
    schema: Record<string, unknown>,
    instructions: string,
    input: string,
    maxOutputTokens: number,
    onDelta?: AiDeltaHandler,
  ) {
    const payload = {
      model: this.model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    };
    const text = onDelta
      ? await this.performStreamingRequest(payload, onDelta)
      : extractResponseText(await this.performRequest(payload));

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadGatewayException("OpenAI вернул ответ в неожиданном формате.");
    }
  }

  private async requestText(
    instructions: string,
    input: AiChatHistoryMessage[],
    maxOutputTokens: number,
    onDelta?: AiDeltaHandler,
  ) {
    const payload = {
      model: this.chatModel,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    };
    try {
      const text = (
        onDelta
          ? await this.performStreamingRequest(payload, onDelta)
          : extractResponseText(await this.performRequest(payload))
      ).trim();
      if (!text) throw new Error("Empty response");
      return text;
    } catch {
      throw new BadGatewayException("OpenAI вернул пустой ответ. Попробуй ещё раз.");
    }
  }

  private async performStreamingRequest(
    payload: Record<string, unknown>,
    onDelta: AiDeltaHandler,
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI-генерация не настроена. Добавь OPENAI_API_KEY в переменные сервера.",
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadGatewayException(
          `OpenAI не смог сгенерировать материал (HTTP ${response.status}).`,
        );
      }
      if (!response.body) throw new BadGatewayException("OpenAI не открыл поток ответа.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new OpenAiSseParser();
      let output = "";
      const handleEvents = (events: unknown[]) => {
        for (const value of events) {
          if (typeof value !== "object" || value === null) continue;
          const event = value as { type?: string; delta?: unknown; message?: unknown };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            output += event.delta;
            onDelta(event.delta);
          }
          if (event.type === "error") {
            throw new BadGatewayException(
              typeof event.message === "string" ? event.message : "OpenAI прервал поток ответа.",
            );
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        handleEvents(parser.push(decoder.decode(value, { stream: true })));
      }
      handleEvents(parser.push(decoder.decode()));
      handleEvents(parser.finish());
      if (!output.trim()) throw new BadGatewayException("OpenAI вернул пустой поток.");
      return output;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new BadGatewayException("OpenAI не ответил за 90 секунд. Попробуй ещё раз.");
      }
      throw new BadGatewayException("Не удалось прочитать поток OpenAI.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async performRequest(payload: Record<string, unknown>) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI-генерация не настроена. Добавь OPENAI_API_KEY в переменные сервера.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new BadGatewayException(
          `OpenAI не смог сгенерировать материал (HTTP ${response.status}).`,
        );
      }

      return body;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new BadGatewayException("OpenAI не ответил за 90 секунд. Попробуй ещё раз.");
      }
      throw new BadGatewayException("Не удалось получить корректный ответ от OpenAI.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
