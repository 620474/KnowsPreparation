import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { CheckpointSessionEntry } from "./schemas/checkpoint-session.schema";
import { InterviewOutcomeV3Entry } from "./schemas/interview-outcome-v3.schema";
import { ItemExposureEntry } from "./schemas/item-exposure.schema";

@Injectable()
export class VerificationMigrationService implements OnModuleInit {
  private readonly logger = new Logger(VerificationMigrationService.name);

  constructor(
    @InjectModel(CheckpointSessionEntry.name) private readonly sessions: Model<CheckpointSessionEntry>,
    @InjectModel(ItemExposureEntry.name) private readonly exposures: Model<ItemExposureEntry>,
    @InjectModel(InterviewOutcomeV3Entry.name) private readonly outcomes: Model<InterviewOutcomeV3Entry>,
  ) {}

  async onModuleInit() {
    const [sessions, exposures, outcomes] = await Promise.all([
      this.sessions.updateMany({ revision: { $exists: false } }, { $set: { revision: 0, activeLease: null } }).exec(),
      this.exposures.updateMany(
        { targetId: { $exists: false } },
        { $set: { targetId: "general", conceptFamilyId: "legacy", formFamilyId: "legacy", contextFamilyId: "legacy", contentHash: "legacy", viewedLeaseIds: [], attemptedOperationIds: [] } },
      ).exec(),
      this.outcomes.updateMany(
        { stage: { $exists: false } },
        { $set: { stage: "technical", result: "pending", questions: [], feedback: null, company: null, role: null } },
      ).exec(),
    ]);
    await this.exposures.syncIndexes();
    this.logger.log({
      event: "verification_v9_migration_complete",
      sessions: sessions.modifiedCount,
      exposures: exposures.modifiedCount,
      outcomes: outcomes.modifiedCount,
    });
  }
}
