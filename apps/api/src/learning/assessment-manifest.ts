import type { SkillCapabilityV3 } from "@prep/contracts";

export type AssessmentKind =
  | "recall" | "comprehension" | "predict_output" | "debugging" | "live_coding"
  | "refactoring" | "system_design" | "architecture_defense" | "transfer";

export interface AssessmentManifestEntry {
  itemId: string;
  contentRevision: number;
  conceptFamilyId: string;
  formFamilyId: string;
  formId: string;
  contextFamilyId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  novelty: "known_context" | "near_transfer" | "far_transfer";
  assessmentKind: AssessmentKind;
  observations: Array<{
    criterionId: string;
    skillId: string;
    capability: SkillCapabilityV3;
    weight: number;
  }>;
}

type Seed = readonly [
  itemId: string,
  conceptFamilyId: string,
  formFamilyId: string,
  formId: string,
  contextFamilyId: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  novelty: AssessmentManifestEntry["novelty"],
  assessmentKind: AssessmentKind,
  skillId: string,
  capability: SkillCapabilityV3,
  criterionId: string,
];

const seeds: Seed[] = [
  ["q-01", "async.event-loop.ordering", "event-loop-order", "mixed-queues-a", "promise-timer-microtask", 3, "known_context", "predict_output", "async", "apply", "ordering"],
  ["q-02", "javascript.closure.binding", "closure-binding", "timer-loop-a", "timer-callback", 2, "near_transfer", "predict_output", "javascript", "apply", "binding-model"],
  ["q-03", "javascript.rate-limit", "debounce", "scheduler-a", "injected-scheduler", 3, "near_transfer", "live_coding", "javascript", "code", "implementation"],
  ["q-04", "async.promise-combinators", "promise-all", "aggregate-a", "mixed-values", 4, "near_transfer", "live_coding", "async", "code", "implementation"],
  ["q-05", "javascript.functional-composition", "curry", "arity-a", "grouped-arguments", 3, "known_context", "live_coding", "javascript", "code", "implementation"],
  ["q-06", "javascript.object-graph", "deep-clone", "cyclic-a", "cyclic-object", 4, "near_transfer", "live_coding", "javascript", "code", "implementation"],
  ["q-07", "javascript.prototype-chain", "prototype-model", "constructor-a", "function-constructor", 2, "known_context", "comprehension", "javascript", "explain", "prototype-model"],
  ["q-08", "javascript.this-binding", "this-binding", "bind-a", "detached-method", 2, "known_context", "debugging", "javascript", "debug", "root-cause"],
  ["q-09", "javascript.this-binding", "this-binding", "bind-b", "manual-bind", 3, "near_transfer", "live_coding", "javascript", "code", "implementation"],
  ["q-10", "javascript.memory-retention", "listener-cleanup", "listener-a", "react-unmount", 3, "near_transfer", "debugging", "javascript", "debug", "retention-path"],
  ["q-11", "javascript.garbage-collection", "reachability", "cycle-a", "object-cycle", 2, "known_context", "comprehension", "javascript", "explain", "reachability"],
  ["q-12", "javascript.iteration", "generator-state", "yield-a", "generator-return", 2, "known_context", "predict_output", "javascript", "apply", "state-transition"],
  ["q-13", "typescript.unknown", "safe-boundary", "json-a", "external-json", 2, "known_context", "comprehension", "typescript", "apply", "safe-boundary"],
  ["q-14", "typescript.conditional-types", "infer-element", "array-a", "array-element", 3, "known_context", "recall", "typescript", "code", "type-expression"],
  ["q-15", "typescript.mapped-types", "mapped-modifiers", "readonly-a", "object-properties", 3, "known_context", "recall", "typescript", "code", "type-expression"],
  ["q-16", "typescript.discriminated-unions", "state-machine", "request-a", "request-state", 2, "known_context", "comprehension", "typescript", "apply", "discriminant"],
  ["q-17", "typescript.variance", "callback-variance", "animal-a", "callback-parameter", 4, "near_transfer", "comprehension", "typescript", "explain", "variance"],
  ["q-18", "typescript.runtime-boundary", "runtime-validation", "api-a", "external-api", 3, "near_transfer", "debugging", "typescript", "apply", "validation"],
  ["q-19", "react.identity", "list-identity", "keys-a", "reordered-list", 2, "known_context", "debugging", "react", "debug", "identity"],
  ["q-20", "react.render-phases", "render-commit", "phase-a", "dom-side-effect", 2, "known_context", "comprehension", "react", "explain", "phase-model"],
  ["q-21", "react.hook-order", "hooks-order", "conditional-a", "conditional-hook", 2, "known_context", "debugging", "react", "debug", "hook-order"],
  ["q-22", "react.stale-closure", "effect-closure", "interval-a", "interval-effect", 3, "near_transfer", "debugging", "react", "debug", "closure-cause"],
  ["q-24", "react.batching", "update-batching", "promise-a", "promise-callback", 3, "near_transfer", "comprehension", "react", "apply", "batching-model"],
  ["q-25", "react.virtualization", "windowing", "list-a", "large-list", 2, "known_context", "comprehension", "react", "apply", "windowing"],
  ["q-27", "react.server-state", "state-placement", "rest-cache-a", "rest-query", 2, "near_transfer", "system_design", "react", "design", "state-placement"],
  ["q-29", "browser.rendering", "render-pipeline", "pipeline-a", "initial-render", 2, "known_context", "comprehension", "browser", "explain", "pipeline-order"],
  ["q-30", "browser.layout", "render-cost", "width-a", "style-change", 2, "near_transfer", "debugging", "browser", "debug", "render-stage"],
  ["q-127", "architecture.responsibility", "component-boundary", "data-table-a", "data-table", 3, "near_transfer", "refactoring", "architecture", "design", "boundary"],
  ["q-128", "architecture.extensibility", "strategy-extension", "notification-a", "notifications", 3, "near_transfer", "system_design", "architecture", "design", "extension-point"],
  ["q-129", "architecture.substitution", "lsp-contract", "button-a", "ui-button", 3, "near_transfer", "debugging", "architecture", "defend", "contract"],
  ["q-130", "architecture.interface-segregation", "consumer-contract", "context-a", "react-context", 3, "near_transfer", "refactoring", "architecture", "design", "consumer-boundary"],
  ["q-131", "architecture.dependency-inversion", "transport-port", "websocket-a", "realtime-transport", 4, "far_transfer", "system_design", "architecture", "transfer", "dependency-direction"],
  ["q-133", "architecture.readability", "damp-tests", "test-a", "frontend-test", 2, "near_transfer", "comprehension", "testing", "explain", "readability-tradeoff"],
  ["q-134", "architecture.simplicity", "state-scope", "accordion-a", "local-ui-state", 2, "near_transfer", "refactoring", "architecture", "apply", "simplification"],
  ["q-135", "architecture.yagni", "premature-distribution", "microfrontend-a", "small-team", 3, "far_transfer", "architecture_defense", "architecture", "defend", "necessity"],
  ["q-136", "architecture.modularity", "cohesion-coupling", "module-a", "feature-module", 2, "known_context", "comprehension", "architecture", "explain", "modularity"],
  ["q-140", "architecture.component-api", "component-variants", "boolean-props-a", "design-system", 3, "far_transfer", "refactoring", "architecture", "design", "api-shape"],
  ["q-141", "architecture.extensibility", "strategy-extension", "sorting-b", "runtime-sorting", 2, "far_transfer", "transfer", "architecture", "transfer", "strategy-choice"],
  ["q-143", "architecture.abstraction", "abstraction-timing", "single-user-a", "future-api", 3, "near_transfer", "architecture_defense", "architecture", "defend", "abstraction-cost"],
  ["q-147", "javascript.encapsulation", "collection-boundary", "subscribers-a", "event-subscribers", 3, "near_transfer", "refactoring", "javascript", "apply", "invariant"],
  ["q-148", "javascript.prototype-chain", "prototype-model", "new-b", "new-operator", 2, "near_transfer", "comprehension", "javascript", "explain", "construction-model"],
  ["q-149", "javascript.prototype-chain", "prototype-model", "class-c", "class-syntax", 3, "far_transfer", "comprehension", "javascript", "explain", "class-semantics"],
  ["q-150", "javascript.polymorphism", "structural-contract", "duck-a", "plain-objects", 2, "known_context", "comprehension", "javascript", "apply", "shared-contract"],
  ["q-151", "architecture.composition", "composition-vs-inheritance", "behavior-a", "object-behavior", 3, "near_transfer", "architecture_defense", "architecture", "defend", "composition-choice"],
  ["q-152", "javascript.encapsulation", "collection-boundary", "private-b", "private-fields", 2, "far_transfer", "comprehension", "javascript", "explain", "privacy-guarantee"],
  ["q-153", "architecture.contracts", "interface-abstract", "typescript-a", "shared-runtime-code", 3, "near_transfer", "architecture_defense", "architecture", "defend", "contract-choice"],
  ["q-154", "architecture.substitution", "lsp-contract", "precondition-b", "numeric-domain", 4, "far_transfer", "debugging", "architecture", "transfer", "precondition"],
  ["q-157", "architecture.simplicity", "state-scope", "formatter-b", "runtime-formatter", 2, "far_transfer", "transfer", "architecture", "transfer", "minimal-pattern"],
];

export const ASSESSMENT_MANIFEST: AssessmentManifestEntry[] = seeds.map((seed) => {
  const [itemId, conceptFamilyId, formFamilyId, formId, contextFamilyId, difficulty, novelty, assessmentKind, skillId, capability, criterionId] = seed;
  return {
    itemId,
    contentRevision: 1,
    conceptFamilyId,
    formFamilyId,
    formId,
    contextFamilyId,
    difficulty,
    novelty,
    assessmentKind,
    observations: [{
      criterionId,
      skillId: skillId.includes(".")
        ? skillId
        : conceptFamilyId.startsWith(`${skillId}.`)
          ? conceptFamilyId
          : `${skillId}.${conceptFamilyId.split(".").slice(1).join(".")}`,
      capability,
      weight: 1,
    }],
  };
});

const manifestByItemId = new Map(ASSESSMENT_MANIFEST.map((entry) => [entry.itemId, entry]));

export const getAssessmentManifestEntry = (itemId: string) => manifestByItemId.get(itemId) ?? null;

export function validateAssessmentManifest() {
  const itemIds = new Set<string>();
  const forms = new Set<string>();
  for (const entry of ASSESSMENT_MANIFEST) {
    if (itemIds.has(entry.itemId)) throw new Error(`Duplicate assessment item: ${entry.itemId}`);
    itemIds.add(entry.itemId);
    const formKey = `${entry.formFamilyId}:${entry.formId}`;
    if (forms.has(formKey)) throw new Error(`Duplicate assessment form: ${formKey}`);
    forms.add(formKey);
    if (!entry.observations.length) throw new Error(`Assessment has no observations: ${entry.itemId}`);
    const totalWeight = entry.observations.reduce((sum, observation) => sum + observation.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) throw new Error(`Observation weights must equal 1: ${entry.itemId}`);
  }
  return true;
}

validateAssessmentManifest();
