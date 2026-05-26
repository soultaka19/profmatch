import {
  IconLayoutDashboard,
  IconWand,
  IconClipboardList,
  IconUsers,
} from "@tabler/icons-react";
import type { NavSection } from "./types";

export const rhNav: NavSection[] = [
  {
    label: "Affectations",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: IconLayoutDashboard },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: IconWand },
      { href: "/dashboard/rh/historique", label: "Historique", icon: IconClipboardList },
    ],
  },
  {
    label: "Données",
    items: [
      { href: "/dashboard/rh/cv", label: "CV des profs", icon: IconUsers, disabled: true },
    ],
  },
];
