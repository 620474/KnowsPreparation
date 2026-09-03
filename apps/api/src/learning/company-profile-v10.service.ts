import { Injectable, NotFoundException } from "@nestjs/common";
import { companyProfileV1Schema, type CompanyProfileV1 } from "@prep/contracts";

const REVIEWED_AT = "2026-09-03T00:00:00.000Z";
const source = (
  label: string,
  url: string | null,
  kind: CompanyProfileV1["sources"][number]["kind"],
  confidence: "low" | "medium" | "high" = "high",
) => ({ label, url, kind, reviewedAt: REVIEWED_AT, confidence });
const official = (label: string, url: string) => source(label, url, "official");
const curated = (label: string) => source(label, null, "curated", "medium");

const profiles: CompanyProfileV1[] = [
  {
    companyId: "general", label: "Российский бигтех", summary: "Универсальный профиль для frontend-интервью Middle+/Senior.",
    focusAreas: ["JavaScript и браузер", "React и TypeScript", "Live coding", "Архитектура и защита решений"],
    interviewStages: ["Платформа", "Live coding", "Архитектура", "Коммуникация"], confidence: "high",
    sources: [curated("Обобщённый профиль по программе Frontend Sprint")], version: "2.0.0",
  },
  {
    companyId: "yandex", label: "Яндекс", summary: "Официальный маршрут с JavaScript-платформой и практическим решением задач; для кандидатов с опытом проектирования добавляются архитектура, разбор frontend-опыта и командные финалы.",
    focusAreas: ["JavaScript platform", "Event Loop и Promise", "Алгоритмы и сложность", "Браузер", "Архитектура", "Защита опыта"],
    interviewStages: ["Фронтенд-платформа", "Базовые технические навыки", "Архитектура — опытный трек", "Разбор frontend-опыта", "1–5 финалов с командами"], confidence: "high",
    sources: [official("Как проходят frontend-интервью", "https://yandex.ru/jobs/interview/frontend")], version: "2.0.0",
  },
  {
    companyId: "ozon", label: "Ozon", summary: "Текущий трек приложения — React-transfer по пользовательским конспектам 2024 года. Общая подготовка по JavaScript, async, браузеру и алгоритмам переносима, но framework-часть не считается официальным актуальным стеком Ozon.",
    focusAreas: ["JavaScript", "Асинхронность", "Браузер и HTML/CSS", "Базовые алгоритмы", "React-transfer", "TypeScript"],
    interviewStages: ["Технический скрининг", "Техническое интервью", "Финальное интервью"], confidence: "medium",
    sources: [
      official("Ozon Tech: подготовка frontend-разработчика", "https://ozon.tech/career/interview-frontend/"),
      curated("Пользовательские конспекты интервью 2024 года — React-transfer"),
    ], version: "2.0.0",
  },
  {
    companyId: "avito", label: "Avito", summary: "Официально описанный инженерный цикл: короткий технический scoring, длительное интервью с Programming и Platform, опциональный Design для более высокого уровня и финал.",
    focusAreas: ["Программирование и сложность", "JavaScript/Web Platform", "Live coding", "Frontend system design", "Production trade-offs"],
    interviewStages: ["Технический scoring — 30 минут", "Programming — код, алгоритмизация и сложность", "Platform — язык и экосистема", "Design — опционально", "Финал с менеджером и рекрутером"], confidence: "high",
    sources: [official("Avito Playbook: как проходит отбор инженеров", "https://github.com/avito-tech/playbook/blob/master/recruitment-and-office.md")], version: "2.0.0",
  },
  {
    companyId: "tbank", label: "Т-Банк", summary: "Официальный frontend-маршрут включает отдельные секции по языку и фреймворку, алгоритмам и архитектуре веб-приложений, после которых проходит знакомство с командами.",
    focusAreas: ["JavaScript и framework", "Live coding", "Алгоритмы и сложность", "Архитектура веб-приложений", "Code defense", "Team matching"],
    interviewStages: ["Предварительное интервью", "Язык и фреймворк", "Алгоритмы — 60 минут", "Архитектура — 60 минут", "Знакомство с командами"], confidence: "high",
    sources: [official("Т-Банк: интервью frontend-разработчика", "https://www.tbank.ru/career/it/interview/javascript/frontend/")], version: "2.0.0",
  },
  {
    companyId: "mts", label: "МТС / МГТС", summary: "React/TypeScript/API-профиль по вакансиям экосистемы. Публичных данных недостаточно для единого company-wide цикла; realtime и microfrontend включаются только при совпадении конкретной вакансии.",
    focusAreas: ["React", "TypeScript", "JavaScript async", "REST и API", "Frontend architecture", "Тестирование", "Realtime — по вакансии"],
    interviewStages: ["Рекрутер или team-specific screening", "Техническая frontend-секция", "Практика и архитектура зависят от продуктовой команды", "Знакомство с командой"], confidence: "low",
    sources: [source("Вакансия МГТС Frontend Developer", null, "vacancy")], version: "2.0.0",
  },
  {
    companyId: "2gis", label: "2ГИС", summary: "Свежие публичные сигналы указывают на browser-first frontend depth, JavaScript, React и практические задачи, но не подтверждают единую последовательность секций для всех команд.",
    focusAreas: ["Browser lifecycle и rendering", "JavaScript и async", "React", "Практический coding/debugging", "Производительность", "Архитектура для опытных кандидатов"],
    interviewStages: ["Рекрутер и команда — формат варьируется", "Техническое frontend-интервью", "Практические задачи", "Обсуждение опыта и команды"], confidence: "medium",
    sources: [source("Публичный разбор frontend-интервью 2ГИС, 2025", "https://www.youtube.com/watch?v=XlvxKT-OfCE", "candidate_report", "medium")], version: "2.0.0",
  },
].map((profile) => companyProfileV1Schema.parse(profile));

@Injectable()
export class CompanyProfileV10Service {
  list() { return profiles; }

  get(companyId: string) {
    const profile = profiles.find((item) => item.companyId === companyId);
    if (!profile) throw new NotFoundException("Профиль компании не найден");
    return profile;
  }
}
