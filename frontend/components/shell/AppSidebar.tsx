"use client";

import { toast } from "sonner";
import { X } from "lucide-react";
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
        "flex h-full w-[260px] flex-shrink-0 flex-col border-r border-border-surface bg-surface",
        className
      )}
    >
      <div className="flex h-[68px] flex-shrink-0 items-center border-b border-border-surface">
        <SidebarBrand homeHref={homeHref} />
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
            <div className="mb-2 pl-6 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
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
