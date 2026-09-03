import { Injectable, NotFoundException } from "@nestjs/common";
import { companyProfileV1Schema, type CompanyProfileV1 } from "@prep/contracts";

const REVIEWED_AT = "2026-09-03T00:00:00.000Z";
const official = (label: string, url: string) => ({ label, url, kind: "official" as const, reviewedAt: REVIEWED_AT });
const curated = (label: string) => ({ label, url: null, kind: "curated" as const, reviewedAt: REVIEWED_AT });

const profiles: CompanyProfileV1[] = [
  {
    companyId: "general", label: "Российский бигтех", summary: "Универсальный профиль для frontend-интервью Middle+/Senior.",
    focusAreas: ["JavaScript и браузер", "React и TypeScript", "Live coding", "Архитектура и защита решений"],
    interviewStages: ["Платформа", "Live coding", "Архитектура", "Коммуникация"], confidence: "high",
    sources: [curated("Обобщённый профиль по программе Frontend Sprint")], version: "1.0.0",
  },
  {
    companyId: "yandex", label: "Яндекс", summary: "Усиленный профиль по платформе JavaScript и алгоритмическим задачам.",
    focusAreas: ["JavaScript platform", "Алгоритмы", "Браузер", "Разбор сложности"],
    interviewStages: ["Фронтенд-платформа", "Решение задач", "AI-секция"], confidence: "high",
    sources: [official("Как проходят frontend-интервью", "https://yandex.ru/jobs/interview/frontend")], version: "1.0.0",
  },
  {
    companyId: "ozon", label: "Ozon", summary: "Профиль с акцентом на React, JavaScript, архитектуру и практическое решение задач.",
    focusAreas: ["React", "JavaScript", "TypeScript", "Архитектура", "Алгоритмы"],
    interviewStages: ["Техническая секция", "Live coding", "Архитектура"], confidence: "medium",
    sources: [curated("Материалы Ozon-интервью, добавленные владельцем приложения")], version: "1.0.0",
  },
  {
    companyId: "avito", label: "Avito", summary: "Практический frontend-профиль с упором на продуктовый код и системное проектирование.",
    focusAreas: ["JavaScript", "React", "Frontend system design", "Производительность"],
    interviewStages: ["Техническое интервью", "Live coding", "System design"], confidence: "medium",
    sources: [curated("Стартовый профиль — требует уточнения по конкретной вакансии")], version: "1.0.0",
  },
  {
    companyId: "tbank", label: "Т-Банк", summary: "Frontend-профиль для продуктовой разработки и аргументации инженерных решений.",
    focusAreas: ["JavaScript", "React", "TypeScript", "Архитектура", "Тестирование"],
    interviewStages: ["Техническая секция", "Код", "Архитектурная секция"], confidence: "medium",
    sources: [curated("Стартовый профиль — требует уточнения по конкретной вакансии")], version: "1.0.0",
  },
  {
    companyId: "mts", label: "МТС / МГТС", summary: "Профиль real-time интерфейсов по требованиям предоставленной frontend-вакансии.",
    focusAreas: ["React Hooks", "WebSocket и reconnect", "REST", "Рендеринг", "HTML/CSS/SCSS"],
    interviewStages: ["React и JavaScript", "Сети и WebSocket", "Практическая разработка"], confidence: "high",
    sources: [{ label: "Вакансия МГТС Frontend Developer", url: null, kind: "vacancy", reviewedAt: REVIEWED_AT }], version: "1.0.0",
  },
  {
    companyId: "2gis", label: "2ГИС", summary: "Стартовый профиль продуктового frontend-интервью с задачами на браузер и интерфейсы.",
    focusAreas: ["JavaScript", "React", "Браузер", "Производительность", "Архитектура UI"],
    interviewStages: ["Техническое интервью", "Практическая задача", "Обсуждение решений"], confidence: "low",
    sources: [curated("Стартовый профиль — требует подтверждения официальными источниками")], version: "1.0.0",
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
