import { useMemo, useState } from "react";
import { Anchor, Badge, Select, TextInput } from "@mantine/core";
import { BookOpenText, Clock3, ExternalLink, Languages, Search } from "lucide-react";

import type {
  BootstrapData,
  ResourceKind,
  ResourceLevel,
  ResourcePriority,
  ResourceStatus,
  ResourceTopic,
} from "../types";

interface ResourcesViewProps {
  data: BootstrapData;
}

const kindLabels: Record<ResourceKind, string> = {
  main: "Сначала",
  "deep-dive": "Углубление",
  practice: "Практика",
  reference: "Справочник",
  "case-study": "Кейс бигтеха",
};

const kindColors: Record<ResourceKind, string> = {
  main: "teal",
  "deep-dive": "violet",
  practice: "orange",
  reference: "gray",
  "case-study": "blue",
};

const kindOrder: Record<ResourceKind, number> = {
  main: 0,
  practice: 1,
  "deep-dive": 2,
  "case-study": 3,
  reference: 4,
};

const levelLabels: Record<ResourceLevel, string> = {
  basic: "Базовый",
  beginner: "Базовый",
  intermediate: "Middle+",
  advanced: "Углублённый",
};

const statusLabels: Record<ResourceStatus, string> = {
  current: "Актуальный",
  evergreen: "Evergreen",
  historical: "Исторический",
};

const statusColors: Record<ResourceStatus, string> = {
  current: "teal",
  evergreen: "blue",
  historical: "gray",
};

const priorityLabels: Record<ResourcePriority, string> = {
  must: "Must",
  should: "Should",
  optional: "Optional",
};

const priorityColors: Record<ResourcePriority, string> = {
  must: "red",
  should: "yellow",
  optional: "gray",
};

const priorityOrder: Record<ResourcePriority, number> = {
  must: 0,
  should: 1,
  optional: 2,
};

const formatVerifiedAt = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU");

export function ResourcesView({ data }: ResourcesViewProps) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [language, setLanguage] = useState("all");
  const [kind, setKind] = useState("all");
  const [priority, setPriority] = useState("all");

  const topics = useMemo(
    () => [...new Set(data.resources.flatMap((item) => item.topics))].sort(),
    [data.resources],
  );

  const verifiedAt = useMemo(
    () => data.resources.flatMap((item) => (item.verifiedAt ? [item.verifiedAt] : [])).sort().at(-1),
    [data.resources],
  );

  const weeksByResource = useMemo(() => {
    const index = new Map<string, Set<number>>();
    for (const week of data.curriculum) {
      for (const day of week.days) {
        for (const block of day.blocks) {
          for (const resourceId of block.resourceIds) {
            const weeks = index.get(resourceId) ?? new Set<number>();
            weeks.add(week.number);
            index.set(resourceId, weeks);
          }
        }
      }
    }
    return index;
  }, [data.curriculum]);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    return data.resources
      .filter((item) => topic === "all" || item.topics.includes(topic as ResourceTopic))
      .filter((item) => language === "all" || item.language === language)
      .filter((item) => kind === "all" || item.kind === kind)
      .filter((item) => priority === "all" || item.priority === priority)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [
          item.title,
          item.provider,
          item.description,
          item.learningGoal ?? "",
          item.whySelected ?? "",
          item.practicalTask ?? "",
          ...(item.interviewQuestions ?? []),
          ...(item.tags ?? []),
          ...item.topics,
        ]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftPriority = left.priority ? priorityOrder[left.priority] : 3;
        const rightPriority = right.priority ? priorityOrder[right.priority] : 3;
        const priorityDifference = leftPriority - rightPriority;
        const kindDifference = kindOrder[left.kind] - kindOrder[right.kind];
        return priorityDifference || kindDifference || left.title.localeCompare(right.title, "ru");
      });
  }, [data.resources, kind, language, priority, query, topic]);

  return (
    <div className="page-stack">
      <header className="page-header resources-header">
        <div>
          <p className="eyebrow">Отобрано под учебный план</p>
          <h1>Библиотека источников</h1>
          <p>Официальная документация, понятные разборы, Habr-кейсы бигтеха и практика.</p>
        </div>
        <div className="header-stat">
          <BookOpenText size={20} />
          <strong>{data.resources.length}</strong>
          <span>источников</span>
        </div>
      </header>

      <section className="resource-filter-bar" aria-label="Фильтры библиотеки">
        <TextInput
          aria-label="Поиск источников"
          leftSection={<Search size={17} />}
          placeholder="Тема, статья или автор…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <Select
          aria-label="Фильтр по теме"
          data={[
            { value: "all", label: "Все темы" },
            ...topics.map((item) => ({ value: item, label: item })),
          ]}
          value={topic}
          onChange={(value) => setTopic(value ?? "all")}
          allowDeselect={false}
        />
        <Select
          aria-label="Фильтр по типу источника"
          data={[
            { value: "all", label: "Все типы" },
            ...Object.entries(kindLabels).map(([value, label]) => ({ value, label })),
          ]}
          value={kind}
          onChange={(value) => setKind(value ?? "all")}
          allowDeselect={false}
        />
        <Select
          aria-label="Фильтр по приоритету"
          data={[
            { value: "all", label: "Любой приоритет" },
            ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label })),
          ]}
          value={priority}
          onChange={(value) => setPriority(value ?? "all")}
          allowDeselect={false}
        />
        <Select
          aria-label="Фильтр по языку"
          data={[
            { value: "all", label: "Все языки" },
            { value: "ru", label: "Русский" },
            { value: "en", label: "English" },
          ]}
          value={language}
          onChange={(value) => setLanguage(value ?? "all")}
          allowDeselect={false}
        />
      </section>

      <div className="resource-results">
        <p>{filteredResources.length} из {data.resources.length}</p>
        <span>
          {verifiedAt
            ? `Исследованные материалы проверены ${formatVerifiedAt(verifiedAt)}`
            : "Основные материалы уже привязаны к дням плана."}
        </span>
      </div>

      {filteredResources.length > 0 ? (
        <section className="resource-grid" aria-label="Каталог источников">
          {filteredResources.map((item) => {
            const weeks = [...(weeksByResource.get(item.id) ?? [])].sort((left, right) => left - right);
            return (
              <article className="resource-card" key={item.id}>
                <div className="resource-card-topline">
                  <div className="resource-card-badges">
                    <Badge color={kindColors[item.kind]} variant="light">
                      {kindLabels[item.kind]}
                    </Badge>
                    {item.priority ? (
                      <Badge color={priorityColors[item.priority]} variant="filled">
                        {priorityLabels[item.priority]}
                      </Badge>
                    ) : null}
                    {item.status ? (
                      <Badge color={statusColors[item.status]} variant="outline">
                        {statusLabels[item.status]}
                      </Badge>
                    ) : null}
                  </div>
                  <span>{item.provider}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                {item.learningGoal ? (
                  <div className="resource-goal">
                    <strong>Что получить</strong>
                    <span>{item.learningGoal}</span>
                  </div>
                ) : null}
                {item.whySelected ? (
                  <details className="resource-why">
                    <summary>Почему материал в плане</summary>
                    <p>{item.whySelected}</p>
                  </details>
                ) : null}
                {item.practicalTask ? (
                  <div className="resource-goal">
                    <strong>Практика</strong>
                    <span>{item.practicalTask}</span>
                  </div>
                ) : null}
                {item.interviewQuestions?.length ? (
                  <details className="resource-why">
                    <summary>Вопросы для собеседования ({item.interviewQuestions.length})</summary>
                    <ul>
                      {item.interviewQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <div className="resource-topics">
                  {item.topics.map((itemTopic) => (
                    <Badge color="gray" key={itemTopic} size="sm" variant="outline">
                      {itemTopic}
                    </Badge>
                  ))}
                </div>
                <div className="resource-meta">
                  <span><Languages size={15} /> {item.language.toUpperCase()}</span>
                  <span><Clock3 size={15} /> ≈ {item.estimatedMinutes} мин</span>
                  {item.level ? <span>{levelLabels[item.level]}</span> : null}
                  {item.paywall === false ? <span>Бесплатно</span> : null}
                  {item.paywall ? <span>Платный доступ</span> : null}
                  {item.registrationRequired ? <span>Нужна регистрация</span> : null}
                  {item.publishedYear ? <span>{item.publishedYear}</span> : null}
                  {weeks.length > 0 ? <span>Недели {weeks.join(", ")}</span> : null}
                  {item.verifiedAt ? <span>Проверено {formatVerifiedAt(item.verifiedAt)}</span> : null}
                </div>
                <Anchor
                  className="resource-open"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть источник <ExternalLink size={16} />
                </Anchor>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-card resource-empty">
          <BookOpenText size={28} />
          <h2>Ничего не найдено</h2>
          <p>Измени запрос или сбрось один из фильтров.</p>
        </div>
      )}
    </div>
  );
}
