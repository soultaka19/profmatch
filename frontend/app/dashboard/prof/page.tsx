"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CVDropzone, type CVDropzoneHandle } from "@/components/cv/CVDropzone";
import { CVStatusCard } from "@/components/cv/CVStatusCard";
import { CVExtractionPanel } from "@/components/cv/extraction/CVExtractionPanel";
import { useCVPolling } from "@/lib/hooks/useCVPolling";
import { cvApi } from "@/lib/api/cv";
import { toast } from "sonner";

const TITLE_BY_STATUT: Record<string, string> = {
  vide: "Téléverser votre CV",
  en_attente: "Analyse en attente",
  en_cours: "Analyse en cours",
  traite: "Votre CV a été analysé",
  erreur: "Erreur lors de l'analyse",
};

function leadFor(statut: string, prenom: string): string {
  switch (statut) {
    case "vide":
      return `Bonjour ${prenom}, déposez votre CV pour démarrer l'analyse automatique, ou saisissez vos informations manuellement.`;
    case "en_attente":
      return `Bonjour ${prenom}, votre CV est en file d'attente. Il sera analysé dans quelques instants.`;
    case "en_cours":
      return `Bonjour ${prenom}, l'IA analyse votre CV. Cela prend généralement quelques secondes.`;
    case "traite":
      return `Bonjour ${prenom}, vérifiez les informations extraites par l'IA avant leur utilisation pour l'affectation des cours.`;
    case "erreur":
      return `Bonjour ${prenom}, une erreur est survenue lors de l'analyse. Vous pouvez réessayer ou saisir vos informations manuellement.`;
    default:
      return "";
  }
}

export default function ProfDashboardPage() {
  const { user } = useAuth();
  const { data: cv, error, isLoading, mutate } = useCVPolling();
  const dropzoneRef = useRef<CVDropzoneHandle>(null);
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  const statutKey = cv?.statut ?? "vide";
  const title = TITLE_BY_STATUT[statutKey] ?? TITLE_BY_STATUT.vide;
  const prenom = (user?.nom_complet ?? "Professeur").split(" ")[0];
  const lead = leadFor(statutKey, prenom);
  const isProcessing = cv?.statut === "en_attente" || cv?.statut === "en_cours";

  const showManualOption = !cv || cv.statut === "erreur";

  async function handleCreateManual() {
    setIsCreatingManual(true);
    try {
      await cvApi.createManual();
      await mutate();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Impossible de créer le CV manuel.";
      toast.error(message);
    } finally {
      setIsCreatingManual(false);
    }
  }

  return (
    <div>
      <h1 className="text-display font-semibold text-fg">{title}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-fg-muted">{lead}</p>

      {!cv && !isLoading && (
        <div className="space-y-3">
          <CVDropzone ref={dropzoneRef} onUploaded={() => mutate()} />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-fg-subtle">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={handleCreateManual}
            disabled={isCreatingManual}
            className="w-full rounded-md border border-border bg-canvas-pure px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-primary/40 hover:bg-primary-soft/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingManual ? "Création en cours…" : "Créer mon CV manuellement"}
          </button>
        </div>
      )}

      <CVStatusCard
        data={cv}
        loading={isLoading && !cv}
        onRetry={() => mutate()}
        onReplace={cv?.statut === "traite" ? () => dropzoneRef.current?.open() : undefined}
      />

      {cv?.statut === "traite" && (
        <>
          <CVExtractionPanel />
          <CVDropzone ref={dropzoneRef} onUploaded={() => mutate()} variant="hidden" />
        </>
      )}

      {cv?.statut === "erreur" && (
        <div className="space-y-3">
          <CVDropzone onUploaded={() => mutate()} />
          {showManualOption && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-fg-subtle">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={handleCreateManual}
                disabled={isCreatingManual}
                className="w-full rounded-md border border-border bg-canvas-pure px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-primary/40 hover:bg-primary-soft/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingManual ? "Création en cours…" : "Créer mon CV manuellement"}
              </button>
            </>
          )}
        </div>
      )}

      {isProcessing && <CVDropzone onUploaded={() => mutate()} disabled variant="compact" />}

      {error && (
        <p className="mt-5 text-sm text-destructive">
          Erreur lors du chargement du CV. Rechargez la page.
        </p>
      )}
    </div>
  );
}
