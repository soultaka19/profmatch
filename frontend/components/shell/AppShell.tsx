"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import type { NavSection } from "@/lib/nav/types";

interface Props {
  navigation: NavSection[];
  breadcrumb: string;
  homeHref?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ navigation, breadcrumb, homeHref, topbarActions, children }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeBreadcrumb = useMemo(() => {
    for (const section of navigation) {
      const activeItem = section.items.find(
        (item) => !item.disabled && item.href === pathname
      );
      if (activeItem) return activeItem.label;
    }
    return breadcrumb;
  }, [breadcrumb, navigation, pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  // `fixed inset-0` sort l'AppShell du flow du body : le body n'a plus
  // de contenu mesurable, donc aucun scroll global possible. Seul <main>
  // scrolle. Sidebar et topbar sont garantis fixes sans recours à sticky.
  return (
    <div className="fixed inset-0 flex bg-canvas">
      <AppSidebar
        navigation={navigation}
        homeHref={homeHref}
        className="hidden lg:flex"
      />
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            className="h-full w-[240px]"
            onClick={(event) => event.stopPropagation()}
          >
            <AppSidebar
              navigation={navigation}
              homeHref={homeHref}
              id="app-mobile-sidebar"
              className="shadow-lift"
              onNavigate={() => setMobileMenuOpen(false)}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          breadcrumb={activeBreadcrumb}
          actions={topbarActions}
          menuOpen={mobileMenuOpen}
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
        />
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
