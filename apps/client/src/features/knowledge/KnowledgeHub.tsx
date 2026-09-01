import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Code2,
  LibraryBig,
  RefreshCw,
} from "lucide-react";

import type { BootstrapData } from "../../types";

interface KnowledgeHubProps {
  data: BootstrapData;
  onOpenAiCourse: () => void;
  onOpenAlgorithms: () => void;
  onOpenAnalytics: () => void;
  onOpenQuestions: () => void;
  onOpenResources: () => void;
  onOpenReview: () => void;
}

export function KnowledgeHub({
  data,
  onOpenAiCourse,
  onOpenAlgorithms,
  onOpenAnalytics,
  onOpenQuestions,
  onOpenResources,
  onOpenReview,
}: KnowledgeHubProps) {
  const mastered = Object.values(data.progress.questions).filter(
    (item) => item.status === "mastered",
  ).length;

  const cards = [
    {
      title: "Банк вопросов",
      description: `${data.questions.length} вопросов по JavaScript, React, браузеру и архитектуре.`,
      icon: BookOpenCheck,
      action: onOpenQuestions,
    },
    {
      title: "Повторение",
      description: "Интервальные карточки на сегодня и закрепление слабых тем.",
      icon: RefreshCw,
      action: onOpenReview,
    },
    {
      title: "Алгоритмы",
      description: "Паттерны, решения и IDE-песочница с тестами.",
      icon: Code2,
      action: onOpenAlgorithms,
    },
    {
      title: "Библиотека",
      description: `${data.resources.length} точечных материалов и справочников.`,
      icon: LibraryBig,
      action: onOpenResources,
    },
    {
      title: "AI-курс",
      description: "Персональные уроки, квизы, практика и контекстный чат.",
      icon: BrainCircuit,
      action: onOpenAiCourse,
    },
    {
      title: "Аналитика",
      description: `Освоено ${mastered} вопросов. Найди темы, которые тормозят прогресс.`,
      icon: BarChart3,
      action: onOpenAnalytics,
    },
  ];

  return (
    <div className="page-stack section-hub knowledge-hub">
      <header className="page-header section-hub-header">
        <div>
          <p className="eyebrow">Личная база знаний</p>
          <h1>Учить, применять, повторять</h1>
          <p>Материалы собраны по назначению, а не спрятаны среди настроек.</p>
        </div>
        <div className="header-stat">
          <BookOpenCheck size={20} />
          <strong>{mastered}</strong>
          <span>тем освоено</span>
        </div>
      </header>

      <section className="knowledge-card-grid">
        {cards.map(({ title, description, icon: Icon, action }) => (
          <button key={title} type="button" onClick={action}>
            <span className="section-hub-icon"><Icon /></span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight />
          </button>
        ))}
      </section>
    </div>
  );
}
