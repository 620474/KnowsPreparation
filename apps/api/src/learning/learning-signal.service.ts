import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { SkillKey, TrackKey } from "@prep/contracts";
import type { Model } from "mongoose";

import {
  LearningSignal,
  type LearningSignalType,
} from "./schemas/learning-signal.schema";
import { EvidenceService } from "./evidence/evidence.service";

export interface RecordLearningSignal {
  type: LearningSignalType;
  track?: TrackKey | null;
  itemId?: string | null;
  skillKeys?: SkillKey[];
  payload?: Record<string, unknown>;
  operationId: string;
  occurredAt?: Date;
}

@Injectable()
export class LearningSignalService {
  private readonly logger = new Logger(LearningSignalService.name);

  constructor(
    @InjectModel(LearningSignal.name)
    private readonly signalModel: Model<LearningSignal>,
    private readonly evidenceService: EvidenceService,
  ) {}

  async record(signal: RecordLearningSignal) {
    const normalized = {
      type: signal.type,
      track: signal.track ?? null,
      itemId: signal.itemId ?? null,
      skillKeys: [...new Set(signal.skillKeys ?? [])],
      payload: signal.payload ?? {},
      operationId: signal.operationId,
      occurredAt: signal.occurredAt ?? new Date(),
    };
    try {
      await this.signalModel
        .updateOne(
          { operationId: signal.operationId },
          {
            $setOnInsert: {
              ...normalized,
            },
          },
          { upsert: true },
        )
        .exec();
      await this.evidenceService.recordFromSignal(normalized as LearningSignal);
    } catch (error) {
      this.logger.warn({
        event: "learning_signal_write_failed",
        operationId: signal.operationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
