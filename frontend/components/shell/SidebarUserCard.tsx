"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

function initial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function SidebarUserCard() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 border-t border-border-surface bg-surface px-7 py-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {initial(user.nom_complet)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-fg">{user.nom_complet ?? user.email}</span>
        <span className="truncate text-xs text-fg-subtle">{user.email}</span>
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        onClick={logout}
      >
        <LogOut className="h-4 w-4 text-fg-muted" />
      </Button>
    </div>
  );
}
