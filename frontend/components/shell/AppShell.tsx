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

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <div className="sticky top-0 h-screen flex-shrink-0">
        <AppSidebar navigation={navigation} homeHref={homeHref} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10">
          <AppTopbar breadcrumb={breadcrumb} actions={actions} />
        </div>
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-[960px] px-10 py-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
