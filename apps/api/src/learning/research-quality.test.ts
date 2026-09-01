import {
  EMPTY_RESEARCH_PROTOCOL,
  type ResearchClaim,
  type ResearchEvidence,
  type ResearchProject,
} from "@prep/contracts";
import { describe, expect, it } from "vitest";

import { calculateResearchMetrics, getResearchEvidenceLinks } from "./research-quality";

const now = "2026-09-02T10:00:00.000Z";
const project: ResearchProject = {
  projectId: "project-1",
  title: "Research quality",
  decisionStatement: "Выбрать подход",
  primaryQuestion: "Какой подход надёжнее?",
  scope: "Frontend",
  design: "computational",
  status: "active",
  startDate: "2026-09-01",
  targetDate: null,
  nextAction: "Проверить вывод",
  protocol: {
    ...EMPTY_RESEARCH_PROTOCOL,
    sourceHierarchy: "Официальные источники прежде вторичных",
    stoppingRule: "Два независимых подтверждения каждого вывода",
    decisionChangeCriteria: "Новый официальный benchmark",
  },
  stages: [
    { key: "decision", status: "complete", note: "" },
    { key: "scope", status: "complete", note: "" },
  ],
  qualityGates: [
    { key: "reproducibility", status: "passed", note: "" },
    { key: "applicability", status: "passed", note: "" },
  ],
  risks: [],
  milestones: [],
  createdAt: now,
  updatedAt: now,
};

const evidence: ResearchEvidence[] = [
  {
    evidenceId: "e-1",
    projectId: "project-1",
    title: "Official benchmark",
    url: "https://example.com/official",
    sourceType: "Benchmark",
    stance: "supports",
    quality: "high",
    notes: "",
    sourceKind: "official",
    author: "Standards body",
    publishedAt: "2026-08-01",
    accessedAt: "2026-09-02",
    originId: "benchmark-2026",
    independence: "independent",
    freshness: "current",
    createdAt: now,
    updatedAt: now,
  },
  {
    evidenceId: "e-2",
    projectId: "project-1",
    title: "Independent replication",
    url: "https://example.org/replication",
    sourceType: "Experiment",
    stance: "supports",
    quality: "medium",
    notes: "",
    sourceKind: "primary",
    author: "Independent lab",
    publishedAt: "2026-08-15",
    accessedAt: "2026-09-02",
    originId: "replication-2026",
    independence: "independent",
    freshness: "current",
    createdAt: now,
    updatedAt: now,
  },
];

const claim: ResearchClaim = {
  claimId: "c-1",
  projectId: "project-1",
  text: "Подход A устойчивее",
  status: "validated",
  confidence: "high",
  evidenceIds: [],
  evidenceLinks: evidence.map((entry) => ({
    evidenceId: entry.evidenceId,
    stance: "supports",
    excerpt: "Result",
    locator: "Table 1",
    notes: "Independent evidence",
  })),
  alternativeExplanations: "Различие наборов данных",
  uncertainty: "Один класс задач",
  createdAt: now,
  updatedAt: now,
};

describe("research quality", () => {
  it("scores traceable and independently triangulated research", () => {
    const metrics = calculateResearchMetrics(project, evidence, [claim]);

    expect(metrics.claimCoverage).toBe(100);
    expect(metrics.primarySourceRatio).toBe(100);
    expect(metrics.triangulation).toBe(100);
    expect(metrics.contradictionHandling).toBe(100);
    expect(metrics.depth).toBeGreaterThan(80);
    expect(metrics.warnings).toEqual([]);
  });

  it("converts legacy evidenceIds into compatible links", () => {
    const links = getResearchEvidenceLinks(
      { ...claim, evidenceIds: ["e-1"], evidenceLinks: [] },
      new Map(evidence.map((entry) => [entry.evidenceId, entry])),
    );

    expect(links).toEqual([expect.objectContaining({
      evidenceId: "e-1",
      stance: "supports",
    })]);
  });

  it("does not count rejected citation links as traceable evidence", () => {
    const rejectedClaim: ResearchClaim = {
      ...claim,
      evidenceLinks: [{
        ...claim.evidenceLinks[0]!,
        verified: false,
        entailmentScore: 20,
        auditNote: "Источник не подтверждает силу вывода",
      }],
    };

    const metrics = calculateResearchMetrics(project, evidence, [rejectedClaim]);

    expect(metrics.claimCoverage).toBe(0);
    expect(metrics.warnings).toContain("Есть связи, которые не прошли citation audit");
  });
});
