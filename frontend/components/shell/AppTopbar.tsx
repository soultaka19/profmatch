"use client";

import { type ReactNode } from "react";
import { IconMenu2 } from "@tabler/icons-react";

interface Props {
  breadcrumb: string;
  subtitle?: string;
  actions?: ReactNode;
  menuOpen?: boolean;
  onMenuClick?: () => void;
}

export function AppTopbar({
  breadcrumb,
  subtitle,
  actions,
  menuOpen = false,
  onMenuClick,
}: Props) {
  return (
    <div className="flex h-[64px] flex-shrink-0 items-center gap-3 border-b border-border bg-canvas px-4 sm:px-6 lg:gap-6 lg:px-10">
      {onMenuClick && (
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          aria-controls="app-mobile-sidebar"
          onClick={onMenuClick}
        >
          <IconMenu2 size={20} stroke={1.6} />
        </button>
      )}
      <div className="flex min-w-0 flex-col">
        <div className="text-[15px] font-semibold text-fg">{breadcrumb}</div>
        {subtitle && <div className="text-xs text-fg-subtle">{subtitle}</div>}
      </div>
      <div className="flex-1" />
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
