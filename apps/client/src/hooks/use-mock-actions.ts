import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  BOOTSTRAP_QUERY_KEY,
  type BootstrapMutationContext,
  updateMockInterviews,
} from "../lib/bootstrap-cache";
import {
  offlineMutationKeys,
  type MockAnswerMutationVariables,
} from "../lib/offline-mutation-keys";
import type { BootstrapData, MockInterview } from "../types";

interface UseMockActionsOptions {
  online: boolean;
  setError: (message: string) => void;
}

export function useMockActions({ online, setError }: UseMockActionsOptions) {
  const queryClient = useQueryClient();

  const startMutation = useMutation<MockInterview, Error>({
    mutationFn: learningApi.startMockInterview,
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error) => setError(error.message),
  });

  const saveAnswerMutation = useMutation<
    MockInterview,
    Error,
    MockAnswerMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.mockAnswer,
    mutationFn: ({ interviewId, questionId, content }) =>
      learningApi.updateMockAnswer(interviewId, questionId, content),
    onMutate: async ({ interviewId, questionId, content }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) => {
        if (!current) return current;
        const interview = current.mockInterviews.find(
          (item) => item.id === interviewId,
        );
        return interview
          ? updateMockInterviews(current, {
              ...interview,
              answers: { ...interview.answers, [questionId]: content },
            })
          : current;
      });
      return { previous };
    },
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message);
    },
  });

  const completeMutation = useMutation<MockInterview, Error, string>({
    mutationFn: learningApi.completeMockInterview,
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error) => setError(error.message),
  });

  const startMockInterview = async () => {
    setError("");
    try {
      return await startMutation.mutateAsync();
    } catch {
      return null;
    }
  };

  const saveMockAnswer = async (
    interviewId: string,
    questionId: string,
    content: string,
  ) => {
    setError("");
    const variables = { interviewId, questionId, content };
    if (!online) {
      const interview = queryClient
        .getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY)
        ?.mockInterviews.find((item) => item.id === interviewId);
      const optimisticInterview = interview
        ? { ...interview, answers: { ...interview.answers, [questionId]: content } }
        : null;
      saveAnswerMutation.mutate(variables);
      return optimisticInterview;
    }
    try {
      return await saveAnswerMutation.mutateAsync(variables);
    } catch {
      return null;
    }
  };

  const completeMockInterview = async (interviewId: string) => {
    setError("");
    try {
      return await completeMutation.mutateAsync(interviewId);
    } catch {
      return null;
    }
  };

  const transcribeMockAnswer = async (interviewId: string, audio: Blob) => {
    setError("");
    try {
      return (await learningApi.transcribeMockAnswer(interviewId, audio)).text;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось распознать ответ",
      );
      return null;
    }
  };

  return {
    startMockInterview,
    saveMockAnswer,
    completeMockInterview,
    transcribeMockAnswer,
  };
}
