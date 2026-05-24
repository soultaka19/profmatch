"use client";

import { useState } from "react";
import useSWR from "swr";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserCreateDialog } from "@/components/admin/UserCreateDialog";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserToggleActifDialog } from "@/components/admin/UserToggleActifDialog";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin } from "@/lib/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Filter = "all" | "actifs" | "inactifs";

export default function Page() {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [toggling, setToggling] = useState<{
    user: UserAdmin;
    mode: "deactivate" | "restore";
  } | null>(null);

  const swrKey = `users:${filter}`;
  const { data: users, mutate, isLoading } = useSWR<UserAdmin[]>(swrKey, () => {
    if (filter === "actifs") return usersApi.list(true);
    if (filter === "inactifs") return usersApi.list(false);
    return usersApi.list();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Utilisateurs</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Gestion des comptes professeurs, RH et administrateurs.
          </p>
        </div>
        <UserCreateDialog onCreated={() => mutate()} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-fg-muted">Filtrer :</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="actifs">Actifs seulement</SelectItem>
            <SelectItem value="inactifs">Inactifs seulement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>
      ) : (
        <UsersTable
          users={users ?? []}
          onEdit={setEditing}
          onDeactivate={(u) => setToggling({ user: u, mode: "deactivate" })}
          onRestore={(u) => setToggling({ user: u, mode: "restore" })}
        />
      )}

      <UserEditDialog
        user={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => mutate()}
      />
      <UserToggleActifDialog
        user={toggling?.user ?? null}
        mode={toggling?.mode ?? "deactivate"}
        onClose={() => setToggling(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
