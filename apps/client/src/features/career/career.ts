import type {
  CareerActivity,
  CareerActivityType,
  CareerApplication,
  CareerInterviewType,
  CareerPipelineStage,
  CareerSearchMode,
  CareerWeeklyGoals,
} from "../../types";

export const CAREER_QUERY_KEY = ["career-workspace"] as const;

export const careerStageOrder: CareerPipelineStage[] = [
  "saved",
  "applied",
  "screening",
  "technical",
  "final",
  "offer",
  "rejected",
  "withdrawn",
];

export const careerStageLabels: Record<CareerPipelineStage, string> = {
  saved: "Сохранено",
  applied: "Отклик",
  screening: "HR / скрининг",
  technical: "Техническое",
  final: "Финал",
  offer: "Оффер",
  rejected: "Отказ",
  withdrawn: "Снято",
};

export const careerInterviewTypeLabels: Record<CareerInterviewType, string> = {
  recruiter: "Разговор с рекрутером",
  technical: "Техническое интервью",
  live_coding: "Live coding",
  system_design: "Архитектура",
  final: "Финальное интервью",
  other: "Другой этап",
};

export const careerActivityLabels: Record<CareerActivityType, string> = {
  application: "Качественный отклик",
  outreach: "Прямое сообщение",
  referral: "Запрос рекомендации",
  follow_up: "Follow-up",
  interview: "Собеседование",
  other: "Другое действие",
};

export const searchModeLabels: Record<CareerSearchMode, string> = {
  minimal: "Минимальный · 5 часов",
  working: "Рабочий · 10–12 часов",
  intensive: "Интенсивный · 20 часов",
};

export const searchModeGoals: Record<CareerSearchMode, CareerWeeklyGoals> = {
  minimal: { applications: 4, outreach: 3, referrals: 1, interviews: 1 },
  working: { applications: 8, outreach: 5, referrals: 2, interviews: 2 },
  intensive: { applications: 15, outreach: 10, referrals: 4, interviews: 3 },
};

const startOfWeek = (now: Date) => {
  const date = new Date(now);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isSameWeek = (value: string, now: Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
};

export function getWeeklyCareerActivity(activities: CareerActivity[], now = new Date()) {
  const current = activities.filter((activity) => isSameWeek(activity.occurredAt, now));
  return {
    applications: current.filter((activity) => activity.type === "application").length,
    outreach: current.filter((activity) => activity.type === "outreach").length,
    referrals: current.filter((activity) => activity.type === "referral").length,
    interviews: current.filter((activity) => activity.type === "interview").length,
  };
}

export function getCareerAnalytics(applications: CareerApplication[]) {
  const applied = applications.filter((item) => item.stage !== "saved").length;
  const withInterviews = applications.filter((item) => item.interviews.length > 0).length;
  const offers = applications.filter((item) => item.stage === "offer").length;
  const rejected = applications.filter((item) => item.stage === "rejected").length;
  const active = applications.filter(
    (item) => !["offer", "rejected", "withdrawn"].includes(item.stage),
  ).length;
  return {
    total: applications.length,
    active,
    applied,
    withInterviews,
    offers,
    rejected,
    interviewConversion: applied ? Math.round((withInterviews / applied) * 100) : 0,
    offerConversion: applied ? Math.round((offers / applied) * 100) : 0,
  };
}

export function getDueCareerApplications(applications: CareerApplication[], now = new Date()) {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return applications
    .filter((item) => {
      if (!item.followUpAt || ["offer", "rejected", "withdrawn"].includes(item.stage)) {
        return false;
      }
      const followUp = new Date(`${item.followUpAt}T00:00:00`);
      return !Number.isNaN(followUp.getTime()) && followUp <= endOfToday;
    })
    .sort((left, right) => (left.followUpAt ?? "").localeCompare(right.followUpAt ?? ""));
}

export function getUpcomingCareerInterviews(
  applications: CareerApplication[],
  now = new Date(),
) {
  const end = new Date(now);
  end.setDate(end.getDate() + 14);
  return applications
    .flatMap((application) =>
      application.interviews.map((interview) => ({ application, interview })),
    )
    .filter(({ interview }) => {
      if (interview.status !== "planned" || !interview.scheduledAt) return false;
      const scheduled = new Date(interview.scheduledAt);
      return !Number.isNaN(scheduled.getTime()) && scheduled >= now && scheduled <= end;
    })
    .sort((left, right) =>
      (left.interview.scheduledAt ?? "").localeCompare(right.interview.scheduledAt ?? ""),
    );
}
