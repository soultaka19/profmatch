import { Home, Sparkles, ListChecks, Users } from "lucide-react";
import type { NavSection } from "./types";

export const rhNav: NavSection[] = [
  {
    label: "Ressources humaines",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: Home },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: Sparkles, disabled: true },
      { href: "/dashboard/rh/historique", label: "Historique", icon: ListChecks, disabled: true },
      { href: "/dashboard/rh/cv", label: "CV des profs", icon: Users, disabled: true },
    ],
  },
];
