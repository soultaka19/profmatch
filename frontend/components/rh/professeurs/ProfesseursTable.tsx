"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CvStatutBadge } from "./CvStatutBadge";
import type { ProfesseurListItem } from "@/lib/api/rhProfesseurs";

interface Props {
  items: ProfesseurListItem[];
  onPreview: (professeurId: number) => void;
}

export function ProfesseursTable({ items, onPreview }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-canvas-pure shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-soft text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
          <tr>
            <th className="px-5 py-3">Nom</th>
            <th className="px-5 py-3">Courriel</th>
            <th className="px-5 py-3">Statut CV</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.professeur_id} className="border-b border-border-soft/60 last:border-0">
              <td className="px-5 py-3 font-medium text-fg">{p.nom_complet}</td>
              <td className="px-5 py-3 text-fg-muted">{p.email}</td>
              <td className="px-5 py-3">
                <CvStatutBadge statut={p.cv_statut} />
              </td>
              <td className="px-5 py-3 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(p.professeur_id)}
                  aria-label={`Prévisualiser le CV de ${p.nom_complet}`}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Prévisualiser le CV
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
