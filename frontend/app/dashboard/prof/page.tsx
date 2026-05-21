"use client";

import { useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CVDropzone, type CVDropzoneHandle } from "@/components/cv/CVDropzone";
import { CVStatusCard } from "@/components/cv/CVStatusCard";
import { CVExtractionPanel } from "@/components/cv/extraction/CVExtractionPanel";
import { useCVPolling } from "@/lib/hooks/useCVPolling";

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
      return `Bonjour ${prenom}, déposez votre CV pour démarrer l'analyse automatique. L'IA en extraira vos compétences, expériences et formations.`;
    case "en_attente":
      return `Bonjour ${prenom}, votre CV est en file d'attente. Il sera analysé dans quelques instants.`;
    case "en_cours":
      return `Bonjour ${prenom}, l'IA analyse votre CV. Cela prend généralement quelques secondes.`;
    case "traite":
      return `Bonjour ${prenom}, vérifiez les informations extraites par l'IA avant leur utilisation pour l'affectation des cours.`;
    case "erreur":
      return `Bonjour ${prenom}, une erreur est survenue lors de l'analyse. Vous pouvez réessayer ci-dessous.`;
    default:
      return "";
  }
}

export default function ProfDashboardPage() {
  const { user } = useAuth();
  const { data: cv, error, isLoading, mutate } = useCVPolling();
  const dropzoneRef = useRef<CVDropzoneHandle>(null);

  const statutKey = cv?.statut ?? "vide";
  const title = TITLE_BY_STATUT[statutKey] ?? TITLE_BY_STATUT.vide;
  const prenom = (user?.nom_complet ?? "Professeur").split(" ")[0];
  const lead = leadFor(statutKey, prenom);
  const isProcessing = cv?.statut === "en_attente" || cv?.statut === "en_cours";

  return (
    <div>
      <h1 className="text-display font-semibold text-fg">{title}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-fg-muted">{lead}</p>

      {!cv && !isLoading && <CVDropzone ref={dropzoneRef} onUploaded={() => mutate()} />}

      <CVStatusCard
        data={cv}
        loading={isLoading && !cv}
        onRetry={() => mutate()}
        onReplace={cv?.statut === "traite" ? () => dropzoneRef.current?.open() : undefined}
      />

      {cv?.statut === "traite" && (
        <>
          <CVExtractionPanel />
          {/* Dropzone monté en headless (variant=hidden) pour que la card Status
              puisse l'ouvrir via onReplace → dropzoneRef.current.open(). */}
          <CVDropzone ref={dropzoneRef} onUploaded={() => mutate()} variant="hidden" />
        </>
      )}

      {cv?.statut === "erreur" && <CVDropzone onUploaded={() => mutate()} />}

      {isProcessing && <CVDropzone onUploaded={() => mutate()} disabled variant="compact" />}

      {error && (
        <p className="mt-5 text-sm text-destructive">
          Erreur lors du chargement du CV. Rechargez la page.
        </p>
      )}
    </div>
  );
}
