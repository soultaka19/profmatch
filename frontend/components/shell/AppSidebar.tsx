"use client";

import { toast } from "sonner";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function AppSidebar({
  navigation,
  homeHref = "/",
  id,
  className,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  onClose,
}: Props) {
  const handleDisabledClick = () => {
    toast.info("Cette section est bientôt disponible.", {
      description: "Elle sera accessible dans une prochaine version.",
    });
  };

  return (
    <aside
      id={id}
      className={cn(
        "flex h-full flex-shrink-0 flex-col border-r border-border-surface bg-surface transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      <div
        className={cn(
          "flex min-h-[68px] flex-shrink-0 items-center border-b border-border-surface",
          collapsed ? "justify-center" : "flex-row"
        )}
      >
        {!collapsed && <SidebarBrand homeHref={homeHref} />}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
            aria-expanded={!collapsed}
            className={cn(
              "inline-flex items-center justify-center rounded-md p-1.5 text-fg-muted transition-colors hover:bg-primary-soft hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !collapsed && "ml-auto mr-3"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}
        {onClose && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="mr-3 lg:hidden"
            aria-label="Fermer le menu"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-7 overflow-y-auto pb-6 pt-6">
        {navigation.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            {!collapsed && (
              <div className="mb-2 pl-7 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                {section.label}
              </div>
            )}
            {section.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                disabled={item.disabled}
                collapsed={collapsed}
                onDisabledClick={handleDisabledClick}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <SidebarUserCard collapsed={collapsed} />
    </aside>
  );
}
