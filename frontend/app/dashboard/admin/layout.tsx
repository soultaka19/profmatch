import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { adminNav } from "@/lib/nav/adminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell navigation={adminNav} breadcrumb="Tableau de bord" homeHref="/dashboard/admin">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
