"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RoadmapPlaceholder } from "@/components/dashboard/RoadmapPlaceholder";
import { Sparkles, ListChecks, Users, Lightbulb } from "lucide-react";

export default function Page() {
  const { user } = useAuth();
  return (
    <RoadmapPlaceholder
      title={`Bienvenue, ${user?.nom_complet ?? "Responsable"}`}
      lead="Cet espace vous permettra de générer les propositions d'affectation, de les réviser avec leurs justifications IA, et de gérer l'historique des sessions."
      heroIcon={<Sparkles className="h-6 w-6 text-primary" />}
      heroTitle="Module en cours de développement"
      heroSub="L'algorithme d'affectation W1–W4 et la pipeline d'extraction LLM sont en cours d'intégration. Disponible avant la démo finale."
      heroEta="4 juin 2026"
      cards={[
        {
          icon: <Sparkles className="h-4 w-4 text-primary" />,
          title: "Générer affectations",
          description:
            "Lance le calcul des scores W1–W4 sur tous les profs ayant un CV traité. Top 3 par cours avec justifications IA.",
        },
        {
          icon: <ListChecks className="h-4 w-4 text-primary" />,
          title: "Historique des sessions",
          description:
            "Liste paginée des sessions d'affectation passées. Filtres par date, statut, validations RH.",
        },
        {
          icon: <Users className="h-4 w-4 text-primary" />,
          title: "CV des profs",
          description:
            "Liste des profs avec statut d'extraction, accès au texte extrait, données structurées.",
        },
        {
          icon: <Lightbulb className="h-4 w-4 text-primary" />,
          title: "Justifications XAI",
          description:
            "Chaque proposition est accompagnée d'une justification narrative en 4 critères générée par le LLM.",
        },
      ]}
    />
  );
}
