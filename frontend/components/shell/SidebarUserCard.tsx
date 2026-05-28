"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function SidebarUserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  if (!user) return null;

  async function handleLogout() {
    const ok = await confirm({
      title: "Se déconnecter ?",
      description: "Vous allez être déconnecté de votre session. Toute progression non sauvegardée sera perdue.",
      confirmLabel: "Se déconnecter",
      cancelLabel: "Annuler",
    });
    if (ok) logout();
  }

  return (
    <div
      className={cn(
        "flex border-t border-border-surface bg-surface py-4",
        collapsed ? "flex-col items-center gap-2 px-2" : "items-center gap-3 px-7"
      )}
    >
      <span
        title={collapsed ? (user.nom_complet ?? user.email) : undefined}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {initial(user.nom_complet)}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-fg">{user.nom_complet ?? user.email}</span>
          <span className="truncate text-xs text-fg-subtle">{user.email}</span>
        </span>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 text-fg-muted" />
      </Button>
    </div>
  );
}
