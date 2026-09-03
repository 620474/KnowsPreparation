import type { InterviewSessionCompany } from "@prep/contracts";

export type CompanySystemDesignMode = "off" | "optional" | "required";

export interface CompanyInterviewPolicy {
  sectionWeights: { platform: number; coding: number; architecture: number; defense: number };
  requireComplexityDefense: boolean;
  requireCodeDefense: boolean;
  allowChangingRequirements: boolean;
  systemDesignMode: CompanySystemDesignMode;
  maxFollowUpDepth: number;
  targetDurationMinutes: number;
  vacancyConditionalSkills: string[];
}

const POLICIES = {
  general: {
    sectionWeights: { platform: 1, coding: 1, architecture: 1, defense: 1 },
    requireComplexityDefense: true,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "optional",
    maxFollowUpDepth: 5,
    targetDurationMinutes: 90,
    vacancyConditionalSkills: [],
  },
  yandex: {
    sectionWeights: { platform: 1.5, coding: 1.5, architecture: 1.2, defense: 1.1 },
    requireComplexityDefense: true,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "optional",
    maxFollowUpDepth: 5,
    targetDurationMinutes: 120,
    vacancyConditionalSkills: [],
  },
  ozon: {
    sectionWeights: { platform: 1.3, coding: 1.1, architecture: 0.8, defense: 1 },
    requireComplexityDefense: true,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "optional",
    maxFollowUpDepth: 4,
    targetDurationMinutes: 90,
    vacancyConditionalSkills: ["vue", "nuxt", "pinia"],
  },
  avito: {
    sectionWeights: { platform: 1.4, coding: 1.5, architecture: 1.5, defense: 1.3 },
    requireComplexityDefense: true,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "required",
    maxFollowUpDepth: 5,
    targetDurationMinutes: 150,
    vacancyConditionalSkills: ["microfrontends", "ssr", "observability"],
  },
  tbank: {
    sectionWeights: { platform: 1.3, coding: 1.5, architecture: 1.5, defense: 1.3 },
    requireComplexityDefense: true,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "required",
    maxFollowUpDepth: 5,
    targetDurationMinutes: 180,
    vacancyConditionalSkills: [],
  },
  mts: {
    sectionWeights: { platform: 1.1, coding: 1.1, architecture: 1.3, defense: 1.1 },
    requireComplexityDefense: false,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "optional",
    maxFollowUpDepth: 4,
    targetDurationMinutes: 90,
    vacancyConditionalSkills: ["websocket", "reconnect", "microfrontends", "next.js"],
  },
  "2gis": {
    sectionWeights: { platform: 1.5, coding: 1.2, architecture: 1, defense: 1 },
    requireComplexityDefense: false,
    requireCodeDefense: true,
    allowChangingRequirements: true,
    systemDesignMode: "optional",
    maxFollowUpDepth: 4,
    targetDurationMinutes: 90,
    vacancyConditionalSkills: ["maps", "geodata", "high-load"],
  },
} satisfies Record<InterviewSessionCompany, CompanyInterviewPolicy>;

export function getCompanyInterviewPolicy(company: InterviewSessionCompany) {
  return POLICIES[company];
}
