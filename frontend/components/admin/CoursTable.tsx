"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import type { CoursReadOnly } from "@/lib/types/programmes";
import { AdminTableShell } from "./AdminDataTable";

interface Props {
  cours: CoursReadOnly[];
  onEdit: (c: CoursReadOnly) => void;
  onDelete: (c: CoursReadOnly) => void;
}

export function CoursTable({ cours, onEdit, onDelete }: Props) {
  if (cours.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">Aucun cours.</p>;
  }
  return (
    <AdminTableShell>
      <table aria-label="Cours" className="min-w-[680px] w-full text-sm">
        <thead className="bg-surface text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Code</th>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Crédits</th>
            <th className="px-4 py-2 text-left">Heures</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cours.map((c) => (
            <tr key={c.id} className="hover:bg-surface-hover">
              <td className="px-4 py-3 font-mono">{c.code}</td>
              <td className="px-4 py-3 font-medium text-fg">{c.nom}</td>
              <td className="px-4 py-3 text-fg-muted">{c.credits ?? "—"}</td>
              <td className="px-4 py-3 text-fg-muted">{c.heures ?? "—"}</td>
              <td className="px-4 py-3 text-right space-x-1">
                <Link href={`/dashboard/admin/cours/${c.id}`}>
                  <Button size="sm" variant="ghost" title="Ouvrir" aria-label={`Ouvrir ${c.nom}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onEdit(c)} title="Modifier" aria-label={`Modifier ${c.nom}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(c)} title="Supprimer" aria-label={`Supprimer ${c.nom}`}>
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
