"use client";

import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/types/api";
import { ArrowRight, Trash2 } from "lucide-react";
import { SessionStatutBadge } from "./SessionStatutBadge";
import { AdminTableShell } from "./AdminDataTable";

interface Props {
  sessions: Session[];
  onOpen: (s: Session) => void;
  onDelete: (s: Session) => void;
}

export function SessionsTable({ sessions, onOpen, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-fg-muted py-8 text-center">
        Aucune session. Créez-en une avec « Nouvelle session ».
      </p>
    );
  }
  return (
    <AdminTableShell>
      <table aria-label="Sessions académiques" className="min-w-[600px] w-full text-sm">
        <thead className="bg-surface text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Session</th>
            <th className="px-4 py-2 text-left">Année</th>
            <th className="px-4 py-2 text-left">Statut</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-surface-hover">
              <td className="px-4 py-3 font-medium text-fg">{s.nom}</td>
              <td className="px-4 py-3 text-fg-muted">{s.annee}</td>
              <td className="px-4 py-3">
                <SessionStatutBadge statut={s.statut} />
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => onOpen(s)} title="Ouvrir" aria-label={`Ouvrir ${s.nom}`}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(s)}
                  title="Supprimer"
                  aria-label={`Supprimer ${s.nom}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableShell>
  );
}
