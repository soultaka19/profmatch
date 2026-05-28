"use client";

import { useState } from "react";
import useSWR from "swr";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserCreateDialog } from "@/components/admin/UserCreateDialog";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserToggleActifDialog } from "@/components/admin/UserToggleActifDialog";
import { UserResetPasswordDialog } from "@/components/admin/UserResetPasswordDialog";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin } from "@/lib/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminTableEmpty, AdminTableLoading, AdminTableToolbar } from "@/components/admin/AdminDataTable";

type Filter = "all" | "actifs" | "inactifs";

export default function Page() {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [toggling, setToggling] = useState<{
    user: UserAdmin;
    mode: "deactivate" | "restore";
  } | null>(null);
  const [resetting, setResetting] = useState<UserAdmin | null>(null);

  const swrKey = `users:${filter}`;
  const { data: users, mutate, isLoading } = useSWR<UserAdmin[]>(swrKey, () => {
    if (filter === "actifs") return usersApi.list(true);
    if (filter === "inactifs") return usersApi.list(false);
    return usersApi.list();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Utilisateurs</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Gestion des comptes professeurs et responsables RH. Chaque nouvel utilisateur reçoit un lien d&apos;activation pour définir son mot de passe.
          </p>
        </div>
        <UserCreateDialog onCreated={() => mutate()} />
      </div>

      <AdminTableToolbar countLabel={`${users?.length ?? 0} utilisateur${users?.length === 1 ? "" : "s"}`}>
        <span className="text-sm text-fg-muted">Statut</span>
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
      </AdminTableToolbar>

      {isLoading ? (
        <AdminTableLoading />
      ) : !users?.length ? (
        <AdminTableEmpty title="Aucun utilisateur" description="Aucun compte ne correspond au filtre sélectionné." />
      ) : (
        <UsersTable
          users={users}
          onEdit={setEditing}
          onDeactivate={(u) => setToggling({ user: u, mode: "deactivate" })}
          onRestore={(u) => setToggling({ user: u, mode: "restore" })}
          onResetPassword={setResetting}
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
      <UserResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
