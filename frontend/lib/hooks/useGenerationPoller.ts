"use client";

import useSWR from "swr";
import { affectationsApi } from "@/lib/api/affectations";
import type { GenerationStatus } from "@/lib/types/api";

/**
 * Polling SWR sur le statut d'une tâche Celery de génération.
 *
 * Stratégie en deux temps liée à l'architecture Niveau 2 :
 * 1. Tant que la tâche tourne (PENDING/STARTED) → poll 2 s pour basculer
 *    rapidement vers le tableau dès que les affectations sont committées.
 * 2. Une fois SUCCESS → continue à poller 2 s pour mettre à jour
 *    `totaux.enrichie` (l'IA travaille en arrière-plan et remplace
 *    progressivement les justifications statiques). On s'arrête quand
 *    `enrichie + echec === total` — soit tout l'enrichissement est traité.
 *
 * En cas d'erreur, arrêt immédiat.
 */
export function useGenerationPoller(taskId: string | null) {
  return useSWR<GenerationStatus>(
    taskId ? `/api/affectations/generation/${taskId}` : null,
    taskId ? () => affectationsApi.getGenerationStatus(taskId) : null,
    {
      refreshInterval: (data) => {
        if (!data || data.status === "error") return 0;
        if (data.status === "done") {
          const t = data.totaux;
          if (!t || t.total === 0) return 0;
          // Tant que des justifications attendent l'enrichissement IA, on
          // continue à poller pour rafraîchir le counter et les badges.
          return t.enrichie + t.echec >= t.total ? 0 : 2000;
        }
        return 2000;
      },
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
}
