"use client";

import { Loader2 } from "lucide-react";
import { useExtraction } from "@/lib/hooks/useExtraction";
import { CVTextPreview } from "@/components/cv/CVTextPreview";
import { ProfilSection } from "./ProfilSection";
import { CompetenceSection } from "./CompetenceSection";
import { ExperienceSection } from "./ExperienceSection";
import { FormationSection } from "./FormationSection";
import { LangueSection } from "./LangueSection";

export function CVExtractionPanel() {
  const { data, isLoading, error, mutate } = useExtraction();

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-xs italic text-fg-subtle">Chargement de votre dossier…</p>
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
    <div className="mt-2">
      <ProfilSection profil={data.profil} onMutate={mutate} />
      <CompetenceSection items={data.competences} onMutate={mutate} />
      <ExperienceSection items={data.experiences} onMutate={mutate} />
      <FormationSection items={data.formations} onMutate={mutate} />
      <LangueSection items={data.langues} onMutate={mutate} />

      <div className="mt-6">
        <CVTextPreview />
      </div>
    </div>
  );
}
