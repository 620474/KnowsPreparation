import { describe, expect, it } from "vitest";

import type { CareerActivity, CareerApplication } from "../../types";
import {
  getCareerAnalytics,
  getDueCareerApplications,
  getUpcomingCareerInterviews,
  getWeeklyCareerActivity,
} from "./career";

const application = (patch: Partial<CareerApplication> = {}): CareerApplication => ({
  applicationId: "application-1",
  company: "Company",
  role: "Frontend Engineer",
  url: "",
  source: "",
  description: "",
  priority: "high",
  stage: "applied",
  fitScore: 90,
  salary: "",
  workFormat: "",
  level: "Middle+",
  stack: ["React"],
  recruiterName: "",
  recruiterContact: "",
  hiringManagerName: "",
  hiringManagerContact: "",
  publishedAt: null,
  appliedAt: "2026-09-01",
  followUpAt: "2026-09-01",
  nextAction: "Follow-up",
  rejectionReason: "",
  notes: "",
  interviews: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...patch,
});

describe("career analytics", () => {
  it("counts weekly actions by KPI type", () => {
    const activities: CareerActivity[] = [
      { activityId: "1", applicationId: null, type: "application", occurredAt: "2026-09-01T10:00:00.000Z", note: "", createdAt: "2026-09-01T10:00:00.000Z" },
      { activityId: "2", applicationId: null, type: "outreach", occurredAt: "2026-09-02T10:00:00.000Z", note: "", createdAt: "2026-09-02T10:00:00.000Z" },
      { activityId: "3", applicationId: null, type: "application", occurredAt: "2026-08-20T10:00:00.000Z", note: "", createdAt: "2026-08-20T10:00:00.000Z" },
    ];
    expect(getWeeklyCareerActivity(activities, new Date("2026-09-03T12:00:00.000Z")))
      .toEqual({ applications: 1, outreach: 1, referrals: 0, interviews: 0 });
  });

  it("finds due follow-ups and upcoming interviews", () => {
    const planned = application({
      interviews: [{
        interviewId: "interview-1",
        type: "technical",
        status: "planned",
        scheduledAt: "2026-09-05T12:00:00.000Z",
        format: "Zoom",
        participants: "",
        questions: [],
        notes: "",
        outcome: "",
        nextAction: "",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
    });
    const now = new Date("2026-09-03T10:00:00.000Z");
    expect(getDueCareerApplications([planned], now)).toHaveLength(1);
    expect(getUpcomingCareerInterviews([planned], now)).toHaveLength(1);
  });

  it("calculates interview and offer conversion", () => {
    const applications = [
      application({ interviews: [{
        interviewId: "interview-1",
        type: "technical",
        status: "completed",
        scheduledAt: "2026-09-02T10:00:00.000Z",
        format: "",
        participants: "",
        questions: [],
        notes: "",
        outcome: "",
        nextAction: "",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
      }] }),
      application({ applicationId: "application-2", stage: "offer" }),
    ];
    expect(getCareerAnalytics(applications)).toMatchObject({
      applied: 2,
      withInterviews: 1,
      offers: 1,
      interviewConversion: 50,
      offerConversion: 50,
    });
  });
});
