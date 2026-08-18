import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { SkillKey, TrackKey } from "@prep/contracts";
import type { Model } from "mongoose";

import {
  LearningSignal,
  type LearningSignalType,
} from "./schemas/learning-signal.schema";

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
  ) {}

  async record(signal: RecordLearningSignal) {
    try {
      await this.signalModel
        .updateOne(
          { operationId: signal.operationId },
          {
            $setOnInsert: {
              type: signal.type,
              track: signal.track ?? null,
              itemId: signal.itemId ?? null,
              skillKeys: [...new Set(signal.skillKeys ?? [])],
              payload: signal.payload ?? {},
              operationId: signal.operationId,
              occurredAt: signal.occurredAt ?? new Date(),
            },
          },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      this.logger.warn({
        event: "learning_signal_write_failed",
        operationId: signal.operationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
