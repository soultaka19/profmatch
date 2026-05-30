"use client";

import useSWR from "swr";
import { affectationsApi } from "@/lib/api/affectations";
import type { GenerationStatus } from "@/lib/types/api";

/**
 * Polling SWR sur le statut d'une tâche Celery de génération.
 *
 * Architecture Niveau 2bis (enrichissement XAI lazy) :
 * - Tant que la tâche tourne (PENDING/STARTED) → poll 2 s pour basculer
 *   rapidement vers le tableau dès que les affectations sont committées.
 * - Une fois SUCCESS → arrêt immédiat. L'enrichissement LLM n'est plus
 *   déclenché en masse à la génération (il l'est à la consultation de chaque
 *   justification, cf. `AffectationCompactTable`), donc il n'y a plus de
 *   compteur batch à attendre — poller au-delà bouclerait indéfiniment.
 *
 * En cas d'erreur, arrêt immédiat.
 */
export function useGenerationPoller(taskId: string | null) {
  return useSWR<GenerationStatus>(
    taskId ? `/api/affectations/generation/${taskId}` : null,
    taskId ? () => affectationsApi.getGenerationStatus(taskId) : null,
    {
      refreshInterval: (data) => {
        if (!data || data.status === "error" || data.status === "done") {
          return 0;
        }
        return 2000;
      },
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
}
