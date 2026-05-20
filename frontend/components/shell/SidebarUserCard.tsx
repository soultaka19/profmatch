"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

function initial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function SidebarUserCard() {
  const { user, logout } = useAuth();
  const [hover, setHover] = useState(false);
  if (!user) return null;

  return (
    <button
      type="button"
      onClick={logout}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Se déconnecter"
      className="group flex w-full items-center gap-3 border-t border-border-surface bg-surface px-6 py-4 text-left outline-none transition-colors hover:bg-primary-soft focus-visible:bg-primary-soft"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {initial(user.nom_complet)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-fg">{user.nom_complet ?? user.email}</span>
        <span className="truncate text-xs text-fg-subtle">{user.email}</span>
      </span>
      {hover ? (
        <LogOut className="h-4 w-4 flex-shrink-0 text-primary" />
      ) : (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-fg-subtle" />
      )}
    </button>
  );
}
