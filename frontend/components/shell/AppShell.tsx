"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
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
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          breadcrumb={activeBreadcrumb}
          subtitle={sectionLabel}
          actions={actions}
          menuOpen={mobileMenuOpen}
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
        />
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className={cn("mx-auto px-5 py-10 sm:px-8 lg:pl-16 lg:pr-12 lg:py-12", WIDTH_CLASSES[resolvedWidth])}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
