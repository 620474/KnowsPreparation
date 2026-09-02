import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  CreateReadinessOutcome,
  CreateReadinessPrediction,
  ReadinessCalibrationSummary,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { MasteryV2Service } from "./mastery/mastery-v2.service";
import { ReadinessOutcomeEntry } from "./schemas/readiness-outcome.schema";
import { ReadinessPredictionEntry } from "./schemas/readiness-prediction.schema";

const calibrationStatus = (count: number) =>
  count >= 8 ? "calibrated" as const : count >= 3 ? "provisional" as const : "uncalibrated" as const;

@Injectable()
export class ReadinessCalibrationService {
  constructor(
    private readonly mastery: MasteryV2Service,
    @InjectModel(ReadinessPredictionEntry.name)
    private readonly predictionModel: Model<ReadinessPredictionEntry>,
    @InjectModel(ReadinessOutcomeEntry.name)
    private readonly outcomeModel: Model<ReadinessOutcomeEntry>,
  ) {}

  async capture(input: CreateReadinessPrediction) {
    const overview = await this.mastery.getOverview(input.targetId);
    const outcomeCount = await this.outcomeModel.countDocuments();
    const status = calibrationStatus(outcomeCount);
    const snapshot = await this.predictionModel.create({
      snapshotId: randomUUID(),
      targetId: input.targetId,
      applicationId: input.applicationId,
      interviewSessionId: null,
      readinessIndex: overview.readiness.estimate,
      lower: overview.readiness.lower,
      upper: overview.readiness.upper,
      coverage: overview.readiness.coverage,
      transferCoverage: overview.readiness.transferCoverage,
      forecastProbability: status === "calibrated"
        ? overview.readiness.estimate / 100
        : null,
      calibrationStatus: status,
    });
    return this.serializePrediction(snapshot);
  }

  async recordOutcome(input: CreateReadinessOutcome) {
    const prediction = await this.predictionModel
      .findOne({ snapshotId: input.predictionSnapshotId })
      .lean()
      .exec();
    if (!prediction) throw new NotFoundException("Снимок готовности не найден");
    const outcome = await this.outcomeModel.findOneAndUpdate(
      { predictionSnapshotId: input.predictionSnapshotId },
      {
        $set: {
          applicationId: prediction.applicationId,
          company: input.company,
          technicalPassed: input.technicalPassed,
          codingPassed: input.codingPassed,
          topics: input.topics,
          notes: input.notes,
          occurredAt: new Date(input.occurredAt),
        },
        $setOnInsert: { outcomeId: randomUUID() },
      },
      { upsert: true, returnDocument: "after" },
    ).exec();
    return this.serializeOutcome(outcome);
  }

  async summary(): Promise<ReadinessCalibrationSummary> {
    const [snapshots, outcomes] = await Promise.all([
      this.predictionModel.find().sort({ createdAt: -1 }).limit(20).lean().exec(),
      this.outcomeModel.find().sort({ occurredAt: -1 }).limit(20).lean().exec(),
    ]);
    const snapshotMap = new Map(snapshots.map((item) => [item.snapshotId, item]));
    const comparable = outcomes.flatMap((outcome) => {
      const snapshot = snapshotMap.get(outcome.predictionSnapshotId);
      return snapshot
        ? [{ predicted: snapshot.readinessIndex / 100, actual: outcome.technicalPassed ? 1 : 0 }]
        : [];
    });
    const brierScore = comparable.length
      ? Number((comparable.reduce(
          (sum, item) => sum + (item.predicted - item.actual) ** 2,
          0,
        ) / comparable.length).toFixed(3))
      : null;
    return {
      status: calibrationStatus(outcomes.length),
      outcomeCount: outcomes.length,
      brierScore,
      snapshots: snapshots.map((item) => this.serializePrediction(item)),
      outcomes: outcomes.map((item) => this.serializeOutcome(item)),
    };
  }

  private serializePrediction(value: ReadinessPredictionEntry & { createdAt: Date }) {
    return {
      snapshotId: value.snapshotId,
      targetId: value.targetId,
      applicationId: value.applicationId ?? null,
      interviewSessionId: value.interviewSessionId ?? null,
      readinessIndex: value.readinessIndex,
      lower: value.lower,
      upper: value.upper,
      coverage: value.coverage,
      transferCoverage: value.transferCoverage,
      forecastProbability: value.forecastProbability ?? null,
      calibrationStatus: value.calibrationStatus,
      createdAt: value.createdAt.toISOString(),
    };
  }

  private serializeOutcome(value: ReadinessOutcomeEntry & { createdAt: Date; occurredAt: Date }) {
    return {
      outcomeId: value.outcomeId,
      predictionSnapshotId: value.predictionSnapshotId,
      applicationId: value.applicationId ?? null,
      company: value.company,
      technicalPassed: value.technicalPassed,
      codingPassed: value.codingPassed ?? null,
      topics: value.topics,
      notes: value.notes,
      occurredAt: value.occurredAt.toISOString(),
      createdAt: value.createdAt.toISOString(),
    };
  }
}
