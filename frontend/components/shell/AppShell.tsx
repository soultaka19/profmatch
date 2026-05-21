"use client";

import { type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import type { NavSection } from "@/lib/nav/types";

interface Props {
  navigation: NavSection[];
  breadcrumb: string;
  homeHref?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ navigation, breadcrumb, homeHref, topbarActions, children }: Props) {
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
      <AppSidebar navigation={navigation} homeHref={homeHref} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar breadcrumb={breadcrumb} actions={actions} />
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-[960px] px-10 py-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
