"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/types/api";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(`/dashboard/${user.role}`);
    }
  }, [user, isLoading, allowedRoles, router]);

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
