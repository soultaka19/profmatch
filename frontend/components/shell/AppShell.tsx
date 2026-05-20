"use client";

import { type ReactNode } from "react";
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
  return (
    <div className="flex min-h-screen bg-canvas">
      <AppSidebar navigation={navigation} homeHref={homeHref} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar breadcrumb={breadcrumb} actions={topbarActions} />
        <main className="flex-1 overflow-auto px-9 py-8">{children}</main>
      </div>
    </div>
  );
}
