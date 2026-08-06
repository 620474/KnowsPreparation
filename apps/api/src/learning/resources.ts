import resourceCatalog from "./data/resources.json";

export type ResourceLanguage = "ru" | "en";
export type ResourceKind = "main" | "deep-dive" | "practice" | "reference" | "case-study";
export type ResourceLevel = "basic" | "beginner" | "intermediate" | "advanced";
export type ResourceStatus = "current" | "evergreen" | "historical";
export type ResourcePriority = "must" | "should" | "optional";
export type ResourceTopic =
  | "AI"
  | "JavaScript"
  | "React"
  | "TypeScript"
  | "Algorithms"
  | "Browser"
  | "Performance"
  | "CSS"
  | "Accessibility"
  | "Architecture"
  | "Testing"
  | "Security"
  | "Interview";

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  provider: string;
  language: ResourceLanguage;
  kind: ResourceKind;
  topics: ResourceTopic[];
  estimatedMinutes: number;
  description: string;
  publishedYear?: number;
  tags?: string[];
  level?: ResourceLevel;
  status?: ResourceStatus;
  paywall?: boolean;
  registrationRequired?: boolean;
  learningGoal?: string;
  whySelected?: string;
  verifiedAt?: string;
  priority?: ResourcePriority;
  practicalTask?: string;
  interviewQuestions?: string[];
}

interface WeekResourcePlan {
  theory: string[][];
  practice: string[][];
}

export const RESOURCE_CATALOG_VERIFIED_AT = "2026-08-04";
export const AI_RESOURCE_CATALOG_VERIFIED_AT = "2026-08-06";
export const PRINCIPLES_RESOURCE_CATALOG_VERIFIED_AT = "2026-08-06";

const RESOURCE_LANGUAGES = new Set<ResourceLanguage>(["ru", "en"]);
const RESOURCE_KINDS = new Set<ResourceKind>([
  "main",
  "deep-dive",
  "practice",
  "reference",
  "case-study",
]);
const RESOURCE_LEVELS = new Set<ResourceLevel>([
  "basic",
  "beginner",
  "intermediate",
  "advanced",
]);
const RESOURCE_STATUSES = new Set<ResourceStatus>(["current", "evergreen", "historical"]);
const RESOURCE_PRIORITIES = new Set<ResourcePriority>(["must", "should", "optional"]);
const RESOURCE_TOPICS = new Set<ResourceTopic>([
  "AI",
  "JavaScript",
  "React",
  "TypeScript",
  "Algorithms",
  "Browser",
  "Performance",
  "CSS",
  "Accessibility",
  "Architecture",
  "Testing",
  "Security",
  "Interview",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const normalizeResourceUrl = (url: string) =>
  url.replace(/\/index\.html$/, "").replace(/\/$/, "");

function assertResourceCatalog(value: unknown): asserts value is LearningResource[] {
  if (!Array.isArray(value)) {
    throw new Error("Resource catalog must be an array");
  }

  const ids = new Set<string>();
  const urls = new Set<string>();

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      throw new Error(`Resource at index ${index} must be an object`);
    }

    const requiredStrings = ["id", "title", "url", "provider", "description"] as const;
    for (const field of requiredStrings) {
      if (typeof item[field] !== "string" || item[field].length === 0) {
        throw new Error(`Resource at index ${index} has invalid ${field}`);
      }
    }

    const resourceId = item.id as string;
    const resourceUrl = item.url as string;

    if (!RESOURCE_LANGUAGES.has(item.language as ResourceLanguage)) {
      throw new Error(`Resource ${item.id} has invalid language`);
    }
    if (!RESOURCE_KINDS.has(item.kind as ResourceKind)) {
      throw new Error(`Resource ${item.id} has invalid kind`);
    }
    if (
      !isStringArray(item.topics) ||
      item.topics.length === 0 ||
      item.topics.some((topic) => !RESOURCE_TOPICS.has(topic as ResourceTopic))
    ) {
      throw new Error(`Resource ${item.id} has invalid topics`);
    }
    if (typeof item.estimatedMinutes !== "number" || item.estimatedMinutes <= 0) {
      throw new Error(`Resource ${item.id} has invalid estimatedMinutes`);
    }
    if (item.level !== undefined && !RESOURCE_LEVELS.has(item.level as ResourceLevel)) {
      throw new Error(`Resource ${item.id} has invalid level`);
    }
    if (item.status !== undefined && !RESOURCE_STATUSES.has(item.status as ResourceStatus)) {
      throw new Error(`Resource ${item.id} has invalid status`);
    }
    if (
      item.priority !== undefined &&
      !RESOURCE_PRIORITIES.has(item.priority as ResourcePriority)
    ) {
      throw new Error(`Resource ${item.id} has invalid priority`);
    }
    if (!resourceUrl.startsWith("https://")) {
      throw new Error(`Resource ${resourceId} must use HTTPS`);
    }

    const canonicalUrl = normalizeResourceUrl(resourceUrl);
    if (ids.has(resourceId)) {
      throw new Error(`Duplicate resource id: ${resourceId}`);
    }
    if (urls.has(canonicalUrl)) {
      throw new Error(`Duplicate resource URL: ${resourceUrl}`);
    }
    ids.add(resourceId);
    urls.add(canonicalUrl);
  }
}

assertResourceCatalog(resourceCatalog);

export const RESOURCES: LearningResource[] = resourceCatalog;

export const RESOURCE_PLANS: WeekResourcePlan[] = [
  {
    theory: [
      ["js-execution-model", "ydkjs"],
      ["js-types", "js-comparisons"],
      ["js-var", "js-closure"],
      ["js-event-loop", "mdn-microtask-guide", "js-event-loop-deep"],
      ["js-event-loop", "js-async-habr"],
      ["js-memory", "js-memory-mdn"],
      ["learn-js", "mdn-js-guide"],
    ],
    practice: [
      ["js-event-loop", "js-async-habr"],
      ["yandex-algorithms", "hello-algo"],
      ["leetcode-two-sum"],
      ["leetcode-group-anagrams"],
      ["developer-debounce"],
      ["structured-clone", "js-memory"],
      ["yandex-prep", "frontend-handbook"],
    ],
  },
  {
    theory: [
      ["js-closure", "ydkjs"],
      ["js-this", "ydkjs"],
      ["js-call-apply", "js-bind"],
      ["js-prototype", "ydkjs"],
      ["js-class", "js-prototype"],
      ["js-currying", "js-call-apply"],
      ["js-closure", "js-memory-mdn"],
    ],
    practice: [
      ["js-var", "js-closure"],
      ["js-bind", "js-call-apply"],
      ["js-currying"],
      ["hello-algo", "yandex-algorithms", "leetcode-two-sum-ii"],
      ["leetcode-longest-substring"],
      ["leetcode-min-window"],
      ["frontend-handbook", "yandex-prep"],
    ],
  },
  {
    theory: [
      ["js-promises", "js-promise-api", "learnjs-async"],
      ["js-async-await", "js-async-habr"],
      ["js-promise-api", "js-async-habr"],
      ["js-fetch-abort", "mdn-abortcontroller", "developer-fetch"],
      ["js-generators", "js-iterables"],
      ["hello-algo", "hello-algo-binary-search", "yandex-algorithms"],
      ["hello-algo", "yandex-algorithms"],
    ],
    practice: [
      ["js-promise-api", "js-promises"],
      ["js-promise-api"],
      ["js-promise-api", "js-fetch-abort"],
      ["leetcode-valid-parentheses"],
      ["leetcode-queue-stacks"],
      ["leetcode-first-last", "hello-algo-binary-search"],
      ["yandex-prep", "frontend-handbook"],
    ],
  },
  {
    theory: [
      ["react-preserving-state", "developer-reconciliation"],
      ["developer-key", "react-preserving-state"],
      ["react-fiber", "developer-reconciliation"],
      ["react-render-commit", "react-fiber"],
      ["react-queue-state", "developer-rerenders"],
      ["react-transition", "react-fiber"],
      ["react-compiler", "reactdev-react-compiler-1", "yandex-react-performance"],
    ],
    practice: [
      ["developer-key", "react-preserving-state"],
      ["developer-rerenders", "react-devtools"],
      ["react-fiber"],
      ["react-render-commit"],
      ["react-queue-state", "react-devtools"],
      ["react-transition"],
      ["frontend-handbook", "yandex-prep"],
    ],
  },
  {
    theory: [
      ["react-rules-hooks", "react-render-commit"],
      ["react-effect-lifecycle", "react-remove-deps"],
      ["developer-stale", "js-closure"],
      ["developer-memo", "react-compiler"],
      ["developer-context", "developer-rerenders"],
      ["tanstack-query", "redux-style", "zustand"],
      ["developer-custom-hooks", "react-rules-hooks"],
    ],
    practice: [
      ["react-rules-hooks"],
      ["react-remove-deps", "react-no-effect"],
      ["developer-stale"],
      ["developer-memo", "react-devtools"],
      ["developer-context"],
      ["tanstack-query", "redux-style", "zustand"],
      ["developer-custom-hooks", "testing-library"],
    ],
  },
  {
    theory: [
      ["ts-generics", "yandex-generics"],
      ["ts-conditional", "yandex-generics"],
      ["ts-mapped", "type-challenges"],
      ["ts-narrowing", "yandex-typing"],
      ["ts-narrowing", "ts-functions"],
      ["ts-functions", "yandex-typing"],
      ["hello-algo", "yandex-algorithms"],
    ],
    practice: [
      ["ts-generics", "type-challenges-warmup", "type-challenges-pick", "type-challenges"],
      ["ts-conditional", "type-challenges-readonly", "type-challenges"],
      ["ts-mapped", "type-challenges"],
      ["ts-narrowing", "type-challenges"],
      ["ts-narrowing", "yandex-typing"],
      ["ts-functions", "yandex-generics"],
      ["hello-algo", "yandex-algorithms"],
    ],
  },
  {
    theory: [
      ["mdn-crp", "mdn-browser-work"],
      ["mdn-browser-work", "chrome-performance"],
      ["web-vitals", "webdev-cwv-thresholds", "vk-speed"],
      ["web-resource-loading", "developer-initial-load"],
      ["web-virtualize", "developer-rerenders"],
      ["mdn-cache", "web-resource-loading"],
      ["hello-algo", "yandex-algorithms"],
    ],
    practice: [
      ["mdn-crp", "chrome-performance"],
      ["mdn-browser-work", "chrome-performance", "sber-perf-devtools"],
      ["web-vitals", "vk-speed", "vk-performance"],
      ["developer-initial-load", "web-resource-loading"],
      ["web-virtualize"],
      ["mdn-cache"],
      ["leetcode-climbing-stairs", "leetcode-max-subarray"],
    ],
  },
  {
    theory: [
      ["mdn-http2", "mdn-http3", "mdn-tls"],
      ["mdn-cors", "mdn-cookies"],
      ["web-css"],
      ["wai-tutorials", "wai-aria"],
      ["avito-system-design", "feh-system-design", "web-virtualize"],
      ["mdn-websocket", "mdn-sse"],
      ["mdn-service-worker", "tanstack-optimistic"],
    ],
    practice: [
      ["chrome-performance", "mdn-http2"],
      ["mdn-cookies", "owasp-csrf"],
      ["web-css"],
      ["wai-tutorials", "wai-aria"],
      ["avito-system-design", "greatfrontend-radio", "web-virtualize"],
      ["mdn-websocket", "mdn-sse"],
      ["mdn-service-worker", "tanstack-optimistic"],
    ],
  },
  {
    theory: [
      [
        "yandex-solid",
        "cleancoder-srp",
        "pragmatic-dry",
        "fowler-beck-design-rules",
        "patterns-dev",
      ],
      [
        "developer-composition",
        "developer-component-prop",
        "avito-components",
        "react-components-pure",
      ],
      ["fsd-overview", "fsd-layers", "vk-fsd"],
      ["nx-monorepo", "nx-dev-monorepo", "yandex-frontend-architecture"],
      ["martin-microfrontends", "avito-microfrontends", "ozon-microfrontend"],
      ["frontend-handbook", "avito-strong-frontend", "wb-head-frontend-interview"],
      ["yandex-prep", "frontend-handbook"],
    ],
    practice: [
      [
        "yandex-solid",
        "google-code-review-complexity",
        "google-tests-dry-damp",
        "patterns-dev",
      ],
      ["yandex-frontend-architecture", "avito-components", "react-components-pure"],
      ["fsd-layers"],
      ["nx-monorepo"],
      ["martin-microfrontends", "avito-microfrontends"],
      ["frontend-handbook", "avito-strong-frontend"],
      ["yandex-prep", "frontend-handbook"],
    ],
  },
  {
    theory: [
      ["yandex-prep", "yandex-frontend-interview", "tbank-interview", "frontend-handbook"],
      ["avito-algo-tips", "yandex-interview", "sber-frontend-interview", "avito-playbook-hiring"],
      ["avito-system-design", "feh-system-design", "greatfrontend-radio"],
      ["frontend-handbook", "avito-strong-frontend"],
      ["yandex-prep", "frontend-handbook"],
      ["yandex-prep", "avito-strong-frontend"],
      ["frontend-handbook", "yandex-lectures"],
    ],
    practice: [
      ["yandex-prep", "frontend-handbook"],
      ["react-devtools", "mdn-browser-work"],
      ["leetcode-plan", "yandex-algo-interview", "avito-algo-tips"],
      ["avito-system-design"],
      ["yandex-interview", "frontend-handbook"],
      ["yandex-prep", "avito-strong-frontend"],
      ["yandex-interview", "frontend-handbook"],
    ],
  },
  {
    theory: [
      ["yandex-prep", "frontend-handbook"],
      ["learn-js", "js-async-habr"],
      ["react-render-commit", "developer-rerenders"],
      ["ts-narrowing", "mdn-browser-work"],
      ["hello-algo", "leetcode-plan"],
      ["avito-system-design", "patterns-dev"],
      ["testing-library", "testing-library-guiding", "owasp-xss", "owasp-csp"],
    ],
    practice: [
      ["yandex-prep", "frontend-handbook"],
      ["learn-js", "frontend-handbook"],
      ["react-devtools", "developer-rerenders"],
      ["type-challenges", "chrome-performance"],
      ["leetcode-plan", "yandex-algorithms"],
      ["avito-system-design"],
      [
        "vitest",
        "vitest-browser-mode",
        "testing-library",
        "playwright",
        "playwright-writing-tests",
      ],
    ],
  },
  {
    theory: [
      ["yandex-interview", "frontend-handbook"],
      ["js-async-habr", "react-fiber", "react-render-commit"],
      ["hello-algo", "leetcode-plan"],
      ["patterns-dev", "avito-system-design"],
      ["avito-strong-frontend", "yandex-prep"],
      ["yandex-prep", "frontend-handbook"],
      ["yandex-lectures", "frontend-handbook"],
    ],
    practice: [
      ["yandex-interview", "frontend-handbook"],
      ["js-event-loop", "react-render-commit"],
      ["leetcode-plan", "avito-algo-tips"],
      ["avito-system-design"],
      ["avito-strong-frontend", "yandex-prep"],
      ["frontend-handbook", "yandex-prep"],
      ["yandex-interview", "frontend-handbook"],
    ],
  },
];

export const RESOURCE_IDS = new Set(RESOURCES.map((item) => item.id));

export function getResourceIdsForBlock(
  weekIndex: number,
  dayIndex: number,
  kind: "theory" | "practice",
) {
  const weekPlan = RESOURCE_PLANS[weekIndex];
  const resourceIds = weekPlan?.[kind][dayIndex];
  return resourceIds ? [...resourceIds] : [];
}
