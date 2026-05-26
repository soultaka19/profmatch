"use client";

import { IconLogout, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  prof: "Professeur",
  rh: "Responsable RH",
  admin: "Administrateur",
};

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
      className="group flex w-full items-center gap-3 border-t border-sidebar-border bg-transparent px-4 py-4 text-left outline-none transition-colors hover:bg-sidebar-item-hover focus-visible:bg-sidebar-item-hover"
    >
      {/* Avatar initiales */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold text-white">
        {initials(user.nom_complet)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-sidebar-fg">
          {user.nom_complet ?? user.email}
        </span>
        <span className="truncate text-[11px] text-sidebar-fg-muted">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </span>
      {hover ? (
        <IconLogout className="h-4 w-4 flex-shrink-0 text-sidebar-fg-muted" size={16} stroke={1.6} />
      ) : (
        <IconChevronRight className="h-4 w-4 flex-shrink-0 text-sidebar-fg-muted/50" size={16} stroke={1.6} />
      )}
    </button>
  );
}
