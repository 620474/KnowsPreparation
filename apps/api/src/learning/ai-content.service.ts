import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  extractResponseText,
  normalizeGeneratedCourse,
  normalizeGeneratedLesson,
  normalizeGeneratedLessonReview,
  type GeneratedLesson,
} from "./ai-course";
import {
  normalizeInterviewDefenseQuestions,
  normalizeInterviewEvaluation,
  normalizeInterviewFollowUp,
} from "./interview-session-ai";
import type { InterviewQuestion, StudyBlock, StudyDay } from "./curriculum";
import type { GenerateAiCourseDto } from "./dto/learning.dto";
import { normalizeMockEvaluation } from "./mock-interview";
import { createOpenAiAbortContext, isAbortError } from "./openai-request";
import { OpenAiSseParser } from "./openai-sse";
import type { AiCourseItem } from "./schemas/ai-course.schema";
import type { LearningResource } from "./resources";
import type { TrackLessonPrompt } from "./track-registry";

export interface AiChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type AiDeltaHandler = (delta: string) => void;

const LESSON_CLARITY_INSTRUCTIONS = `
# Ясность технического объяснения

Пиши для Middle+/Senior frontend-разработчика, который знает базовые конструкции
программирования и frontend-разработки, но может впервые изучать конкретную тему
этого урока. Не превращай материал в учебник для новичка и не снижай техническую
глубину.

Главный критерий: читатель не должен быть обязан заранее знать специальные термины
текущей темы, чтобы понять их объяснение.

## Введение новых терминов

Когда термин важен для понимания темы и его знание нельзя уверенно предположить
у указанной аудитории, при первом существенном употреблении:

1. Сначала кратко объясни смысл понятия обычным точным русским языком, не опираясь
   на несколько других ещё не объяснённых терминов.
2. Затем назови профессиональный термин. Если существует естественное принятое
   русское название, дай его вместе с английским термином в скобках.
3. Дай короткий практический пример: код, наблюдаемое поведение системы или конкретный
   сценарий.
4. Объясни, зачем понятие нужно разработчику: какой механизм, баг, trade-off,
   производительность или архитектурное решение оно помогает понимать.
5. После этого используй введённый термин кратко и последовательно; не повторяй
   длинное определение без необходимости.

Не превращай эти пять пунктов в пять обязательных подзаголовков. Обычно введение
термина должно занимать 2–4 предложения и естественно входить в текущий абзац.

Если входной контекст явно показывает, что термин уже был полноценно введён ранее,
не объясняй его заново. Если такой информации нет, не выдумывай историю обучения.

Не объясняй без необходимости базовые слова и конструкции уровня function, variable,
array и аналогичные общеизвестные для Middle+/Senior frontend-разработчика понятия.

## Терминологическая точность

Формальный перевод не является объяснением. Фразы вида «Task — это задача»,
«Hydration — это гидратация» или «Batching — это батчинг» недостаточны.

Не изобретай неестественные русские кальки только ради перевода. Если в русскоязычной
разработке обычно используется английский термин или транслитерация, сначала объясни
его смысл по-русски, затем укажи канонический английский термин и дальше используй
обычную профессиональную форму.

Не переводи и не переименовывай идентификаторы API, методы, типы и сущности языка:
например Promise, queueMicrotask, requestAnimationFrame, Array.prototype.shift.

При первом существенном появлении незнакомого сокращения сначала раскрой полное
название и смысл, затем используй сокращение. Не вводи сокращение, если оно почти
не используется дальше.

Используй одно название для одного понятия. Не чередуй без причины несколько
синонимов после того, как термин выбран.

## Когнитивная нагрузка

Преимущественно одна смысловая мысль на абзац. Предпочитай короткие абзацы
из 1–3 предложений длинным плотным блокам.

Не объясняй один новый термин цепочкой из нескольких других ещё не введённых
терминов. Если зависимое понятие действительно необходимо, сначала дай ему
минимально достаточный контекст либо перестрой объяснение.

Не перечисляй профессиональные термины быстрее, чем объясняешь причинную связь
между ними.

Аналогию можно использовать только после или рядом с техническим объяснением.
Аналогия помогает интуиции, но никогда не заменяет определение и механизм.

## Глубина и точность

Простое объяснение — это первый слой, а не замена технической глубины.
После введения понятия раскрывай точный механизм, ограничения, edge cases,
trade-offs и интервью-важные детали на уровне Middle+/Senior.

Явно различай:
- фактическое или нормативное поведение;
- упрощённую учебную модель, если она используется для понимания;
- особенности конкретной реализации, фреймворка, runtime или браузера.

Не выдавай удобную учебную модель за буквальный алгоритм спецификации.
Не выдавай особенность одной реализации за универсальное правило.

Каждое важное причинное утверждение должно отвечать не только на вопрос «что
происходит», но и на вопрос «почему это приводит именно к такому результату».

## Контроль объёма

Статья может стать немного длиннее ради понятности, но не добавляй воду.
Не создавай отдельный словарь терминов вместо объяснений в месте использования.
Не добавляй определения ради самих определений.
Не повторяй одно и то же объяснение в explanation, commonMistakes и summary,
если повтор не даёт нового контекста.

Дополнительная ясность не должна уменьшать количество или качество codeExamples,
diagrams, commonMistakes, interviewQuestions, practice или quiz.

## Примеры требуемого стиля

Плохо:
«Выполнить одну task до конца. Выполнить microtask checkpoint.
Если есть rendering opportunity, обновить rendering».

Хорошо:
«Сначала event loop выполняет один запланированный крупный блок работы целиком.
Такая единица работы называется task. Например, callback таймера выполняется
в рамках запланированной browser task. После неё браузер обрабатывает накопившиеся
microtasks; этот этап называется microtask checkpoint. Возможность обновить
изображение на экране рассматривается отдельно, поэтому рендеринг не следует
автоматически после каждой task».

Плохо:
«Hydration — это гидратация серверного HTML».

Хорошо:
«Сервер может заранее прислать уже готовый HTML, но сам по себе этот HTML ещё
не связан с логикой React-компонентов на клиенте. Присоединение React к такой
существующей разметке называется гидратацией (hydration). Например, hydrateRoot
связывает клиентское дерево React с HTML, созданным на сервере, чтобы интерфейс
стал интерактивным. Это важно для понимания hydration mismatch и стоимости
первого запуска приложения».

Примеры задают принцип объяснения, а не шаблон, который нужно буквально повторять
для каждого термина.

## Финальная самопроверка

Перед ответом внутренне проверь:
- может ли читатель понять первый абзац с каждым центральным термином без знания
  этого термина заранее;
- есть ли у центральных новых понятий смысл, точное название, пример и практическая
  ценность;
- не появились ли несколько неизвестных терминов внутри одного определения;
- не были ли API или профессиональные названия искусственно переведены;
- сохранена ли исходная техническая глубина;
- не вырос ли текст из-за повторных определений.

Не выводи этот checklist, rubric или какие-либо новые поля в JSON.
Следуй только существующей JSON schema урока.
`.trim();

const LESSON_REVIEW_INSTRUCTIONS = `
Ты независимый senior frontend-инженер, технический редактор и reviewer
образовательного материала для Middle+/Senior разработчика.

Проверяй не только грамматику и фактическую корректность. Отдельно проверь,
сможет ли разработчик, который впервые изучает конкретную тему, понять используемую
в ней профессиональную терминологию без скрытых предположений о знании этой темы.

Не награждай текст за длину. Более длинное объяснение не считается более понятным.

# Техническая проверка

Проверь:
- фактическую и логическую корректность;
- корректность JavaScript, TypeScript, React и browser semantics;
- соответствие объяснений примерам кода;
- причинно-следственные связи;
- отсутствие выдачи упрощённой учебной модели за нормативный факт;
- отсутствие выдачи implementation-specific поведения за универсальное;
- quiz, practice, testCases и referenceSolution;
- сохранение уровня Middle+/Senior.

Любая существенная техническая ошибка запрещает verdict=approved.

# Проверка читаемости по первым употреблениям

Найди центральные специальные термины урока и мысленно проверь их первое
существенное употребление.

Для каждого такого термина спроси:
1. Может ли читатель понять смысл понятия до или непосредственно вместе
   с появлением профессионального названия?
2. Не является ли объяснение только переводом, транслитерацией или повторением
   самого термина?
3. Есть ли короткий конкретный пример либо наблюдаемое следствие, если термин
   играет важную роль в теме?
4. Понятно ли, зачем это понятие нужно разработчику?
5. Не объясняется ли новый термин несколькими другими ещё не введёнными терминами?
6. Используется ли после введения одно стабильное название без ненужных синонимов?

Фразы вида «Task — это задача», «Hydration — это гидратация» или
«Reconciliation — это reconciliation компонентов» не являются достаточными
определениями.

Не требуй объяснения базовых для Middle+/Senior frontend-разработчика слов
вроде function, variable или array, если урок не разбирает их необычную семантику.

Если входной контекст явно показывает, что термин был введён ранее, не требуй
повторного полного определения. Не предполагай такой контекст, если он не передан.

# Язык и терминология

API, методы, типы и сущности языка не переводятся и не переименовываются:
Promise, queueMicrotask, requestAnimationFrame, Array.prototype.shift и аналогичные
идентификаторы должны сохранять каноническое написание.

Не требуй искусственных русских кальк. Для профессионального английского термина
достаточно точного русского объяснения смысла и канонического английского названия,
если отдельная устоявшаяся русская форма отсутствует.

Незнакомое сокращение при первом существенном употреблении должно быть раскрыто,
если его значение не гарантировано аудиторией и сокращение важно для темы.

Проверь, что аналогии только дополняют техническое объяснение и не заменяют его.

# Структура текста

Проверь, что:
- абзацы преимущественно короткие и содержат одну основную мысль;
- причинные цепочки изложены в порядке, в котором их можно понять;
- новые термины не появляются плотными необъяснёнными пачками;
- определения не повторяются без необходимости;
- дополнительная доступность не убрала edge cases, trade-offs и Senior-level детали;
- explanation остаётся техническим уроком, а не словарём.

# Rubric 0–100

A. Введение и использование терминов — 0..25.
25: все центральные новые термины вводятся в понятном контексте, затем используются
последовательно; нет формальных или круговых определений.
18–24: есть единичные локальные недочёты, не мешающие основной теме.
10–17: несколько важных терминов предполагаются известными или объясняются формально.
0–9: понимание материала требует заранее знать большую часть терминологии урока.

B. Причинно-следственная понятность — 0..20.
20: читатель понимает не только что происходит, но и почему; порядок объяснения
совпадает с зависимостями понятий.
14–19: отдельные переходы требуют догадки.
7–13: существенные шаги причинной цепочки пропущены.
0–6: текст в основном перечисляет факты и термины без связующего механизма.

C. Техническая точность и границы модели — 0..20.
20: точный механизм, корректные ограничения, ясно отделены факт, учебная модель
и implementation-specific детали.
14–19: только небольшие неточности формулировки.
7–13: заметные чрезмерные обобщения или смешение уровней.
0–6: серьёзная ошибка или вводящая в заблуждение модель.

D. Примеры и практическая ценность — 0..15.
15: ключевые понятия связаны с короткими релевантными примерами, багами,
trade-offs, debugging, performance или архитектурными решениями.
10–14: примеров достаточно, но некоторые абстракции остаются без опоры.
5–9: примеры формальны или слабо помогают понять термин.
0–4: ключевые понятия практически не связаны с реальным поведением.

E. Когнитивная нагрузка и композиция — 0..10.
10: короткие сфокусированные абзацы, разумная плотность новых терминов,
нет ненужного повторения.
7–9: небольшая локальная перегрузка.
4–6: частые плотные абзацы или повторения.
0–3: материал систематически требует удерживать слишком много нераскрытых понятий.

F. Терминологическая и языковая дисциплина — 0..10.
10: последовательные названия, корректные сокращения, API не переводятся,
нет искусственных калек.
7–9: единичные проблемы.
4–6: повторяющиеся нарушения.
0–3: терминология сама создаёт путаницу.

score = A + B + C + D + E + F.

# Verdict policy

approved:
- score >= 88;
- нет critical issue;
- нет существенной фактической ошибки;
- нет центрального непонятного термина, который ломает основную причинную цепочку;
- practice, quiz, testCases и referenceSolution корректны.

revised:
- score < 88, если недостатки можно безопасно исправить;
- или score >= 88, но присутствует конкретная исправимая hard-gate проблема;
- correctedLesson должен содержать полный исправленный урок.

При исправлении добавляй объяснение локально возле первого употребления.
Не создавай отдельный glossary.
Не переписывай хороший материал без необходимости.
Не увеличивай объём просто ради score.
Не сокращай техническую глубину, code examples, diagrams, common mistakes,
interview questions или practice.
Сохрани ровно 20 вопросов: Core 10 + Deep 10, а также public и hidden tests.

rejected:
используй только если материал нельзя уверенно исправить локальной редактурой
без фактически новой генерации урока. Низкий score сам по себе не означает rejected.

Для каждого issue используй конкретную category, например:
factual_correctness, terminology_onboarding, circular_definition, causal_clarity,
implementation_vs_model, acronym, api_naming, cognitive_load, redundancy,
code_example, quiz или practice.

В message укажи конкретное место и проблему. Не пиши общие замечания вроде
«улучшить ясность».

Не добавляй ссылки и не утверждай, что проверил материал по источнику,
который не был передан во входном контексте.

Верни только данные существующей review JSON schema.
`.trim();

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
        runner: {
          type: "object",
          additionalProperties: false,
          properties: {
            starterCode: { type: "string" },
            testCases: {
              type: "array",
              minItems: 3,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  expression: { type: "string" },
                  expected: { type: "string" },
                },
                required: ["title", "expression", "expected"],
              },
            },
            hiddenTestCases: {
              type: "array",
              minItems: 3,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  expression: { type: "string" },
                  expected: { type: "string" },
                },
                required: ["title", "expression", "expected"],
              },
            },
          },
          required: ["starterCode", "testCases", "hiddenTestCases"],
        },
        referenceSolution: { type: "string" },
      },
      required: [
        "title",
        "statement",
        "constraints",
        "examples",
        "runner",
        "referenceSolution",
      ],
    },
    quiz: {
      type: "array",
      minItems: 20,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          code: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" },
          topic: { type: "string" },
          tier: { type: "string", enum: ["core", "deep"] },
          capability: {
            type: "string",
            enum: [
              "recall",
              "comprehension",
              "prediction",
              "debugging",
              "application",
              "transfer",
              "tradeoff",
            ],
          },
        },
        required: [
          "prompt",
          "code",
          "options",
          "correctOptionIndex",
          "explanation",
          "topic",
          "tier",
          "capability",
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

const lessonReviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["approved", "revised", "rejected"] },
    score: { type: "integer", minimum: 0, maximum: 100 },
    issues: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["warning", "critical"] },
          category: { type: "string" },
          message: { type: "string" },
        },
        required: ["severity", "category", "message"],
      },
    },
    correctedLesson: {
      anyOf: [lessonSchema, { type: "null" }],
    },
  },
  required: ["verdict", "score", "issues", "correctedLesson"],
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

const interviewFollowUpSchema = {
  type: "object",
  additionalProperties: false,
  properties: { question: { type: "string" } },
  required: ["question"],
} as const;

const interviewDefenseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string" },
    },
  },
  required: ["questions"],
} as const;

const interviewEvaluationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    platformScore: { type: "integer", minimum: 0, maximum: 100 },
    aiScore: { type: "integer", minimum: 0, maximum: 100 },
    communicationScore: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weakTopics: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    platformFeedback: { type: "string" },
    aiFeedback: { type: "string" },
    communicationFeedback: { type: "string" },
  },
  required: [
    "platformScore",
    "aiScore",
    "communicationScore",
    "summary",
    "strengths",
    "weakTopics",
    "recommendations",
    "platformFeedback",
    "aiFeedback",
    "communicationFeedback",
  ],
} as const;

@Injectable()
export class AiContentService {
  private readonly logger = new Logger(AiContentService.name);

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

  get reviewModel() {
    return (
      this.config.get<string>("OPENAI_REVIEW_MODEL")?.trim() ||
      "gpt-5.6-terra"
    );
  }

  get transcriptionModel() {
    return (
      this.config.get<string>("OPENAI_TRANSCRIPTION_MODEL")?.trim() ||
      "gpt-4o-mini-transcribe"
    );
  }

  async transcribeAudio(audio: Buffer, filename: string, mimeType: string) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Распознавание речи не настроено. Добавь OPENAI_API_KEY в переменные сервера.",
      );
    }
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename);
    form.append("model", this.transcriptionModel);
    form.append("language", "ru");
    form.append("response_format", "json");
    const abortContext = createOpenAiAbortContext();
    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: abortContext.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        this.logOpenAiHttpError(
          "audio_transcription",
          response.status,
          false,
          body,
          response.headers.get("x-request-id"),
        );
        throw new BadGatewayException(
          `OpenAI не смог распознать запись (HTTP ${response.status}).`,
        );
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("text" in body) ||
        typeof body.text !== "string" ||
        !body.text.trim()
      ) {
        throw new BadGatewayException("OpenAI вернул пустую расшифровку.");
      }
      return body.text.trim();
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      if (abortContext.timedOut() || isAbortError(error)) {
        this.logOpenAiTimeout("audio_transcription", false);
        throw new BadGatewayException("OpenAI не распознал запись за 90 секунд.");
      }
      this.logOpenAiUnexpectedError("audio_transcription", error, false);
      throw new BadGatewayException("Не удалось отправить запись на распознавание.");
    } finally {
      abortContext.dispose();
    }
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
    } catch (error) {
      this.logNormalizationError("frontend_interview_course", error);
      throw new BadGatewayException("OpenAI вернул неполный план курса. Попробуй ещё раз.");
    }
  }

  async generateLesson(
    profile: GenerateAiCourseDto,
    item: AiCourseItem,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
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
        LESSON_CLARITY_INSTRUCTIONS,
        "Объяснение должно быть точным, практичным и пригодным для ответа вслух на собеседовании.",
        "Используй современные примеры JavaScript/TypeScript без сторонних библиотек, если тема не требует иного.",
        "Практическая задача должна иметь однозначное условие, ограничения и примеры, но не содержать готовое решение.",
        "Для практики обязательно верни запускаемый runner: starterCode без решения, 3–6 публичных testCases, 3–6 дополнительных hiddenTestCases с пограничными случаями и полное referenceSolution для внутренней проверки.",
        "Каждый testCases.expression должен синхронно вызывать код задачи, а expected должен быть строкой с валидным JSON ожидаемого результата. Используй только обычный JavaScript без TypeScript-синтаксиса, import, require, async, Promise, DOM, fetch, таймеров, eval, Function, Date и случайности.",
        "После урока добавь ровно 20 проверочных вопросов: 10 tier=core и 10 tier=deep. Распределение capability строго: 2 recall, 4 comprehension, 4 prediction, 3 debugging, 3 application, 2 transfer, 2 tradeoff. Минимум 8 вопросов должны содержать code. Каждый вопрос имеет четыре уникальных варианта, один правильный вариант и короткое объяснение.",
        "Распредели правильные варианты по разным позициям и проверяй понимание причин, а не запоминание формулировок.",
        "Если тема выигрывает от визуализации процесса или потока данных, добавь 1–2 содержательные диаграммы; иначе верни diagrams: [].",
        "В диаграмме используй уникальные id узлов, связывай рёбра только с существующими id и размещай узлы без наложений в сетке row/column от 0 до 4.",
        "Источники переданы только как ориентиры; не добавляй ссылки и не утверждай, что цитируешь их.",
      ].join("\n\n"),
      JSON.stringify({ profile, lesson: item, sources: sourceContext }),
      22_000,
      onDelta,
      signal,
    );
    try {
      return normalizeGeneratedLesson(result);
    } catch (error) {
      this.logNormalizationError("frontend_interview_lesson", error);
      throw new BadGatewayException("OpenAI вернул неполный урок. Попробуй ещё раз.");
    }
  }

  /**
   * Генерирует урок для блока статического трека. Специфика трека приходит
   * из его определения в реестре, поэтому новый трек не требует правок здесь.
   */
  async generateTrackLesson(
    prompt: TrackLessonPrompt,
    day: StudyDay,
    block: StudyBlock,
    resources: LearningResource[],
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const sourceContext = resources.map((resource) => ({
      title: resource.title,
      provider: resource.provider,
      description: resource.description,
      learningGoal: resource.learningGoal ?? "",
    }));
    const result = await this.request<unknown>(
      prompt.name,
      lessonSchema,
      [
        prompt.role,
        prompt.program,
        LESSON_CLARITY_INSTRUCTIONS,
        "Материал должен помогать на секциях платформы, решения задач и работы с AI: объясняй причинно-следственные связи и формулировки для ответа вслух.",
        "Для алгоритмического блока обязательно разбери подходы, структуры данных и Big-O, но не выдавай готовое решение переданной задачи.",
        block.exercise
          ? "Примеры кода должны иллюстрировать отдельные идеи и не должны целиком решать переданное упражнение. Сохрани исходные ограничения упражнения и добавь практику без готового решения."
          : "Примеры кода должны иллюстрировать отдельные идеи. Составь практическую задачу по теме блока и не выдавай её готовое решение.",
        "Для практики обязательно верни запускаемый runner: starterCode без решения, 3–6 публичных testCases, 3–6 дополнительных hiddenTestCases с пограничными случаями и полное referenceSolution для внутренней проверки.",
        "Каждый testCases.expression должен синхронно вызывать код задачи, а expected должен быть строкой с валидным JSON ожидаемого результата. Используй только обычный JavaScript без TypeScript-синтаксиса, import, require, async, Promise, DOM, fetch, таймеров, eval, Function, Date и случайности.",
        "После урока добавь ровно 20 проверочных вопросов: 10 tier=core и 10 tier=deep. Распределение capability строго: 2 recall, 4 comprehension, 4 prediction, 3 debugging, 3 application, 2 transfer, 2 tradeoff. Минимум 8 вопросов должны содержать code. Каждый вопрос имеет четыре уникальных варианта, один правильный вариант и объяснение.",
        "Вопросы должны проверять материал текущего блока и быть полезными для собеседования.",
        "Если тема выигрывает от визуализации процесса или потока данных, добавь 1–2 содержательные диаграммы; иначе верни diagrams: [].",
        "В диаграмме используй уникальные id узлов, связывай рёбра только с существующими id и размещай узлы без наложений в сетке row/column от 0 до 4.",
        "Источники используй только как ориентиры: не добавляй новые ссылки и не утверждай, что цитируешь их.",
        prompt.note,
      ].join("\n\n"),
      JSON.stringify({
        targetCompany: prompt.targetCompany,
        day: { number: day.dayNumber, title: day.title },
        block,
        sources: sourceContext,
      }),
      22_000,
      onDelta,
      signal,
    );
    try {
      return normalizeGeneratedLesson(result);
    } catch (error) {
      this.logNormalizationError(prompt.name, error);
      throw new BadGatewayException("OpenAI вернул неполный разбор темы. Попробуй ещё раз.");
    }
  }

  async reviewGeneratedLesson(
    context: {
      track: string;
      title: string;
      objective: string;
    },
    lesson: GeneratedLesson,
    signal?: AbortSignal,
  ) {
    const result = await this.request<unknown>(
      "frontend_interview_lesson_review",
      lessonReviewSchema,
      LESSON_REVIEW_INSTRUCTIONS,
      JSON.stringify({ context, lesson }),
      24_000,
      undefined,
      signal,
      this.reviewModel,
    );
    try {
      return normalizeGeneratedLessonReview(result);
    } catch (error) {
      this.logNormalizationError("frontend_interview_lesson_review", error);
      throw new BadGatewayException(
        "Terra вернула некорректный результат проверки. Предыдущий урок сохранён.",
      );
    }
  }

  async generateChatReply(
    lessonContext: string,
    history: AiChatHistoryMessage[],
    content: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
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
      signal,
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
    } catch (error) {
      this.logNormalizationError("frontend_mock_interview_evaluation", error);
      throw new BadGatewayException("OpenAI вернул неполную оценку интервью. Попробуй ещё раз.");
    }
  }

  async generateInterviewFollowUp(input: {
    company: string;
    question: string;
    answer: string;
  }) {
    const result = await this.request<unknown>(
      "interview_follow_up",
      interviewFollowUpSchema,
      [
        "Ты технический интервьюер frontend Middle+/Senior.",
        "Задай один короткий уточняющий вопрос по ответу кандидата.",
        "Проверь глубину понимания, практический опыт или осознанный компромисс.",
        "Не подсказывай правильный ответ и пиши по-русски.",
      ].join(" "),
      JSON.stringify(input),
      500,
    );
    return normalizeInterviewFollowUp(result);
  }

  async generateInterviewAssistantReply(
    context: string,
    history: AiChatHistoryMessage[],
    content: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.requestText(
      [
        "Ты AI-помощник кандидата на экспериментальной секции frontend-интервью.",
        "Помогай решать задачу, но не скрывай предположения и не выдавай непроверенный код за рабочий.",
        "Отвечай кратко по-русски: предложи подход, проверку или небольшой фрагмент.",
        "Интервьюер позже спросит кандидата, почему он принял каждое решение.",
        `\n\nЗадача и текущий код:\n${context}`,
      ].join(" "),
      [...history, { role: "user", content }],
      2_000,
      onDelta,
      signal,
    );
  }

  async generateInterviewDefenseQuestions(input: {
    task: string;
    solution: string;
    messages: AiChatHistoryMessage[];
  }) {
    const result = await this.request<unknown>(
      "interview_defense_questions",
      interviewDefenseSchema,
      [
        "Ты технический интервьюер frontend Middle+/Senior.",
        "Верни ровно два вопроса для защиты решения, созданного с AI.",
        "Один вопрос должен проверять понимание кода, второй — проверку и границы совета AI.",
        "Пиши по-русски и не давай ответов.",
      ].join(" "),
      JSON.stringify(input),
      700,
    );
    return normalizeInterviewDefenseQuestions(result);
  }

  async evaluateInterviewSession(input: Record<string, unknown>) {
    const result = await this.request<unknown>(
      "interview_session_evaluation",
      interviewEvaluationSchema,
      [
        "Ты оцениваешь полное frontend-интервью Middle+/Senior.",
        "Оцени платформенные ответы, использование AI и ясность защиты отдельно по шкале 0–100.",
        "Учитывай follow-up ответы, фактические результаты тестов кода и способность проверить совет AI.",
        "Не завышай оценки за общие слова. Дай конкретные сильные стороны, слабые темы и следующие шаги.",
        "Пиши кратко и конструктивно по-русски.",
      ].join(" "),
      JSON.stringify(input),
      4_000,
    );
    return normalizeInterviewEvaluation(result);
  }

  private async request<T>(
    schemaName: string,
    schema: Record<string, unknown>,
    instructions: string,
    input: string,
    maxOutputTokens: number,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
    model = this.model,
  ) {
    const payload = {
      model,
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
      ? await this.performStreamingRequest(payload, onDelta, schemaName, signal)
      : extractResponseText(await this.performRequest(payload, schemaName, signal));

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      this.logNormalizationError(schemaName, error);
      throw new BadGatewayException("OpenAI вернул ответ в неожиданном формате.");
    }
  }

  private async requestText(
    instructions: string,
    input: AiChatHistoryMessage[],
    maxOutputTokens: number,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
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
          ? await this.performStreamingRequest(payload, onDelta, "chat_reply", signal)
          : extractResponseText(await this.performRequest(payload, "chat_reply", signal))
      ).trim();
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      this.logNormalizationError("chat_reply", error);
      throw new BadGatewayException("OpenAI вернул пустой ответ. Попробуй ещё раз.");
    }
  }

  private async performStreamingRequest(
    payload: Record<string, unknown>,
    onDelta: AiDeltaHandler,
    operation: string,
    externalSignal?: AbortSignal,
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI-генерация не настроена. Добавь OPENAI_API_KEY в переменные сервера.",
      );
    }
    const abortContext = createOpenAiAbortContext(externalSignal);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: abortContext.signal,
      });
      if (!response.ok) {
        const errorBody = await this.readOpenAiErrorBody(response);
        this.logOpenAiHttpError(
          operation,
          response.status,
          true,
          errorBody,
          response.headers.get("x-request-id"),
        );
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
        // Любой байт от OpenAI означает, что генерация идёт: продлеваем окно,
        // иначе длинный, но живой поток обрывается на общем дедлайне.
        abortContext.keepAlive();
        handleEvents(parser.push(decoder.decode(value, { stream: true })));
      }
      handleEvents(parser.push(decoder.decode()));
      handleEvents(parser.finish());
      if (!output.trim()) throw new BadGatewayException("OpenAI вернул пустой поток.");
      return output;
    } catch (error) {
      if (externalSignal?.aborted) {
        this.logger.debug({ event: "openai_request_cancelled", operation, streaming: true });
        throw error;
      }
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      if (abortContext.timedOut() || isAbortError(error)) {
        this.logOpenAiTimeout(operation, true);
        throw new BadGatewayException(
          "OpenAI замолчал на 90 секунд и поток оборвался. Попробуй ещё раз.",
        );
      }
      this.logOpenAiUnexpectedError(operation, error, true);
      throw new BadGatewayException("Не удалось прочитать поток OpenAI.");
    } finally {
      abortContext.dispose();
    }
  }

  private async performRequest(
    payload: Record<string, unknown>,
    operation: string,
    externalSignal?: AbortSignal,
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI-генерация не настроена. Добавь OPENAI_API_KEY в переменные сервера.",
      );
    }

    const abortContext = createOpenAiAbortContext(externalSignal);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: abortContext.signal,
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        this.logOpenAiHttpError(
          operation,
          response.status,
          false,
          body,
          response.headers.get("x-request-id"),
        );
        throw new BadGatewayException(
          `OpenAI не смог сгенерировать материал (HTTP ${response.status}).`,
        );
      }

      return body;
    } catch (error) {
      if (externalSignal?.aborted) {
        this.logger.debug({ event: "openai_request_cancelled", operation, streaming: false });
        throw error;
      }
      if (error instanceof ServiceUnavailableException || error instanceof BadGatewayException) {
        throw error;
      }
      if (abortContext.timedOut() || isAbortError(error)) {
        this.logOpenAiTimeout(operation, false);
        throw new BadGatewayException("OpenAI не ответил за 90 секунд. Попробуй ещё раз.");
      }
      this.logOpenAiUnexpectedError(operation, error, false);
      throw new BadGatewayException("Не удалось получить корректный ответ от OpenAI.");
    } finally {
      abortContext.dispose();
    }
  }

  private logNormalizationError(operation: string, error: unknown) {
    this.logger.warn({
      event: "openai_response_normalization_failed",
      operation,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }

  private async readOpenAiErrorBody(response: Response) {
    const text = await response.text().catch(() => "");
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private logOpenAiHttpError(
    operation: string,
    status: number,
    streaming: boolean,
    body: unknown,
    requestId: string | null,
  ) {
    const details = this.normalizeOpenAiErrorDetails(body);
    this.logger.warn({
      event: "openai_http_error",
      operation,
      status,
      streaming,
      ...(requestId ? { openAiRequestId: requestId.slice(0, 200) } : {}),
      ...details,
    });
  }

  private normalizeOpenAiErrorDetails(body: unknown) {
    const source =
      typeof body === "object" && body !== null && "error" in body
        ? (body as { error?: unknown }).error
        : body;
    if (typeof source === "string") {
      return { openAiMessage: source.trim().slice(0, 1_000) };
    }
    if (typeof source !== "object" || source === null) return {};
    const error = source as Record<string, unknown>;
    const field = (name: string, limit = 300) =>
      typeof error[name] === "string" && error[name].trim()
        ? error[name].trim().slice(0, limit)
        : undefined;
    return {
      ...(field("message", 1_000) ? { openAiMessage: field("message", 1_000) } : {}),
      ...(field("type") ? { openAiErrorType: field("type") } : {}),
      ...(field("code") ? { openAiErrorCode: field("code") } : {}),
      ...(field("param") ? { openAiErrorParam: field("param") } : {}),
    };
  }

  private logOpenAiTimeout(operation: string, streaming: boolean) {
    this.logger.warn({ event: "openai_request_timeout", operation, streaming });
  }

  private logOpenAiUnexpectedError(
    operation: string,
    error: unknown,
    streaming: boolean,
  ) {
    this.logger.error({
      event: "openai_request_failed",
      operation,
      streaming,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
