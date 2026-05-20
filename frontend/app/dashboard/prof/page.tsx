"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { CVDropzone } from "@/components/cv/CVDropzone";
import { CVStatusCard } from "@/components/cv/CVStatusCard";
import { CVTextPreview } from "@/components/cv/CVTextPreview";
import { useCVPolling } from "@/lib/hooks/useCVPolling";

const LEAD_BY_STATUT: Record<string, string> = {
  vide: "Téléversez votre CV. L'IA en extraira automatiquement vos compétences, expériences et formations. Vous pourrez vérifier le résultat avant qu'il ne serve à l'affectation.",
  en_attente: "Votre CV est en file d'attente. Il sera analysé dans quelques instants.",
  en_cours: "Votre CV est en cours d'analyse. Cela prend généralement quelques secondes.",
  traite:
    "Votre CV a été analysé. Vérifiez ce que l'IA a extrait avant que ces données ne servent à l'affectation des cours.",
  erreur: "Une erreur est survenue lors de l'analyse. Vous pouvez réessayer ci-dessous.",
};

export default function ProfDashboardPage() {
  const { user } = useAuth();
  const { data: cv, error, isLoading, mutate } = useCVPolling();

  const statutKey = cv?.statut ?? "vide";
  const lead = LEAD_BY_STATUT[statutKey] ?? LEAD_BY_STATUT.vide;
  const isProcessing = cv?.statut === "en_attente" || cv?.statut === "en_cours";

  return (
    <div className="max-w-3xl">
      <h1 className="font-display italic text-[40px] leading-[1.05] tracking-[-0.025em] text-fg">
        Bonjour, {user?.nom_complet ?? "Professeur"}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">{lead}</p>

      {!cv && !isLoading && <CVDropzone onUploaded={() => mutate()} />}

      <CVStatusCard data={cv} loading={isLoading && !cv} onRetry={() => mutate()} />

      {cv?.statut === "traite" && (
        <>
          <CVTextPreview />
          <CVDropzone onUploaded={() => mutate()} variant="compact" />
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
