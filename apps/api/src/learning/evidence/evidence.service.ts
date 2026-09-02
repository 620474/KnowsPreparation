import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { EvidenceEvent } from "../schemas/evidence-event.schema";
import { LearningSignal } from "../schemas/learning-signal.schema";
import { mapSignalToEvidence } from "./evidence-mapper";

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectModel(EvidenceEvent.name)
    private readonly evidenceModel: Model<EvidenceEvent>,
    @InjectModel(LearningSignal.name)
    private readonly signalModel: Model<LearningSignal>,
  ) {}

  async recordFromSignal(signal: LearningSignal) {
    const evidence = mapSignalToEvidence(signal);
    if (!evidence) return null;
    try {
      await this.evidenceModel.updateOne(
        { operationId: evidence.operationId },
        { $setOnInsert: evidence },
        { upsert: true },
      ).exec();
      return evidence.eventId;
    } catch (error) {
      this.logger.warn({
        event: "evidence_write_failed",
        operationId: signal.operationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async backfillMissing() {
    const existingOperationIds = await this.evidenceModel.distinct("operationId").exec();
    const signals = await this.signalModel
      .find({
        operationId: { $nin: existingOperationIds },
        type: { $ne: "recommendation_skipped" },
      })
      .sort({ occurredAt: 1 })
      .lean()
      .exec();
    for (const signal of signals) await this.recordFromSignal(signal as LearningSignal);
    return signals.length;
  }

  async listForSkill(skillId: string, limit = 50) {
    return this.evidenceModel
      .find({ "observations.skillId": skillId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  listAll() {
    return this.evidenceModel.find().sort({ occurredAt: 1 }).lean().exec();
  }
}
