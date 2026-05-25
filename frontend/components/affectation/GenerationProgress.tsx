import { Loader2 } from "lucide-react";
import type { GenerationPhase } from "@/lib/types/api";

const GENERATION_STATUS_LABEL: Record<GenerationPhase, string> = {
  pending: "Génération en attente de traitement",
  queued: "Génération en attente de traitement",
  processing: "Calcul des propositions en cours",
  done: "Génération terminée",
  error: "La génération a échoué",
};

export function GenerationProgress({ status = "queued" }: { status?: GenerationPhase }) {
  const label = GENERATION_STATUS_LABEL[status];

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-fg-muted">
        Analyse des profils et calcul des scores W1-W4 pour les cours sélectionnés.
      </p>
      <p role="status" aria-live="polite" className="text-sm font-medium text-fg">
        {label}
      </p>
    </div>
  );
}
