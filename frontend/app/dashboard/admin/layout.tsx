"use client";

import { useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { adminNav } from "@/lib/nav/adminNav";
import { useTheme } from "@/components/theme/ThemeProvider";

function AdminThemeApplier() {
  const { setThemeForRole } = useTheme();
  useEffect(() => {
    setThemeForRole("admin");
  }, [setThemeForRole]);
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminThemeApplier />
      <AppShell navigation={adminNav} breadcrumb="Tableau de bord" homeHref="/dashboard/admin">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
