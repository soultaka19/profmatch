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
    <aside className="flex w-[230px] flex-shrink-0 flex-col gap-5 border-r border-border-soft bg-surface px-3.5 py-4">
      <SidebarBrand homeHref={homeHref} />

      {navigation.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          <div className="mb-1 px-2 text-eyebrow font-semibold uppercase text-primary">
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

      <div className="flex-1" />

      <SidebarUserCard />
    </aside>
  );
}
