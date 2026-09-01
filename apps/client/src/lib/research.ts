import type {
  ResearchDesign,
  ResearchProjectStatus,
  ResearchQualityGateKey,
  ResearchQualityGateStatus,
  ResearchStageKey,
  ResearchStageStatus,
} from "../types";

export const RESEARCH_PROJECTS_QUERY_KEY = ["research-projects"] as const;

export const researchStageLabels: Record<ResearchStageKey, string> = {
  decision: "Исследовательское решение",
  scope: "Границы и область",
  questions: "Вопросы и гипотезы",
  protocol: "Протокол и отклонения",
  evidence: "Карта источников",
  data: "Выборка и сбор данных",
  analysis: "План и проведение анализа",
  validation: "Валидация и sensitivity",
  bias: "Риски смещения",
  ethics: "Этика и данные",
  synthesis: "Синтез выводов",
  reporting: "Отчёт и воспроизводимость",
};

export const researchGateLabels: Record<ResearchQualityGateKey, string> = {
  construct_validity: "Измеряется нужный конструкт",
  selection: "Выборка и ограничения понятны",
  alternative_explanations: "Альтернативные объяснения рассмотрены",
  uncertainty: "Неопределённость явно указана",
  robustness: "Вывод устойчив к разумным изменениям",
  negative_evidence: "Противоречащие данные не скрыты",
  traceability: "Выводы связаны с доказательствами",
  reproducibility: "Ключевой путь можно воспроизвести",
  ethics: "Этические ограничения соблюдены",
  applicability: "Область применимости обозначена",
};

export const criticalResearchGates = new Set<ResearchQualityGateKey>([
  "construct_validity",
  "negative_evidence",
  "traceability",
  "ethics",
]);

export const researchDesignOptions: Array<{ value: ResearchDesign; label: string }> = [
  { value: "systematic_review", label: "Систематический обзор" },
  { value: "experiment", label: "Эксперимент" },
  { value: "observational", label: "Наблюдательное" },
  { value: "qualitative", label: "Качественное" },
  { value: "mixed_methods", label: "Смешанные методы" },
  { value: "computational", label: "Вычислительное / IT" },
  { value: "case_study", label: "Кейс-стади" },
  { value: "other", label: "Другое" },
];

export const researchProjectStatusOptions: Array<{
  value: ResearchProjectStatus;
  label: string;
}> = [
  { value: "draft", label: "Черновик" },
  { value: "active", label: "Активно" },
  { value: "paused", label: "На паузе" },
  { value: "completed", label: "Завершено" },
];

export const researchStageStatusOptions: Array<{
  value: ResearchStageStatus;
  label: string;
}> = [
  { value: "pending", label: "Не начато" },
  { value: "in_progress", label: "В работе" },
  { value: "complete", label: "Готово" },
  { value: "blocked", label: "Заблокировано" },
  { value: "not_applicable", label: "Не применимо" },
];

export const researchGateStatusOptions: Array<{
  value: ResearchQualityGateStatus;
  label: string;
}> = [
  { value: "pending", label: "Не проверено" },
  { value: "passed", label: "Пройдено" },
  { value: "blocked", label: "Критическая проблема" },
  { value: "not_applicable", label: "Не применимо" },
];
