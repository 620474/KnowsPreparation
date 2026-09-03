import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  CANDIDATE_STATE_V1_VERSION,
  assessmentEventV4Schema,
  candidateStateV1Schema,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { EvidenceLedgerV10Service } from "./evidence-ledger-v10.service";
import { AssessmentEventV4Entry } from "./schemas/assessment-event-v4.schema";
import { VerificationV9Service } from "./verification-v9.service";

const average = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : null;

@Injectable()
export class CandidateStateV10Service {
  constructor(
    private readonly verification: VerificationV9Service,
    private readonly ledger: EvidenceLedgerV10Service,
    @InjectModel(AssessmentEventV4Entry.name) private readonly assessmentEvents: Model<AssessmentEventV4Entry>,
  ) {}

  async get(targetId = "general") {
    const [readiness, rawEvents, exposure] = await Promise.all([
      this.verification.readiness(targetId),
      this.assessmentEvents.find({ targetId }).sort({ occurredAt: 1 }).lean().exec(),
      this.ledger.summarize(targetId),
    ]);
    const events = rawEvents.map((event) => assessmentEventV4Schema.parse({
      ...event,
      occurredAt: new Date(event.occurredAt).toISOString(),
    }));
    const confidenceGaps = events.map((event) => {
      const score = average(event.observations.map((observation) => observation.score)) ?? 0;
      return event.selfAssessment.confidenceBefore - score;
    });
    return candidateStateV1Schema.parse({
      version: CANDIDATE_STATE_V1_VERSION,
      targetId,
      targetLabel: readiness.targetLabel,
      generatedAt: new Date().toISOString(),
      readiness: {
        status: readiness.status,
        learningMastery: readiness.learningMastery,
        verifiedTransferReadiness: readiness.verifiedTransferReadiness,
        verifiedCoverage: readiness.verifiedCoverage,
        blockers: readiness.blockers,
        capabilities: readiness.capabilities,
      },
      evidence: {
        totalAssessments: events.length,
        eligibleAssessments: events.filter((event) => event.verificationEligibility === "eligible").length,
        validAssessments: events.filter((event) => event.integrity.valid).length,
        latestAssessmentAt: events.at(-1)?.occurredAt ?? null,
      },
      exposure,
      behavior: {
        averageConfidenceGap: average(confidenceGaps),
        averageDurationMs: average(events.map((event) => event.process.durationMs)),
        averageRevisionCount: average(events.map((event) => event.process.revisionCount)),
        interruptedAssessmentCount: events.filter((event) => event.integrity.networkInterrupted).length,
      },
    });
  }
}
