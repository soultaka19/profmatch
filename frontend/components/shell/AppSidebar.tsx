"use client";

import { toast } from "sonner";
import { IconX } from "@tabler/icons-react";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarUserCard } from "./SidebarUserCard";
import type { NavSection } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

interface Props {
  navigation: NavSection[];
  homeHref?: string;
  id?: string;
  className?: string;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function AppSidebar({
  navigation,
  homeHref = "/",
  id,
  className,
  onNavigate,
  onClose,
}: Props) {
  const handleDisabledClick = () => {
    toast.info("Cette section est en cours de développement.", {
      description: "Disponible avant la démo finale du 4 juin 2026.",
    });
  };

  return (
    <aside
      id={id}
      className={cn(
        "flex h-full w-[240px] flex-shrink-0 flex-col bg-sidebar",
        className
      )}
    >
      {/* En-tête marque */}
      <div className="flex h-[64px] flex-shrink-0 items-center justify-between border-b border-sidebar-border">
        <SidebarBrand homeHref={homeHref} />
        {onClose && (
          <button
            type="button"
            className="mr-3 flex h-8 w-8 items-center justify-center rounded-[6px] text-sidebar-fg-muted hover:bg-sidebar-item-hover hover:text-sidebar-fg lg:hidden"
            aria-label="Fermer le menu"
            onClick={onClose}
          >
            <IconX size={18} stroke={1.6} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-5 overflow-y-auto pb-4 pt-5">
        {navigation.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            {/* Label de section en petites capitales */}
            <div className="mb-1.5 px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-section-label">
              {section.label}
            </div>
            {section.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                disabled={item.disabled}
                onDisabledClick={handleDisabledClick}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <SidebarUserCard />
    </aside>
  );
}
