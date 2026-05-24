import { Home, UserCog, BookOpen, Calendar, Scale } from "lucide-react";
import type { NavSection } from "./types";

export const adminNav: NavSection[] = [
  {
    label: "Administration",
    items: [
      { href: "/dashboard/admin", label: "Tableau de bord", icon: Home },
      { href: "/dashboard/admin/utilisateurs", label: "Utilisateurs", icon: UserCog },
      { href: "/dashboard/admin/programmes", label: "Programmes", icon: BookOpen },
      { href: "/dashboard/admin/sessions", label: "Sessions", icon: Calendar, disabled: true },
      { href: "/dashboard/admin/ponderations", label: "Pondérations W1–W4", icon: Scale, disabled: true },
    ],
  },
];
