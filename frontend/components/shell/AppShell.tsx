"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import type { NavSection } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

export type ContentWidth = "focused" | "standard" | "wide";

interface Props {
  navigation: NavSection[];
  breadcrumb: string;
  sectionLabel?: string;
  contentWidth?: ContentWidth;
  homeHref?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
}

const WIDTH_CLASSES: Record<ContentWidth, string> = {
  focused: "max-w-[760px]",
  standard: "max-w-[1120px]",
  wide: "max-w-[1360px]",
};

export function AppShell({
  navigation,
  breadcrumb,
  sectionLabel,
  contentWidth,
  homeHref,
  topbarActions,
  children,
}: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      } catch {
        // localStorage indisponible (mode privé) : on garde l'état en mémoire.
      }
      return next;
    });
  };

  const activeBreadcrumb = useMemo(() => {
    for (const section of navigation) {
      const activeItem = section.items.find(
        (item) => !item.disabled && item.href === pathname
      );
      if (activeItem) return activeItem.label;
    }
    return breadcrumb;
  }, [breadcrumb, navigation, pathname]);
  const resolvedWidth =
    contentWidth ??
    (pathname.includes("/affectations") || pathname.includes("/historique") ? "wide" : "standard");
  // Largeur partagée topbar + contenu : alignement des bords sur tous les écrans.
  // Repliée → pas de plafond (le contenu s'étire pour remplir l'espace libéré).
  const contentMaxWidth = collapsed ? "max-w-none" : WIDTH_CLASSES[resolvedWidth];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const actions = (
    <div className="flex items-center gap-3">
      {topbarActions}
      <ThemeSwitcher />
    </div>
  );

  // `fixed inset-0` sort l'AppShell du flow du body (aucun scroll global).
  // La topbar vit DANS le conteneur scrollable (<main>) en `sticky top-0` :
  // ainsi topbar et contenu partagent la même largeur (gouttière de scrollbar
  // comprise) et restent alignés, scrollbar présente ou non.
  return (
    // Colonne : le bandeau de démonstration prend sa propre rangée au-dessus
    // de tout, et la rangée du dessous occupe exactement ce qui reste. Hors
    // démonstration le bandeau ne rend rien et la mise en page est inchangée.
    <div className="fixed inset-0 flex flex-col bg-canvas">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
      <AppSidebar
        navigation={navigation}
        homeHref={homeHref}
        className="hidden lg:flex"
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            className="h-full w-[260px]"
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
      <main className="min-w-0 flex-1 overflow-y-auto bg-canvas [scrollbar-gutter:stable]">
        <AppTopbar
          breadcrumb={activeBreadcrumb}
          subtitle={sectionLabel}
          actions={actions}
          menuOpen={mobileMenuOpen}
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
          maxWidthClass={contentMaxWidth}
        />
        <div className={cn("mx-auto p-6 sm:p-8 lg:p-16 lg:pt-12", contentMaxWidth)}>
          {children}
        </div>
      </main>
      </div>
    </div>
  );
}
