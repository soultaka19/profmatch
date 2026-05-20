"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { CVDropzone } from "@/components/cv/CVDropzone";
import { CVStatusCard } from "@/components/cv/CVStatusCard";
import { CVTextPreview } from "@/components/cv/CVTextPreview";
import { useCVPolling } from "@/lib/hooks/useCVPolling";

export default function ProfDashboardPage() {
  const { user } = useAuth();
  const { data: cv, error, isLoading, mutate } = useCVPolling();

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">
        Bonjour {user?.nom_complet ?? "Professeur"}
      </h1>

      <p className="text-muted-foreground">
        Téléversez votre CV pour permettre à l&apos;IA d&apos;extraire automatiquement vos
        compétences et expériences. Vous pourrez vérifier ce que l&apos;IA a lu avant
        qu&apos;il ne serve à l&apos;affectation.
      </p>

      <CVDropzone
        onUploaded={() => mutate()}
        disabled={cv?.statut === "en_cours"}
      />

      <CVStatusCard data={cv} loading={isLoading && !cv} />

      {cv?.statut === "traite" && <CVTextPreview />}

      {error && (
        <p className="text-sm text-destructive">
          Erreur lors du chargement du CV. Rechargez la page.
        </p>
      )}
    </div>
  );
}
