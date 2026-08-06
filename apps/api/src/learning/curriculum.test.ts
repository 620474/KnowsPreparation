import { describe, expect, it } from "vitest";

import { AI_SPRINT_DAYS, CURRICULUM, QUESTION_BANK } from "./curriculum";
import {
  AI_RESOURCE_CATALOG_VERIFIED_AT,
  RESOURCE_CATALOG_VERIFIED_AT,
  RESOURCE_IDS,
  RESOURCE_PLANS,
  RESOURCES,
} from "./resources";

describe("curriculum", () => {
  it("contains ten core weeks and two buffer weeks", () => {
    expect(CURRICULUM).toHaveLength(12);
    expect(CURRICULUM.filter((week) => !week.isBuffer)).toHaveLength(10);
    expect(CURRICULUM.filter((week) => week.isBuffer)).toHaveLength(2);
  });

  it("allocates exactly two hours per study day", () => {
    const days = CURRICULUM.flatMap((week) => week.days);
    expect(days).toHaveLength(84);
    for (const day of days) {
      expect(day.blocks.reduce((total, block) => total + block.minutes, 0)).toBe(120);
    }
  });

  it("contains the complete interview question bank", () => {
    expect(QUESTION_BANK).toHaveLength(100);
    expect(new Set(QUESTION_BANK.map((question) => question.id)).size).toBe(100);
  });

  it("contains a valid curated resource catalog", () => {
    expect(RESOURCES.length).toBeGreaterThan(135);
    expect(RESOURCE_IDS.size).toBe(RESOURCES.length);
    expect(RESOURCES.filter((resource) => resource.provider.includes("Habr")).length).toBeGreaterThan(8);
    expect(
      new Set(RESOURCES.map((resource) => resource.url.replace(/\/index\.html$/, "").replace(/\/$/, "")))
        .size,
    ).toBe(RESOURCES.length);
    for (const resource of RESOURCES) {
      expect(resource.url.startsWith("https://")).toBe(true);
      expect(resource.estimatedMinutes).toBeGreaterThan(0);
      expect(resource.topics.length).toBeGreaterThan(0);
    }
  });

  it("includes verified research metadata", () => {
    const researchedResources = RESOURCES.filter(
      (resource) => resource.verifiedAt === RESOURCE_CATALOG_VERIFIED_AT,
    );

    expect(researchedResources).toHaveLength(51);
    for (const resource of researchedResources) {
      expect(resource.level).toBeTruthy();
      expect(resource.status).toBeTruthy();
      expect(typeof resource.paywall).toBe("boolean");
      expect(typeof resource.registrationRequired).toBe("boolean");
      expect(resource.learningGoal).toBeTruthy();
      expect(resource.whySelected).toBeTruthy();
      expect(resource.tags?.length).toBeGreaterThan(0);
    }
  });

  it("includes the merged AI research catalog", () => {
    const aiResources = RESOURCES.filter(
      (resource) => resource.verifiedAt === AI_RESOURCE_CATALOG_VERIFIED_AT,
    );

    expect(aiResources).toHaveLength(85);
    expect(aiResources.every((resource) => resource.topics.includes("AI"))).toBe(true);
    expect(aiResources.filter((resource) => resource.priority === "must")).toHaveLength(35);
    for (const resource of aiResources) {
      expect(resource.priority).toBeTruthy();
      expect(resource.practicalTask).toBeTruthy();
      expect(resource.tags?.length).toBeGreaterThan(0);
    }
  });

  it("adds one AI block to every day of the first four weeks", () => {
    expect(AI_SPRINT_DAYS).toHaveLength(28);
    const days = CURRICULUM.flatMap((week) => week.days);

    for (const day of days.slice(0, 28)) {
      expect(day.blocks.filter((block) => block.kind === "ai")).toHaveLength(1);
    }
    for (const day of days.slice(28)) {
      expect(day.blocks.some((block) => block.kind === "ai")).toBe(false);
    }
  });

  it("links the new research sources to relevant study blocks", () => {
    const linkedResourceIds = new Set(
      RESOURCE_PLANS.flatMap((plan) => [...plan.theory.flat(), ...plan.practice.flat()]),
    );
    const newResourceIds = [
      "mdn-microtask-guide",
      "learnjs-async",
      "mdn-abortcontroller",
      "hello-algo-binary-search",
      "leetcode-two-sum-ii",
      "reactdev-react-compiler-1",
      "type-challenges-warmup",
      "type-challenges-pick",
      "type-challenges-readonly",
      "webdev-cwv-thresholds",
      "nx-dev-monorepo",
      "ozon-microfrontend",
      "vk-fsd",
      "sber-perf-devtools",
      "testing-library-guiding",
      "vitest-browser-mode",
      "playwright-writing-tests",
      "yandex-frontend-interview",
      "sber-frontend-interview",
      "tbank-interview",
      "avito-playbook-hiring",
      "feh-system-design",
      "greatfrontend-radio",
      "wb-head-frontend-interview",
    ];

    for (const resourceId of newResourceIds) {
      expect(RESOURCE_IDS.has(resourceId)).toBe(true);
      expect(linkedResourceIds.has(resourceId)).toBe(true);
    }
  });

  it("links every theory and practice block to known resources", () => {
    expect(RESOURCE_PLANS).toHaveLength(12);
    for (const plan of RESOURCE_PLANS) {
      expect(plan.theory).toHaveLength(7);
      expect(plan.practice).toHaveLength(7);
    }

    const blocks = CURRICULUM.flatMap((week) => week.days.flatMap((day) => day.blocks));
    for (const block of blocks) {
      if (block.kind === "review") {
        expect(block.resourceIds).toEqual([]);
        continue;
      }
      expect(block.resourceIds.length).toBeGreaterThan(0);
      expect(new Set(block.resourceIds).size).toBe(block.resourceIds.length);
      for (const resourceId of block.resourceIds) {
        expect(RESOURCE_IDS.has(resourceId)).toBe(true);
      }
    }
  });
});
