import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  BOOTSTRAP_QUERY_KEY,
  updateAiLesson,
} from "../lib/bootstrap-cache";
import type { AppView } from "../lib/app-route";
import type {
  TrackKey,
  AiCourse,
  AiCourseProfile,
  AiLesson,
  BootstrapData,
} from "../types";

interface LessonGenerationVariables {
  track: TrackKey;
  itemId: string;
}

interface UseAiActionsOptions {
  onError: (message: string) => void;
  navigateToView: (view: AppView, mode?: "push" | "replace") => void;
  navigateToLesson: (track: TrackKey, itemId: string) => void;
  resetChat: () => void;
}

export function useAiActions({
  onError,
  navigateToView,
  navigateToLesson,
  resetChat,
}: UseAiActionsOptions) {
  const queryClient = useQueryClient();
  const [generationProgress, setGenerationProgress] = useState<{
    track: TrackKey;
    itemId: string;
    characters: number;
  } | null>(null);

  const courseMutation = useMutation<AiCourse, Error, AiCourseProfile>({
    mutationFn: learningApi.generateAiCourse,
    onSuccess: (course) => {
      // Новая версия курса выдаёт темам новые id, поэтому данные трека
      // course сбрасываются — сервер их тоже удаляет при перегенерации.
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              ai: {
                ...current.ai,
                course,
                lessons: { ...current.ai.lessons, course: {} },
                quizProgress: { ...current.ai.quizProgress, course: {} },
                practiceProgress: { ...current.ai.practiceProgress, course: {} },
              },
            }
          : current,
      );
      queryClient.removeQueries({ queryKey: ["ai-chat", "course"] });
      resetChat();
      navigateToView("ai-course", "replace");
    },
    onError: (error) => onError(error.message),
  });

  const lessonMutation = useMutation<AiLesson, Error, LessonGenerationVariables>({
    mutationFn: ({ track, itemId }) => {
      setGenerationProgress({ track, itemId, characters: 0 });
      return learningApi.generateAiLessonStream(track, itemId, (delta) =>
        setGenerationProgress((current) =>
          current?.track === track && current.itemId === itemId
            ? { ...current, characters: current.characters + delta.length }
            : current,
        ),
      );
    },
    onSuccess: (lesson, { track }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateAiLesson(current, track, lesson) : current,
      );
      navigateToLesson(track, lesson.itemId);
    },
    onError: (error) => onError(error.message),
    onSettled: () => setGenerationProgress(null),
  });

  return {
    generateCourse: courseMutation.mutate,
    generateLesson: (track: TrackKey, itemId: string) =>
      lessonMutation.mutate({ track, itemId }),
    generatingCourse: courseMutation.isPending,
    generatingLesson: lessonMutation.isPending
      ? (lessonMutation.variables ?? null)
      : null,
    generationProgress,
  };
}
