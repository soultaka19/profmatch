"use client";

import { type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex h-[68px] flex-shrink-0 items-center gap-3 border-b border-border bg-canvas px-4 sm:px-6 lg:gap-6 lg:px-10">
      {onMenuClick && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          aria-controls="app-mobile-sidebar"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <div className="flex min-w-0 flex-col">
        {subtitle && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {subtitle}
          </div>
        )}
        <div className="text-base font-semibold text-fg">{breadcrumb}</div>
      </div>
      <div className="flex-1" />
      <div id="app-topbar-page-action" className="hidden items-center gap-3 sm:flex" />
      {actions}
    </div>
  );
}
