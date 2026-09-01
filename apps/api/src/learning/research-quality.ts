import type {
  ResearchClaim,
  ResearchEvidence,
  ResearchEvidenceRelation,
  ResearchMetrics,
  ResearchProject,
} from "@prep/contracts";

const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const qualityScore = {
  unassessed: 0,
  low: 35,
  medium: 65,
  high: 90,
} as const;

const confidenceScore = {
  unassessed: 0,
  low: 35,
  moderate: 65,
  high: 90,
} as const;

const freshnessScore = {
  unassessed: 25,
  current: 100,
  aging: 60,
  outdated: 0,
} as const;

const legacyStance = (evidence: ResearchEvidence): ResearchEvidenceRelation["stance"] =>
  evidence.stance === "neutral" ? "context" : evidence.stance;

export const getResearchEvidenceLinks = (
  claim: ResearchClaim,
  evidenceById: Map<string, ResearchEvidence>,
): ResearchEvidenceRelation[] => {
  if (claim.evidenceLinks.length) return claim.evidenceLinks;
  return claim.evidenceIds.map((evidenceId) => ({
    evidenceId,
    stance: evidenceById.has(evidenceId)
      ? legacyStance(evidenceById.get(evidenceId)!)
      : "context",
    excerpt: "",
    locator: "",
    notes: "",
  }));
};

export function calculateResearchMetrics(
  project: ResearchProject,
  evidence: ResearchEvidence[],
  claims: ResearchClaim[],
): ResearchMetrics {
  const evidenceById = new Map(evidence.map((entry) => [entry.evidenceId, entry]));
  const linksByClaim = claims.map((claim) => getResearchEvidenceLinks(claim, evidenceById));
  const validLinksByClaim = linksByClaim.map((links) =>
    links.filter((link) => link.verified !== false),
  );
  const coverage = percent(
    project.stages.filter((stage) =>
      stage.status === "complete" || stage.status === "not_applicable"
    ).length,
    project.stages.length,
  );
  const traceableClaims = validLinksByClaim.filter((links) => links.length > 0).length;
  const claimCoverage = percent(traceableClaims, claims.length);
  const primarySourceRatio = percent(
    evidence.filter((entry) => entry.sourceKind === "primary" || entry.sourceKind === "official").length,
    evidence.length,
  );
  const linkedClaims = validLinksByClaim.filter((links) => links.length > 0);
  const triangulated = linkedClaims.filter((links) => {
    const origins = new Set(
      links.flatMap((link) => {
        const entry = evidenceById.get(link.evidenceId);
        if (!entry || entry.independence === "dependent") return [];
        return [entry.originId || entry.url || entry.evidenceId];
      }),
    );
    return origins.size >= 2;
  }).length;
  const triangulation = percent(triangulated, linkedClaims.length);
  const contradictionHandling = percent(
    claims.filter((claim, index) =>
      Boolean(claim.alternativeExplanations.trim()) ||
      linksByClaim[index]?.some((link) =>
        link.stance === "contradicts" || link.stance === "limits"
      )
    ).length,
    claims.length,
  );
  const auditedScores = linksByClaim
    .flatMap((links) => links)
    .flatMap((link) => link.entailmentScore === undefined ? [] : [link.entailmentScore]);
  const traceability = auditedScores.length
    ? average([claimCoverage, average(auditedScores)])
    : claimCoverage;
  const freshness = average(evidence.map((entry) => freshnessScore[entry.freshness]));
  const evidenceQuality = average(evidence.map((entry) => qualityScore[entry.quality]));
  const statedUncertainty = percent(
    claims.filter((claim) => claim.uncertainty.trim()).length,
    claims.length,
  );
  const reproducibility = project.qualityGates.some(
    (gate) => gate.key === "reproducibility" && gate.status === "passed",
  ) ? 100 : 0;
  const depth = Math.round(
    coverage * 0.2 +
    evidenceQuality * 0.15 +
    triangulation * 0.15 +
    traceability * 0.15 +
    contradictionHandling * 0.1 +
    reproducibility * 0.1 +
    statedUncertainty * 0.15,
  );
  const confidence = average([
    average(claims.map((claim) => confidenceScore[claim.confidence])),
    evidenceQuality,
    traceability,
    triangulation,
  ]);
  const applicabilityPassed = project.qualityGates.some(
    (gate) => gate.key === "applicability" && gate.status === "passed",
  );
  const impact = Math.min(100,
    (project.decisionStatement.trim() ? 25 : 0) +
    (project.nextAction.trim() ? 20 : 0) +
    (project.protocol.decisionChangeCriteria.trim() ? 20 : 0) +
    (applicabilityPassed ? 20 : 0) +
    (project.status === "completed" ? 15 : project.status === "active" ? 8 : 0),
  );
  const warnings: string[] = [];
  if (!project.protocol.stoppingRule.trim()) warnings.push("Не задано правило остановки поиска");
  if (!project.protocol.sourceHierarchy.trim()) warnings.push("Не задана иерархия источников");
  if (claims.length && traceableClaims < claims.length) warnings.push("Есть выводы без доказательств");
  if (linksByClaim.flat().some((link) => link.verified === false)) {
    warnings.push("Есть связи, которые не прошли citation audit");
  }
  if (linkedClaims.length && triangulated < linkedClaims.length) {
    warnings.push("Не все выводы подтверждены независимыми источниками");
  }
  if (evidence.some((entry) => entry.freshness === "outdated")) {
    warnings.push("Есть устаревшие источники");
  }
  if (claims.length && contradictionHandling === 0) {
    warnings.push("Не зафиксированы альтернативы или противоречащие данные");
  }

  return {
    depth,
    confidence,
    impact,
    coverage,
    claimCoverage,
    primarySourceRatio,
    triangulation,
    contradictionHandling,
    traceability,
    freshness,
    warnings,
  };
}
