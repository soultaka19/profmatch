import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["rh"]}>{children}</ProtectedRoute>;
}
