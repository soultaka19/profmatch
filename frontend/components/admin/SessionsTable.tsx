"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/types/api";
import { ArrowRight, Trash2 } from "lucide-react";
import { SessionStatutBadge } from "./SessionStatutBadge";

interface Props {
  sessions: Session[];
  onDelete: (s: Session) => void;
}

export function SessionsTable({ sessions, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-fg-muted py-8 text-center">
        Aucune session. Créez-en une avec « Nouvelle session ».
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas-pure">
      <table className="w-full text-sm">
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
            <tr key={s.id} className="hover:bg-surface/60">
              <td className="px-4 py-3 font-medium text-fg">{s.nom}</td>
              <td className="px-4 py-3 text-fg-muted">{s.annee}</td>
              <td className="px-4 py-3">
                <SessionStatutBadge statut={s.statut} />
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                <Link href={`/dashboard/admin/sessions/${s.id}`}>
                  <Button size="sm" variant="ghost" title="Ouvrir">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(s)}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
