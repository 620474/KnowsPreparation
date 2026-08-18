import {
  bootstrapContentSchema,
  bootstrapProgressSchema,
  type BootstrapContent,
  type BootstrapData,
  type BootstrapProgress,
} from "@prep/contracts";

/**
 * Склеивает кешируемый контент и персональный прогресс в единое состояние.
 * Обе половины уже проверены схемами при загрузке, поэтому здесь только слияние.
 */
export function mergeBootstrapPayloads(
  content: BootstrapContent,
  progress: BootstrapProgress,
): BootstrapData {
  return { ...content, ...progress };
}

export const parseBootstrapContent = (payload: unknown): BootstrapContent =>
  bootstrapContentSchema.parse(payload);

export const parseBootstrapProgress = (payload: unknown): BootstrapProgress =>
  bootstrapProgressSchema.parse(payload);
