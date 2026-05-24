"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserAdmin } from "@/lib/types/api";
import { Pencil, Power, RotateCcw } from "lucide-react";

interface UsersTableProps {
  users: UserAdmin[];
  onEdit: (u: UserAdmin) => void;
  onDeactivate: (u: UserAdmin) => void;
  onRestore: (u: UserAdmin) => void;
}

const ROLE_LABEL: Record<string, string> = {
  prof: "Professeur",
  rh: "Responsable RH",
  admin: "Administrateur",
};

export function UsersTable({ users, onEdit, onDeactivate, onRestore }: UsersTableProps) {
  if (users.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">Aucun utilisateur.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Rôle</th>
            <th className="px-4 py-2 text-left">Statut</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-bg-muted/40">
              <td className="px-4 py-3 font-medium text-fg">{u.nom_complet}</td>
              <td className="px-4 py-3 text-fg-muted">{u.email}</td>
              <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
              <td className="px-4 py-3">
                <Badge variant={u.actif ? "default" : "secondary"}>
                  {u.actif ? "Actif" : "Inactif"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(u)} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                {u.actif ? (
                  <Button size="sm" variant="ghost" onClick={() => onDeactivate(u)} title="Désactiver">
                    <Power className="h-4 w-4 text-destructive" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onRestore(u)} title="Réactiver">
                    <RotateCcw className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
