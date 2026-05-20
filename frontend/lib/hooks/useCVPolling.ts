"use client";

import useSWR from "swr";
import { cvApi } from "@/lib/api/cv";
import type { CVResponse } from "@/lib/types/api";

/**
 * Récupère le CV du professeur courant et auto-rafraîchit toutes les 2 s
 * tant que le CV est en cours de traitement (en_attente ou en_cours).
 * Une fois `traite` ou `erreur`, le polling s'arrête.
 */
export function useCVPolling() {
  return useSWR<CVResponse | null>("/api/cv/me", () => cvApi.me(), {
    refreshInterval: (data) =>
      data && (data.statut === "en_attente" || data.statut === "en_cours")
        ? 2000
        : 0,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
}
