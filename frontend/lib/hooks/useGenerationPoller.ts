"use client";

import useSWR from "swr";
import { affectationsApi } from "@/lib/api/affectations";
import type { GenerationStatus } from "@/lib/types/api";

/**
 * Polling SWR sur le statut d'une tâche Celery de génération.
 * S'arrête automatiquement quand status === "done" | "error".
 */
export function useGenerationPoller(taskId: string | null) {
  return useSWR<GenerationStatus>(
    taskId ? `/api/affectations/generation/${taskId}` : null,
    taskId ? () => affectationsApi.getGenerationStatus(taskId) : null,
    {
      refreshInterval: (data) =>
        !data || data.status === "done" || data.status === "error" ? 0 : 2000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
}
