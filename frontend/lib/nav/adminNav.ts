import {
  IconLayoutDashboard,
  IconUsers,
  IconBook,
  IconSchool,
  IconCalendar,
  IconAdjustmentsHorizontal,
  IconBrain,
} from "@tabler/icons-react";
import type { NavSection } from "./types";

export const adminNav: NavSection[] = [
  {
    label: "Système",
    items: [
      { href: "/dashboard/admin", label: "Tableau de bord", icon: IconLayoutDashboard },
      { href: "/dashboard/admin/utilisateurs", label: "Utilisateurs", icon: IconUsers },
    ],
  },
  {
    label: "Données académiques",
    items: [
      { href: "/dashboard/admin/programmes", label: "Programmes", icon: IconSchool },
      { href: "/dashboard/admin/cours", label: "Cours", icon: IconBook },
      { href: "/dashboard/admin/sessions", label: "Sessions", icon: IconCalendar },
    ],
  },
  {
    label: "IA",
    items: [
      { href: "/dashboard/admin/ponderations", label: "Pondérations W1–W4", icon: IconAdjustmentsHorizontal },
      { href: "/dashboard/admin/modeles", label: "Modèles IA", icon: IconBrain, disabled: true },
    ],
  },
];
