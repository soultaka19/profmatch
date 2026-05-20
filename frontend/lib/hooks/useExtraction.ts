"use client";

import useSWR from "swr";
import { extractionApi, type ExtractionData } from "@/lib/api/extraction";

/**
 * Hook pour récupérer les données structurées extraites du CV.
 * Refresh on focus + revalidation explicite via mutate() après chaque édition.
 * Pas de polling — les données ne changent qu'après upload (CVPolling s'en occupe).
 */
export function useExtraction(enabled: boolean = true) {
  return useSWR<ExtractionData>(
    enabled ? "/api/cv/me/extraction" : null,
    () => extractionApi.get(),
    { revalidateOnFocus: true, shouldRetryOnError: false },
  );
}
