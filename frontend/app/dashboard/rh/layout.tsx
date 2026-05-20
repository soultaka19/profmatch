"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { rhNav } from "@/lib/nav/rhNav";

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["rh"]}>
      <AppShell navigation={rhNav} breadcrumb="Tableau de bord" homeHref="/dashboard/rh">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
