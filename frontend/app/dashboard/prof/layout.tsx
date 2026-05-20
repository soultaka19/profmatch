import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/shell";
import { profNav } from "@/lib/nav/profNav";

export default function ProfLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["prof"]}>
      <AppShell navigation={profNav} breadcrumb="Mon CV" homeHref="/dashboard/prof">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
