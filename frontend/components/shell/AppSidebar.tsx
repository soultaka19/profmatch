"use client";

import { toast } from "sonner";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarUserCard } from "./SidebarUserCard";
import type { NavSection } from "@/lib/nav/types";

interface Props {
  navigation: NavSection[];
  homeHref?: string;
}

export function AppSidebar({ navigation, homeHref = "/" }: Props) {
  const handleDisabledClick = () => {
    toast.info("Cette section est en cours de développement.", {
      description: "Disponible avant la démo finale du 4 juin 2026.",
    });
  };

  return (
    <aside className="flex w-[260px] flex-shrink-0 flex-col border-r border-border-soft bg-surface">
      <div className="flex flex-col gap-7 pb-6 pt-6">
        <SidebarBrand homeHref={homeHref} />

        {navigation.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <div className="mb-2 pl-6 text-eyebrow font-semibold uppercase text-primary">
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
