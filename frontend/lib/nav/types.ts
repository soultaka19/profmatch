import type React from "react";

/** Type d'icône générique — compatible Lucide React ET @tabler/icons-react. */
export type NavIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
  stroke?: number;
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
