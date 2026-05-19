import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ProfLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["prof"]}>{children}</ProtectedRoute>;
}
