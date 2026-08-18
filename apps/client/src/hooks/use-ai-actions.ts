import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  BOOTSTRAP_QUERY_KEY,
  updateAiLesson,
} from "../lib/bootstrap-cache";
import type { AppView } from "../lib/app-route";
import type {
  AiChatScope,
  AiCourse,
  AiCourseProfile,
  AiLesson,
  BootstrapData,
} from "../types";

interface LessonGenerationVariables {
  scope: AiChatScope;
  itemId: string;
}

interface UseAiActionsOptions {
  onError: (message: string) => void;
  navigateToView: (view: AppView, mode?: "push" | "replace") => void;
  navigateToLesson: (scope: AiChatScope, itemId: string) => void;
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
    scope: AiChatScope;
    itemId: string;
    characters: number;
  } | null>(null);

  const courseMutation = useMutation<AiCourse, Error, AiCourseProfile>({
    mutationFn: learningApi.generateAiCourse,
    onSuccess: (course) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? { ...current, ai: { ...current.ai, course, lessons: {} } }
          : current,
      );
      queryClient.removeQueries({ queryKey: ["ai-chat", "course"] });
      resetChat();
      navigateToView("ai-course", "replace");
    },
    onError: (error) => onError(error.message),
  });

  const lessonMutation = useMutation<AiLesson, Error, LessonGenerationVariables>({
    mutationFn: ({ scope, itemId }) => {
      setGenerationProgress({ scope, itemId, characters: 0 });
      return learningApi.generateAiLessonStream(scope, itemId, (delta) =>
        setGenerationProgress((current) =>
          current?.scope === scope && current.itemId === itemId
            ? { ...current, characters: current.characters + delta.length }
            : current,
        ),
      );
    },
    onSuccess: (lesson, { scope }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateAiLesson(current, scope, lesson) : current,
      );
      navigateToLesson(scope, lesson.itemId);
    },
    onError: (error) => onError(error.message),
    onSettled: () => setGenerationProgress(null),
  });

  return {
    generateCourse: courseMutation.mutate,
    generateLesson: (scope: AiChatScope, itemId: string) =>
      lessonMutation.mutate({ scope, itemId }),
    generatingCourse: courseMutation.isPending,
    generatingLesson: lessonMutation.isPending
      ? (lessonMutation.variables ?? null)
      : null,
    generationProgress,
  };
}
