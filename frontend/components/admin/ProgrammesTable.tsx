"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Programme } from "@/lib/types/api";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import { SemestresAdmissionBadges } from "./SemestresAdmissionBadges";

interface Props {
  programmes: Programme[];
  onEdit: (p: Programme) => void;
  onDelete: (p: Programme) => void;
}

export function ProgrammesTable({ programmes, onEdit, onDelete }: Props) {
  if (programmes.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">Aucun programme.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Code</th>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Département</th>
            <th className="px-4 py-2 text-left">Admission</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {programmes.map((p) => (
            <tr key={p.id} className="hover:bg-bg-muted/40">
              <td className="px-4 py-3 font-mono">{p.code}</td>
              <td className="px-4 py-3 font-medium text-fg">{p.nom}</td>
              <td className="px-4 py-3 text-fg-muted">{p.departement ?? "—"}</td>
              <td className="px-4 py-3">
                <SemestresAdmissionBadges semestres={p.semestres_admission} />
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                <Link href={`/dashboard/admin/programmes/${p.id}`}>
                  <Button size="sm" variant="ghost" title="Ouvrir">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onEdit(p)} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p)} title="Supprimer">
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
