"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useExtraction } from "@/lib/hooks/useExtraction";
import { CVTextPreview } from "@/components/cv/CVTextPreview";
import { Reveal } from "@/components/motion/Reveal";
import { ProfilHeaderCard } from "./ProfilHeaderCard";
import { ProfilCompletion } from "./ProfilCompletion";
import { ProfilSection } from "./ProfilSection";
import { CompetenceSection } from "./CompetenceSection";
import { ExperienceSection } from "./ExperienceSection";
import { FormationSection } from "./FormationSection";
import { LangueSection } from "./LangueSection";

export function CVExtractionPanel() {
  const { data, isLoading, error, mutate } = useExtraction();
  const { user } = useAuth();

  if (isLoading) {
    // Skeleton plutôt qu'un spinner centré : le CV est déjà « analysé », le
    // contenu du dossier arrive — on évite une impression de contradiction.
    return (
      <div className="mt-6 space-y-4" role="status" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-border bg-canvas-pure" />
        <div className="h-16 animate-pulse rounded-lg border border-border bg-canvas-pure" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-border bg-canvas-pure"
          />
        ))}
        <span className="sr-only">Chargement de votre dossier…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="mt-8 text-sm text-destructive">
        Impossible de charger les données extraites. Rechargez la page.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {user && (
        <Reveal>
          <ProfilHeaderCard nomComplet={user.nom_complet ?? ""} email={user.email} />
        </Reveal>
      )}
      <Reveal delayMs={60}>
        <ProfilCompletion data={data} />
      </Reveal>
      <Reveal delayMs={120}>
        <ProfilSection profil={data.profil} onMutate={mutate} />
      </Reveal>
      <Reveal delayMs={180}>
        <CompetenceSection items={data.competences} onMutate={mutate} />
      </Reveal>
      <Reveal delayMs={240}>
        <ExperienceSection items={data.experiences} onMutate={mutate} />
      </Reveal>
      <Reveal delayMs={300}>
        <FormationSection items={data.formations} onMutate={mutate} />
      </Reveal>
      <Reveal delayMs={360}>
        <LangueSection items={data.langues} onMutate={mutate} />
      </Reveal>

      <Reveal delayMs={420} className="mt-6">
        <CVTextPreview />
      </Reveal>
    </div>
  );
}
