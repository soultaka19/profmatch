"use client";

import { RoadmapPlaceholder } from "@/components/dashboard/RoadmapPlaceholder";
import { UserCog, BookOpen, Calendar, Scale } from "lucide-react";

export default function Page() {
  return (
    <RoadmapPlaceholder
      title="Espace administrateur"
      lead="Cet espace réunira la configuration globale du système : utilisateurs, catalogue de cours, sessions académiques et les pondérations de l'algorithme d'affectation."
      heroIcon={<Scale className="h-6 w-6 text-primary" />}
      heroTitle="Module en cours de développement"
      heroSub="La configuration académique et le réglage des pondérations W1–W4 sont en cours d'implémentation."
      heroEta="4 juin 2026"
      cards={[
        {
          icon: <UserCog className="h-4 w-4 text-primary" />,
          title: "Utilisateurs",
          description: "Création / activation des comptes prof, rh, admin. Hashage bcrypt 12 rounds.",
        },
        {
          icon: <BookOpen className="h-4 w-4 text-primary" />,
          title: "Cours & programmes",
          description: "CRUD du catalogue : sigle, titre, programme, charge horaire, prérequis.",
        },
        {
          icon: <Calendar className="h-4 w-4 text-primary" />,
          title: "Sessions",
          description: "Sessions d'affectation : Automne 2026, Hiver 2027, etc. Statut ouverte / clôturée.",
        },
        {
          icon: <Scale className="h-4 w-4 text-primary" />,
          title: "Pondérations W1–W4",
          description: "Sliders pour ajuster les poids du scoring composite. Recalcul temps réel sur le top 3.",
        },
      ]}
    />
  );
}
