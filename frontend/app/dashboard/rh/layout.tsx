"use client";

import { useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { rhNav } from "@/lib/nav/rhNav";
import { useTheme } from "@/components/theme/ThemeProvider";

function RhThemeApplier() {
  const { setThemeForRole } = useTheme();
  useEffect(() => {
    setThemeForRole("rh");
  }, [setThemeForRole]);
  return null;
}

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["rh"]}>
      <RhThemeApplier />
      <AppShell navigation={rhNav} breadcrumb="Tableau de bord" homeHref="/dashboard/rh">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
