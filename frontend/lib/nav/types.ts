import type React from "react";

/**
 * Type d'icône générique — compatible Lucide React ET @tabler/icons-react.
 * On n'exige que `className` et `size` pour éviter les conflits de type
 * entre les deux bibliothèques (stroke?: string vs stroke?: number).
 */
export type NavIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
}>;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  disabled?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}
