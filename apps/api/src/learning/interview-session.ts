import type {
  InterviewExercise,
  InterviewReadinessConfidence,
  InterviewSessionCompany,
  InterviewSessionMode,
} from "@prep/contracts";

import { QUESTION_BANK } from "./curriculum";
import { getStaticRunnerValidationCases } from "./exercise-runners";
import { STATIC_TRACK_LIST } from "./track-registry";

const COMPANY_LABELS: Record<InterviewSessionCompany, string> = {
  general: "российский бигтех",
  yandex: "Яндекс",
  ozon: "Ozon",
};

export const interviewCompanyLabel = (company: InterviewSessionCompany) =>
  COMPANY_LABELS[company];

const rotate = <T>(values: T[], offset: number) => {
  if (values.length === 0) return values;
  const normalized = offset % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
};

export function selectInterviewQuestions(mode: InterviewSessionMode, offset = 0) {
  const count = mode === "full" ? 3 : 2;
  const categories = new Set<string>();
  const selected = [];
  for (const question of rotate(QUESTION_BANK, offset)) {
    if (categories.has(question.category)) continue;
    categories.add(question.category);
    selected.push(question);
    if (selected.length === count) break;
  }
  return selected;
}

interface ExerciseCandidate {
  id: string;
  title: string;
  statement: string;
  runner: InterviewExercise["runner"];
}

function getExerciseCandidates(company: InterviewSessionCompany) {
  const metadata = new Map(
    STATIC_TRACK_LIST.flatMap((track) =>
      track.days.flatMap((day) =>
        day.blocks.map((block) => [block.id, block] as const),
      ),
    ),
  );
  const preferredPrefix = company === "general" ? null : `${company}-`;
  const all = getStaticRunnerValidationCases().flatMap(({ id, runner }) => {
    const block = metadata.get(id);
    if (!block) return [];
    return [{
      id,
      title: block.title,
      statement: block.exercise?.statement ?? block.description,
      runner,
    } satisfies ExerciseCandidate];
  });
  const preferred = preferredPrefix
    ? all.filter((candidate) => candidate.id.startsWith(preferredPrefix))
    : all;
  return preferred.length >= 2 ? preferred : all;
}

export function selectInterviewExercises(
  company: InterviewSessionCompany,
  offset = 0,
): [InterviewExercise, InterviewExercise] {
  const candidates = rotate(getExerciseCandidates(company), offset);
  if (candidates.length < 2) throw new Error("Not enough interview exercises");
  return [candidates[0]!, candidates[1]!].map((candidate) => ({
    ...candidate,
    solution: candidate.runner.starterCode,
    result: null,
    attempts: 0,
  })) as [InterviewExercise, InterviewExercise];
}

export function getReadinessConfidence(
  completedSessionCount: number,
): InterviewReadinessConfidence {
  if (completedSessionCount < 2) return "low";
  if (completedSessionCount < 5) return "medium";
  return "high";
}

export const interviewDurationMinutes = (mode: InterviewSessionMode) =>
  mode === "full" ? 75 : 35;
