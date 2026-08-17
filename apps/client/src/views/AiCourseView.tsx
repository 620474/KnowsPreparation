import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  NumberInput,
  Select,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  BookOpenText,
  CircleAlert,
  Clock3,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import type {
  AiCourseProfile,
  AiLessonQuestionContext,
  AiLevel,
  BootstrapData,
} from "../types";

interface AiCourseViewProps {
  data: BootstrapData;
  generatingCourse: boolean;
  generatingLessonId: string | null;
  generationCharacters: number;
  onGenerateCourse: (profile: AiCourseProfile) => void;
  onGenerateLesson: (itemId: string) => void;
  onOpenLesson: (itemId: string) => void;
  onOpenChat: (itemId: string, context?: AiLessonQuestionContext) => void;
}

const levelOptions = [
  { value: "middle", label: "Middle" },
  { value: "middle-plus", label: "Middle+" },
  { value: "senior", label: "Senior" },
];

const defaultDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return date.toISOString().slice(0, 10);
};

const splitList = (value: string) =>
  value
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatGeneratedAt = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function AiCourseView({
  data,
  generatingCourse,
  generatingLessonId,
  generationCharacters,
  onGenerateCourse,
  onGenerateLesson,
  onOpenLesson,
  onOpenChat,
}: AiCourseViewProps) {
  const course = data.ai.course;
  const [goal, setGoal] = useState(
    course?.goal ?? "Подготовиться к frontend-собеседованиям в российский бигтех",
  );
  const [level, setLevel] = useState<AiLevel>(course?.level ?? "middle-plus");
  const [deadline, setDeadline] = useState(course?.deadline ?? defaultDeadline());
  const [dailyMinutes, setDailyMinutes] = useState(course?.dailyMinutes ?? 120);
  const [targetCompanies, setTargetCompanies] = useState(
    course?.targetCompanies.join(", ") ?? "Яндекс, Авито",
  );
  const [weakTopics, setWeakTopics] = useState(course?.weakTopics.join("\n") ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGenerateCourse({
      goal: goal.trim(),
      level,
      deadline,
      dailyMinutes,
      targetCompanies: splitList(targetCompanies),
      weakTopics: splitList(weakTopics),
    });
  };

  const courseForm = (
    <form className="ai-course-form" onSubmit={submit}>
      <TextInput
        label="Цель"
        minLength={10}
        maxLength={500}
        required
        value={goal}
        onChange={(event) => setGoal(event.currentTarget.value)}
      />
      <div className="ai-course-form-row">
        <Select
          label="Текущий уровень"
          data={levelOptions}
          value={level}
          allowDeselect={false}
          onChange={(value) => setLevel((value as AiLevel | null) ?? "middle-plus")}
        />
        <TextInput
          label="Дедлайн"
          type="date"
          required
          value={deadline}
          onChange={(event) => setDeadline(event.currentTarget.value)}
        />
        <NumberInput
          label="Минут в день"
          min={30}
          max={240}
          step={10}
          value={dailyMinutes}
          onChange={(value) => setDailyMinutes(typeof value === "number" ? value : 120)}
        />
      </div>
      <TextInput
        label="Целевые компании"
        description="Через запятую"
        value={targetCompanies}
        onChange={(event) => setTargetCompanies(event.currentTarget.value)}
      />
      <Textarea
        label="Слабые темы"
        description="По одной теме на строку или через запятую"
        minRows={3}
        maxLength={1_500}
        value={weakTopics}
        onChange={(event) => setWeakTopics(event.currentTarget.value)}
      />
      <Button
        className="primary-button"
        type="submit"
        leftSection={course ? <RefreshCw size={18} /> : <Sparkles size={18} />}
        loading={generatingCourse}
        disabled={!data.ai.enabled}
      >
        {course ? "Перестроить курс" : "Создать AI-курс"}
      </Button>
    </form>
  );

  return (
    <div className="page-stack">
      <header className="page-header ai-course-header">
        <div>
          <p className="eyebrow">Персональный преподаватель</p>
          <h1>AI-курс</h1>
          <p>
            AI составляет маршрут и пишет уроки под твою цель. Проверенные статьи остаются
            дополнительными источниками.
          </p>
        </div>
        <div className="header-stat accent">
          <Sparkles size={20} />
          <strong>{course?.items.length ?? "AI"}</strong>
          <span>{course ? "тем в курсе" : "по запросу"}</span>
        </div>
      </header>

      {!data.ai.enabled ? (
        <Alert color="orange" icon={<CircleAlert size={18} />} variant="light">
          Генерация пока выключена. Добавь секрет <code>OPENAI_API_KEY</code> в Runtime
          variables сервиса API на Northflank и перезапусти deployment.
        </Alert>
      ) : null}

      {!course ? (
        <section className="ai-course-setup">
          <div className="ai-course-setup-copy">
            <Target size={28} />
            <h2>Соберём курс под твой срок</h2>
            <p>
              Сначала AI создаст список тем. Полный текст каждого урока генерируется отдельно,
              поэтому не нужно ждать и оплачивать весь курс сразу.
            </p>
          </div>
          {courseForm}
        </section>
      ) : (
        <>
          <section className="ai-course-summary">
            <div>
              <Badge color="teal" variant="light">Версия {course.version}</Badge>
              <h2>{course.title}</h2>
              <p>{course.summary}</p>
            </div>
            <div className="ai-course-meta">
              <span><Clock3 size={16} /> {course.dailyMinutes} минут в день</span>
              <span><Target size={16} /> до {new Date(`${course.deadline}T00:00:00`).toLocaleDateString("ru-RU")}</span>
              <span><Sparkles size={16} /> {formatGeneratedAt(course.generatedAt)}</span>
            </div>
          </section>

          <details className="ai-course-settings">
            <summary>Изменить цель и перестроить курс</summary>
            {courseForm}
          </details>

          <section className="ai-course-list" aria-label="Темы AI-курса">
            {course.items.map((item, index) => {
              const lesson = data.ai.lessons[item.id];
              const isGenerating = generatingLessonId === item.id;
              return (
                <article className={lesson ? "ai-course-item ready" : "ai-course-item"} key={item.id}>
                  <div className="ai-course-item-heading">
                    <div className="ai-course-index">{String(index + 1).padStart(2, "0")}</div>
                    <div>
                      <span>{item.estimatedMinutes} минут</span>
                      <h2>{item.title}</h2>
                      <p>{item.objective}</p>
                    </div>
                    <div className="ai-course-item-actions">
                      <Button
                        className="primary-button"
                        type="button"
                        leftSection={<BookOpenText size={17} />}
                        loading={!lesson && isGenerating}
                        disabled={
                          !lesson &&
                          (!data.ai.enabled || (generatingLessonId !== null && !isGenerating))
                        }
                        onClick={() => lesson ? onOpenLesson(item.id) : onGenerateLesson(item.id)}
                      >
                        {lesson
                          ? "Открыть урок"
                          : isGenerating && generationCharacters > 0
                            ? `Пишу · ${generationCharacters.toLocaleString("ru-RU")} симв.`
                            : "Написать урок"}
                      </Button>
                      <Button
                        className="secondary-button"
                        type="button"
                        variant="default"
                        leftSection={<MessageCircle size={17} />}
                        onClick={() => onOpenChat(item.id)}
                      >
                        Обсудить
                      </Button>
                    </div>
                  </div>

                  <div className="ai-course-sources">
                    <strong>Дополнительные источники</strong>
                    <ResourceLinks resourceIds={item.resourceIds} resources={data.resources} />
                    {item.resourceIds.length === 0 ? (
                      <span>Для этой темы пока нет точного совпадения в каталоге.</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
