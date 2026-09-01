import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  createCareerApplicationSchema,
  createCareerActivitySchema,
  createCareerInterviewSchema,
  updateCareerApplicationSchema,
  updateCareerInterviewSchema,
  updateCareerSettingsSchema,
  type CareerApplication,
  type CareerActivity,
  type CareerInterview,
  type CareerSettings,
  type CreateCareerApplication,
  type CreateCareerActivity,
  type CreateCareerInterview,
  type UpdateCareerApplication,
  type UpdateCareerInterview,
  type UpdateCareerSettings,
} from "@prep/contracts";
import type { Model } from "mongoose";
import type { ZodType } from "zod";

import { AiAgentService } from "../agents/ai-agent.service";
import { CareerApplicationEntry } from "./schemas/career-application.schema";
import { CareerActivityEntry } from "./schemas/career-activity.schema";
import { CareerSettingsEntry } from "./schemas/career-settings.schema";

const parsePayload = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((issue) => issue.message).join(", "));
  }
  return result.data;
};

const serializeInterview = (interview: CareerInterview): CareerInterview => ({
  ...interview,
});

const serializeApplication = (entry: CareerApplicationEntry): CareerApplication => ({
  applicationId: entry.applicationId,
  company: entry.company,
  role: entry.role,
  url: entry.url,
  source: entry.source,
  description: entry.description ?? "",
  priority: entry.priority,
  stage: entry.stage,
  fitScore: entry.fitScore,
  salary: entry.salary,
  workFormat: entry.workFormat,
  level: entry.level,
  stack: entry.stack,
  recruiterName: entry.recruiterName,
  recruiterContact: entry.recruiterContact,
  hiringManagerName: entry.hiringManagerName,
  hiringManagerContact: entry.hiringManagerContact,
  publishedAt: entry.publishedAt,
  appliedAt: entry.appliedAt,
  followUpAt: entry.followUpAt,
  nextAction: entry.nextAction,
  rejectionReason: entry.rejectionReason,
  notes: entry.notes,
  analysis: entry.analysis ?? null,
  interviews: entry.interviews.map(serializeInterview),
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

const serializeActivity = (entry: CareerActivityEntry): CareerActivity => ({
  activityId: entry.activityId,
  applicationId: entry.applicationId,
  type: entry.type,
  occurredAt: entry.occurredAt,
  note: entry.note,
  createdAt: entry.createdAt.toISOString(),
});

@Injectable()
export class CareerService {
  constructor(
    @InjectModel(CareerActivityEntry.name)
    private readonly activityModel: Model<CareerActivityEntry>,
    @InjectModel(CareerApplicationEntry.name)
    private readonly applicationModel: Model<CareerApplicationEntry>,
    @InjectModel(CareerSettingsEntry.name)
    private readonly settingsModel: Model<CareerSettingsEntry>,
    private readonly agents: AiAgentService,
  ) {}

  async getWorkspace() {
    const [applications, activities, settings] = await Promise.all([
      this.applicationModel.find().sort({ updatedAt: -1 }).exec(),
      this.activityModel.find().sort({ occurredAt: -1 }).limit(500).exec(),
      this.getOrCreateSettings(),
    ]);
    return {
      applications: applications.map(serializeApplication),
      activities: activities.map(serializeActivity),
      settings: this.serializeSettings(settings),
    };
  }

  async createApplication(value: unknown) {
    const input = parsePayload<CreateCareerApplication>(
      createCareerApplicationSchema,
      value,
    );
    const entry = await this.applicationModel.create({
      ...input,
      applicationId: randomUUID(),
      interviews: [],
    });
    return serializeApplication(entry);
  }

  async updateApplication(applicationId: string, value: unknown) {
    const patch = parsePayload<UpdateCareerApplication>(
      updateCareerApplicationSchema,
      value,
    );
    const entry = await this.applicationModel.findOneAndUpdate(
      { applicationId },
      { $set: patch },
      { returnDocument: "after", runValidators: true },
    ).exec();
    if (!entry) throw new NotFoundException("Вакансия не найдена");
    return serializeApplication(entry);
  }

  async deleteApplication(applicationId: string) {
    const entry = await this.applicationModel.findOneAndDelete({ applicationId }).exec();
    if (!entry) throw new NotFoundException("Вакансия не найдена");
    await this.activityModel.deleteMany({ applicationId }).exec();
    return { deleted: true };
  }

  async analyzeApplication(applicationId: string) {
    const entry = await this.requireApplication(applicationId);
    if (!entry.description.trim()) {
      throw new BadRequestException("Сначала добавь текст вакансии");
    }
    const settings = await this.getOrCreateSettings();
    const analysis = await this.agents.analyzeVacancy({
      company: entry.company,
      role: entry.role,
      description: entry.description,
      stack: entry.stack,
      candidateProfile: settings.candidateProfile ?? "",
    });
    entry.analysis = {
      ...analysis,
      model: this.agents.model,
      analyzedAt: new Date().toISOString(),
    };
    entry.fitScore = analysis.fitScore;
    await entry.save();
    return serializeApplication(entry);
  }

  async createInterview(applicationId: string, value: unknown) {
    const input = parsePayload<CreateCareerInterview>(
      createCareerInterviewSchema,
      value,
    );
    const now = new Date().toISOString();
    const interview: CareerInterview = {
      ...input,
      interviewId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const entry = await this.applicationModel.findOneAndUpdate(
      { applicationId },
      { $push: { interviews: interview } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    if (!entry) throw new NotFoundException("Вакансия не найдена");
    return serializeApplication(entry);
  }

  async updateInterview(applicationId: string, interviewId: string, value: unknown) {
    const patch = parsePayload<UpdateCareerInterview>(
      updateCareerInterviewSchema,
      value,
    );
    const entry = await this.requireApplication(applicationId);
    const interview = entry.interviews.find((item) => item.interviewId === interviewId);
    if (!interview) throw new NotFoundException("Собеседование не найдено");
    entry.interviews = entry.interviews.map((item) =>
      item.interviewId === interviewId
        ? { ...item, ...patch, updatedAt: new Date().toISOString() }
        : item,
    );
    await entry.save();
    return serializeApplication(entry);
  }

  async deleteInterview(applicationId: string, interviewId: string) {
    const entry = await this.requireApplication(applicationId);
    const nextInterviews = entry.interviews.filter(
      (item) => item.interviewId !== interviewId,
    );
    if (nextInterviews.length === entry.interviews.length) {
      throw new NotFoundException("Собеседование не найдено");
    }
    entry.interviews = nextInterviews;
    await entry.save();
    return serializeApplication(entry);
  }

  async updateSettings(value: unknown) {
    const patch = parsePayload<UpdateCareerSettings>(
      updateCareerSettingsSchema,
      value,
    );
    const entry = await this.settingsModel.findOneAndUpdate(
      { key: "main" },
      { $set: patch, $setOnInsert: { key: "main" } },
      { returnDocument: "after", upsert: true, runValidators: true },
    ).exec();
    return this.serializeSettings(entry);
  }

  async createActivity(value: unknown) {
    const input = parsePayload<CreateCareerActivity>(createCareerActivitySchema, value);
    if (input.applicationId) await this.requireApplication(input.applicationId);
    const entry = await this.activityModel.create({
      ...input,
      activityId: randomUUID(),
    });
    return serializeActivity(entry);
  }

  async deleteActivity(activityId: string) {
    const entry = await this.activityModel.findOneAndDelete({ activityId }).exec();
    if (!entry) throw new NotFoundException("Действие не найдено");
    return { deleted: true };
  }

  private async requireApplication(applicationId: string) {
    const entry = await this.applicationModel.findOne({ applicationId }).exec();
    if (!entry) throw new NotFoundException("Вакансия не найдена");
    return entry;
  }

  private getOrCreateSettings() {
    return this.settingsModel.findOneAndUpdate(
      { key: "main" },
      { $setOnInsert: { key: "main" } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  private serializeSettings(entry: CareerSettingsEntry): CareerSettings {
    return {
      searchMode: entry.searchMode,
      weeklyGoals: entry.weeklyGoals,
      strategyNotes: entry.strategyNotes,
      candidateProfile: entry.candidateProfile ?? "",
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
