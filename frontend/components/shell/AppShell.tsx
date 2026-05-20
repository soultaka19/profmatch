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
    <div className="flex min-h-screen bg-canvas">
      <AppSidebar navigation={navigation} homeHref={homeHref} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar breadcrumb={breadcrumb} actions={actions} />
        <main className="flex-1 overflow-auto bg-canvas-pure">
          <div className="mx-auto max-w-[960px] px-10 py-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
