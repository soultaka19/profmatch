"use client";

import { useAuth } from "@/components/auth/AuthProvider";

function initial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function SidebarUserCard() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <button
      type="button"
      onClick={logout}
      title="Se déconnecter"
      className="flex items-center gap-2.5 rounded-lg border border-border bg-canvas px-2.5 py-2 text-left outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
        {initial(user.nom_complet)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs font-medium text-fg">{user.nom_complet ?? user.email}</span>
        <span className="truncate text-[10px] text-fg-subtle">{user.email}</span>
      </span>
    </button>
  );
}
