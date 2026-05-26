"use client";

import { useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { profNav } from "@/lib/nav/profNav";
import { useTheme } from "@/components/theme/ThemeProvider";

function ProfThemeApplier() {
  const { setThemeForRole } = useTheme();
  useEffect(() => {
    setThemeForRole("prof");
  }, [setThemeForRole]);
  return null;
}

export default function ProfLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["prof"]}>
      <ProfThemeApplier />
      <AppShell navigation={profNav} breadcrumb="Mon CV" homeHref="/dashboard/prof">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
