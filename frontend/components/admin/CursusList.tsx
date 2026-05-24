"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { cursusApi } from "@/lib/api/cursus";
import type {
  CategorieCours,
  CoursReadOnly,
  CursusItem,
} from "@/lib/types/programmes";
import { CATEGORIE_LABEL } from "@/lib/types/programmes";
import { CursusAddDialog } from "./CursusAddDialog";
import { CursusRemoveDialog } from "./CursusRemoveDialog";

interface Props {
  programmeId: number;
  etapeId: number;
  onChanged: () => void;
}

function CategorieBadge({ c }: { c: CategorieCours }) {
  if (c === "obligatoire") return <Badge variant="default">{CATEGORIE_LABEL[c]}</Badge>;
  if (c === "choix_francais") return <Badge variant="secondary">{CATEGORIE_LABEL[c]}</Badge>;
  return <Badge variant="outline">{CATEGORIE_LABEL[c]}</Badge>;
}

export function CursusList({ programmeId, etapeId, onChanged }: Props) {
  const swrKey = `cursus:${programmeId}:${etapeId}`;
  const { data: items, mutate, isLoading } = useSWR<CursusItem[]>(
    swrKey,
    () => cursusApi.list(programmeId, etapeId),
  );
  const [coursCache, setCoursCache] = useState<Record<number, CoursReadOnly>>({});
  const [removing, setRemoving] = useState<
    { cursus: CursusItem; cours: CoursReadOnly | null } | null
  >(null);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const missing = items
      .map((i) => i.cours_id)
      .filter((id) => !(id in coursCache));
    if (missing.length === 0) return;
    coursApi.list().then((all) => {
      const map: Record<number, CoursReadOnly> = { ...coursCache };
      for (const c of all) map[c.id] = c;
      setCoursCache(map);
    });
  }, [items, coursCache]);

  function refresh() {
    mutate();
    onChanged();
  }

  if (isLoading) return <p className="text-sm text-fg-muted">Chargement…</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CursusAddDialog
          programmeId={programmeId}
          etapeId={etapeId}
          onAdded={refresh}
        />
      </div>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-fg-muted py-4 text-center border border-dashed border-border rounded-md">
          Aucun cours rattaché à cette étape.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-2 py-1 text-left">Code</th>
              <th className="px-2 py-1 text-left">Nom</th>
              <th className="px-2 py-1 text-left">Catégorie</th>
              <th className="px-2 py-1 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => {
              const c = coursCache[it.cours_id];
              return (
                <tr key={it.id}>
                  <td className="px-2 py-2 font-mono">{c?.code ?? "…"}</td>
                  <td className="px-2 py-2">{c?.nom ?? `Cours #${it.cours_id}`}</td>
                  <td className="px-2 py-2"><CategorieBadge c={it.categorie} /></td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoving({ cursus: it, cours: c ?? null })}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <CursusRemoveDialog
        programmeId={programmeId}
        etapeId={etapeId}
        item={removing}
        onClose={() => setRemoving(null)}
        onDone={refresh}
      />
    </div>
  );
}
