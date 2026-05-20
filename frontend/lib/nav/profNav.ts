import { FileText, Sparkles, User } from "lucide-react";
import type { NavSection } from "./types";

export const profNav: NavSection[] = [
  {
    label: "Espace prof",
    items: [
      { href: "/dashboard/prof", label: "Mon CV", icon: FileText },
      { href: "/dashboard/prof/affectations", label: "Mes affectations", icon: Sparkles, disabled: true },
      { href: "/dashboard/prof/profil", label: "Mon profil", icon: User, disabled: true },
    ],
  },
];
