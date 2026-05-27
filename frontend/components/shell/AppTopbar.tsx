"use client";

import { type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  breadcrumb: string;
  subtitle?: string;
  actions?: ReactNode;
  menuOpen?: boolean;
  onMenuClick?: () => void;
  /** Même plafond de largeur que le contenu, pour aligner les bords sur tous les écrans. */
  maxWidthClass?: string;
}

export function AppTopbar({
  breadcrumb,
  subtitle,
  actions,
  menuOpen = false,
  onMenuClick,
  maxWidthClass,
}: Props) {
  return (
    <header className="h-[68px] flex-shrink-0 border-b border-border bg-canvas">
      <div
        className={cn(
          "mx-auto flex h-full items-center gap-3 px-6 sm:px-8 lg:gap-6 lg:px-16",
          maxWidthClass
        )}
      >
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
        {actions}
      </div>
    </header>
  );
}
