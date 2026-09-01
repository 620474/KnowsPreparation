import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  adaptivePlanCheckInSchema,
  careerVacancyAnalysisSchema,
  type AdaptivePlanCheckIn,
  type AdaptivePlanItem,
  type CareerVacancyAnalysis,
  type InterviewQuestion,
} from "@prep/contracts";
import { z } from "zod";

import { extractResponseText, type GeneratedLesson } from "../learning/ai-course";
import { createOpenAiAbortContext, isAbortError } from "../learning/openai-request";

const OFFICIAL_SOURCE_DOMAINS = [
  "developer.mozilla.org",
  "react.dev",
  "typescriptlang.org",
  "tc39.es",
  "nodejs.org",
  "web.dev",
  "w3.org",
  "whatwg.org",
  "vite.dev",
  "vitest.dev",
  "testing-library.com",
  "playwright.dev",
  "docs.nestjs.com",
  "mongodb.com",
  "developers.openai.com",
] as const;

const sourceVerificationSchema = z.object({
  status: z.enum(["verified", "partial", "rejected"]),
  score: z.number().int().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(["warning", "critical"]),
    claim: z.string().trim().min(1).max(2_000),
    message: z.string().trim().min(1).max(2_000),
    sourceUrls: z.array(z.url()).max(8),
  })).max(20),
  sources: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    url: z.url(),
  })).max(20),
});

const interviewAnswerAssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  strengths: z.array(z.string().trim().min(1).max(500)).max(6),
  gaps: z.array(z.string().trim().min(1).max(500)).max(6),
  followUpQuestion: z.string().trim().min(1).max(800).nullable(),
  nextQuestionId: z.string().trim().min(1).max(160).nullable(),
});

const planOrderingSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1).max(300)).max(20),
  rationale: z.string().trim().min(1).max(2_000),
});

const jsonSchema = {
  sourceVerification: {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { type: "string", enum: ["verified", "partial", "rejected"] },
      score: { type: "integer", minimum: 0, maximum: 100 },
      issues: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            severity: { type: "string", enum: ["warning", "critical"] },
            claim: { type: "string" },
            message: { type: "string" },
            sourceUrls: { type: "array", items: { type: "string" } },
          },
          required: ["severity", "claim", "message", "sourceUrls"],
        },
      },
      sources: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, url: { type: "string" } },
          required: ["title", "url"],
        },
      },
    },
    required: ["status", "score", "issues", "sources"],
  },
  interviewAssessment: {
    type: "object",
    additionalProperties: false,
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      strengths: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      followUpQuestion: { anyOf: [{ type: "string" }, { type: "null" }] },
      nextQuestionId: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: [
      "score",
      "confidence",
      "strengths",
      "gaps",
      "followUpQuestion",
      "nextQuestionId",
    ],
  },
  planOrdering: {
    type: "object",
    additionalProperties: false,
    properties: {
      orderedIds: { type: "array", items: { type: "string" } },
      rationale: { type: "string" },
    },
    required: ["orderedIds", "rationale"],
  },
  vacancyAnalysis: {
    type: "object",
    additionalProperties: false,
    properties: {
      fitScore: { type: "integer", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      matchedRequirements: { type: "array", items: { type: "string" } },
      gaps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            requirement: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            action: { type: "string" },
            skillKeys: {
              type: "array",
              items: {
                type: "string",
                enum: [
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
                ],
              },
            },
          },
          required: ["requirement", "severity", "action", "skillKeys"],
        },
      },
      likelyInterviewTopics: { type: "array", items: { type: "string" } },
      resumeKeywords: { type: "array", items: { type: "string" } },
      clarificationQuestions: { type: "array", items: { type: "string" } },
      preparationActions: { type: "array", items: { type: "string" } },
      recommendedPriority: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: [
      "fitScore",
      "summary",
      "matchedRequirements",
      "gaps",
      "likelyInterviewTopics",
      "resumeKeywords",
      "clarificationQuestions",
      "preparationActions",
      "recommendedPriority",
    ],
  },
} as const;

export type SourceVerification = z.infer<typeof sourceVerificationSchema>;
export type InterviewAnswerAssessment = z.infer<
  typeof interviewAnswerAssessmentSchema
>;

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return Boolean(this.config.get<string>("OPENAI_API_KEY")?.trim());
  }

  get model() {
    return (
      this.config.get<string>("OPENAI_AGENT_MODEL")?.trim() ||
      this.config.get<string>("OPENAI_REVIEW_MODEL")?.trim() ||
      "gpt-5.6-terra"
    );
  }

  async verifyLesson(
    input: { track: string; title: string; lesson: GeneratedLesson },
    signal?: AbortSignal,
  ): Promise<SourceVerification> {
    const response = await this.request(
      "lesson_source_verification",
      jsonSchema.sourceVerification,
      [
        "Ты проверяешь технический урок по frontend-разработке по первичным официальным источникам.",
        "Используй web search и сверяй только проверяемые технические утверждения, семантику кода и ответы квиза.",
        "Не оценивай стиль повторно. Не используй форумы, блоги и агрегаторы.",
        "critical означает фактическую ошибку, способную научить неправильному; warning — неполное или недостаточно подтверждённое утверждение.",
        "Верни только реально использованные URL. Если доказательств недостаточно, поставь partial, а не выдумывай подтверждение.",
      ].join(" "),
      input,
      5_000,
      signal,
      {
        tools: [{
          type: "web_search",
          filters: { allowed_domains: [...OFFICIAL_SOURCE_DOMAINS] },
        }],
        include: ["web_search_call.action.sources"],
      },
    );
    const parsed = sourceVerificationSchema.parse(response.data);
    const consulted = new Map(response.sources.map((source) => [source.url, source]));
    const sources = parsed.sources.filter(
      (source) => consulted.has(source.url) && this.isAllowedOfficialUrl(source.url),
    );
    const sourceUrls = new Set(sources.map((source) => source.url));
    const issues = parsed.issues.map((issue) => ({
      ...issue,
      sourceUrls: issue.sourceUrls.filter((url) => sourceUrls.has(url)),
    }));
    const hasCritical = issues.some((issue) => issue.severity === "critical");
    return {
      status: hasCritical
        ? "rejected"
        : parsed.status === "verified" && sources.length === 0
          ? "partial"
          : parsed.status,
      score: parsed.score,
      issues,
      sources,
    };
  }

  async assessInterviewAnswer(input: {
    company: string;
    vacancyContext?: string;
    question: InterviewQuestion;
    answer: string;
    followUps: Array<{ question: string; answer: string }>;
    followUpCount: number;
    candidateQuestions: InterviewQuestion[];
  }): Promise<InterviewAnswerAssessment> {
    const response = await this.request(
      "adaptive_interview_answer",
      jsonSchema.interviewAssessment,
      [
        "Ты технический интервьюер frontend Middle+/Senior.",
        "Оцени ответ по точности, глубине, практическому опыту и ясности.",
        "Если followUpCount меньше 2 и есть важный пробел, задай один короткий follow-up; иначе верни null.",
        "Следующий вопрос разрешено выбирать только по id из candidateQuestions; если список пуст, верни null.",
        "Не подсказывай ответ и пиши по-русски.",
      ].join(" "),
      input,
      2_000,
    );
    const parsed = interviewAnswerAssessmentSchema.parse(response.data);
    const candidateIds = new Set(input.candidateQuestions.map((question) => question.id));
    return {
      ...parsed,
      followUpQuestion: input.followUpCount >= 2 ? null : parsed.followUpQuestion,
      nextQuestionId:
        parsed.nextQuestionId && candidateIds.has(parsed.nextQuestionId)
          ? parsed.nextQuestionId
          : null,
    };
  }

  async orderAdaptivePlan(input: {
    checkIn: AdaptivePlanCheckIn;
    candidates: AdaptivePlanItem[];
  }) {
    const checkIn = adaptivePlanCheckInSchema.parse(input.checkIn);
    const response = await this.request(
      "adaptive_day_plan",
      jsonSchema.planOrdering,
      [
        "Ты планировщик подготовки frontend-разработчика к собеседованиям.",
        "Выбери и упорядочь только id из candidates под доступное время, энергию и фокус пользователя.",
        "Не дублируй id и не превышай availableMinutes. При низкой энергии предпочитай короткие повторения, при высокой — практику и мок.",
        "Критичные действия по активным вакансиям можно включать, но они не должны вытеснять всю техническую подготовку.",
      ].join(" "),
      { checkIn, candidates: input.candidates },
      1_500,
    );
    const parsed = planOrderingSchema.parse(response.data);
    const candidateMap = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
    const seen = new Set<string>();
    const ordered: AdaptivePlanItem[] = [];
    let minutes = 0;
    for (const id of parsed.orderedIds) {
      const candidate = candidateMap.get(id);
      if (!candidate || seen.has(id) || minutes + candidate.minutes > checkIn.availableMinutes) {
        continue;
      }
      seen.add(id);
      ordered.push(candidate);
      minutes += candidate.minutes;
    }
    if (ordered.length === 0 && input.candidates.length > 0) {
      throw new Error("AI did not select valid plan items");
    }
    return { items: ordered, rationale: parsed.rationale };
  }

  async analyzeVacancy(input: {
    company: string;
    role: string;
    description: string;
    stack: string[];
    candidateProfile: string;
  }): Promise<Omit<CareerVacancyAnalysis, "model" | "analyzedAt">> {
    const response = await this.request(
      "career_vacancy_analysis",
      jsonSchema.vacancyAnalysis,
      [
        "Ты технический рекрутер и frontend hiring manager.",
        "Сопоставь вакансию только с фактами из candidateProfile; отсутствие факта считай пробелом, а не угадывай опыт.",
        "Выдели требования, вероятные темы интервью, ключевые слова для честной адаптации резюме и конкретные действия подготовки.",
        "Не советуй приписывать несуществующий опыт. Пиши по-русски и кратко.",
      ].join(" "),
      input,
      4_000,
    );
    return careerVacancyAnalysisSchema
      .omit({ model: true, analyzedAt: true })
      .parse(response.data);
  }

  private async request(
    name: string,
    schema: Record<string, unknown>,
    instructions: string,
    input: unknown,
    maxOutputTokens: number,
    externalSignal?: AbortSignal,
    extras: Record<string, unknown> = {},
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException("AI-агенты не настроены: добавь OPENAI_API_KEY.");
    }
    const abortContext = createOpenAiAbortContext(externalSignal);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          instructions,
          input: JSON.stringify(input),
          max_output_tokens: maxOutputTokens,
          store: false,
          text: { format: { type: "json_schema", name, strict: true, schema } },
          ...extras,
        }),
        signal: abortContext.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        this.logger.warn({ event: "agent_http_error", operation: name, status: response.status });
        throw new BadGatewayException(`AI-агент не ответил (HTTP ${response.status}).`);
      }
      const data = JSON.parse(extractResponseText(body)) as unknown;
      return { data, sources: this.extractSources(body) };
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      if (abortContext.timedOut() || isAbortError(error)) {
        throw new BadGatewayException("AI-агент не ответил за 90 секунд.");
      }
      this.logger.warn({
        event: "agent_request_failed",
        operation: name,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      throw new BadGatewayException("AI-агент вернул некорректный ответ.");
    } finally {
      abortContext.dispose();
    }
  }

  private extractSources(value: unknown) {
    if (typeof value !== "object" || value === null || !("output" in value)) return [];
    const output = (value as { output?: unknown }).output;
    if (!Array.isArray(output)) return [];
    const sources = new Map<string, { title: string; url: string }>();
    for (const item of output) {
      if (typeof item !== "object" || item === null || !("action" in item)) continue;
      const action = (item as { action?: unknown }).action;
      if (typeof action !== "object" || action === null || !("sources" in action)) continue;
      const values = (action as { sources?: unknown }).sources;
      if (!Array.isArray(values)) continue;
      for (const source of values) {
        if (typeof source !== "object" || source === null) continue;
        const url = "url" in source && typeof source.url === "string" ? source.url : "";
        const title = "title" in source && typeof source.title === "string"
          ? source.title
          : url;
        if (url && this.isAllowedOfficialUrl(url)) sources.set(url, { title, url });
      }
    }
    return [...sources.values()];
  }

  private isAllowedOfficialUrl(value: string) {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return OFFICIAL_SOURCE_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }
}
