import {
  IconFileText,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";
import type { NavSection } from "./types";

export const profNav: NavSection[] = [
  {
    label: "Mon espace",
    items: [
      { href: "/dashboard/prof", label: "Mon CV", icon: IconFileText },
      { href: "/dashboard/prof/affectations", label: "Mes affectations", icon: IconSparkles },
    ],
  },
  {
    label: "Compte",
    items: [
      { href: "/dashboard/prof/profil", label: "Mon profil", icon: IconUser, disabled: true },
    ],
  },
];
