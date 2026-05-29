"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { coursApi } from "@/lib/api/cours";
import type { Cours } from "@/lib/types/cours";
import { CoursEditDialog } from "@/components/admin/CoursEditDialog";
import { CoursCompetencesPanel } from "@/components/admin/CoursCompetencesPanel";

interface Props {
  coursId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function CoursDetailDrawer({ coursId, open, onOpenChange, onChanged }: Props) {
  const { data: cours, error, isLoading, mutate } = useSWR<Cours>(
    open && coursId !== null ? `cours:${coursId}` : null,
    () => coursApi.get(coursId as number),
  );
  const [editing, setEditing] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-7">
        <SheetHeader>
          <SheetTitle>{cours?.nom ?? "Détail du cours"}</SheetTitle>
          <SheetDescription className="font-mono">{cours?.code}</SheetDescription>
        </SheetHeader>

        <div className="mt-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs italic text-fg-subtle">Chargement du cours…</p>
            </div>
          )}
          {error && !isLoading && (
            <p className="py-8 text-sm text-destructive">
              Impossible de charger le cours. Réessayez.
            </p>
          )}
          {cours && !isLoading && !error && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {cours.description && (
                    <p className="text-sm text-fg-muted max-w-2xl">{cours.description}</p>
                  )}
                  <div className="mt-3 flex gap-4 text-sm text-fg-muted">
                    <span>
                      Crédits : <strong className="text-fg">{cours.credits ?? "—"}</strong>
                    </span>
                    <span>
                      Heures : <strong className="text-fg">{cours.heures ?? "—"}</strong>
                    </span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Modifier le cours
                </Button>
              </div>

              <CoursCompetencesPanel coursId={cours.id} />

              <CoursEditDialog
                cours={editing ? cours : null}
                onClose={() => setEditing(false)}
                onUpdated={() => {
                  mutate();
                  onChanged?.();
                }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
