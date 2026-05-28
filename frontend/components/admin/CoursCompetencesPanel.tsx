"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { coursCompetencesApi } from "@/lib/api/coursCompetences";
import type { CoursCompetence } from "@/lib/types/cours";
import { CompetenceAddDialog } from "./CompetenceAddDialog";
import { CompetenceRemoveDialog } from "./CompetenceRemoveDialog";

interface Props {
  coursId: number;
}

const IMPORTANCE_VALUES = ["1", "2", "3", "4", "5"];

function ImportanceBadge({ importance }: { importance: number }) {
  if (importance >= 5) return <Badge variant="destructive">Critique · {importance}</Badge>;
  if (importance >= 4) return <Badge variant="default">Importante · {importance}</Badge>;
  if (importance >= 3) return <Badge variant="secondary">Standard · {importance}</Badge>;
  return <Badge variant="outline">Faible · {importance}</Badge>;
}

export function CoursCompetencesPanel({ coursId }: Props) {
  const swrKey = `cours-comps:${coursId}`;
  const { data: items, mutate, isLoading } = useSWR<CoursCompetence[]>(
    swrKey,
    () => coursCompetencesApi.list(coursId),
  );
  const [removing, setRemoving] = useState<CoursCompetence | null>(null);

  async function updateImportance(comp: CoursCompetence, importance: number) {
    await coursCompetencesApi.update(coursId, comp.id, { importance });
    mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold text-fg">Compétences requises</h2>
        <CompetenceAddDialog coursId={coursId} onAdded={() => mutate()} />
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted">Chargement…</p>
      ) : (!items || items.length === 0) ? (
        <p className="text-sm text-fg-muted py-6 text-center border border-dashed border-border rounded-md">
          Aucune compétence définie pour ce cours.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas-pure">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Compétence</th>
                <th className="px-4 py-2 text-left">Importance</th>
                <th className="px-4 py-2 text-left">Modifier</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.nom}</td>
                  <td className="px-4 py-3"><ImportanceBadge importance={c.importance} /></td>
                  <td className="px-4 py-3">
                    <Select
                      value={String(c.importance)}
                      onValueChange={(v) => updateImportance(c, Number(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPORTANCE_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoving(c)}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CompetenceRemoveDialog
        coursId={coursId}
        competence={removing}
        onClose={() => setRemoving(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
