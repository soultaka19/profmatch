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
import { programmesApi } from "@/lib/api/programmes";
import { etapesApi } from "@/lib/api/etapes";
import type { Programme } from "@/lib/types/api";
import type { Etape } from "@/lib/types/programmes";
import { EtapeAccordion } from "@/components/admin/EtapeAccordion";
import { EtapeCreateDialog } from "@/components/admin/EtapeCreateDialog";
import { EtapeDeleteDialog } from "@/components/admin/EtapeDeleteDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";
import { ProgrammeCalendarPanel } from "@/components/admin/ProgrammeCalendarPanel";
import { SemestresAdmissionBadges } from "@/components/admin/SemestresAdmissionBadges";

interface Props {
  programmeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function ProgrammeDetailDrawer({ programmeId, open, onOpenChange, onChanged }: Props) {
  const gatedId = open && programmeId !== null ? programmeId : null;

  const programmeSwr = useSWR<Programme>(
    gatedId !== null ? `programme:${gatedId}` : null,
    () => programmesApi.get(gatedId as number),
  );
  const etapesSwr = useSWR<Etape[]>(
    gatedId !== null ? `etapes:${gatedId}` : null,
    () => etapesApi.list(gatedId as number),
  );

  const [editing, setEditing] = useState(false);
  const [deletingEtape, setDeletingEtape] = useState<Etape | null>(null);

  const programme = programmeSwr.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-7">
        <SheetHeader>
          <SheetTitle>{programme?.nom ?? "Détail du programme"}</SheetTitle>
          <SheetDescription className="font-mono">{programme?.code}</SheetDescription>
        </SheetHeader>

        <div className="mt-8">
          {programmeSwr.isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs italic text-fg-subtle">Chargement du programme…</p>
            </div>
          )}
          {programmeSwr.error && !programmeSwr.isLoading && (
            <p className="py-8 text-sm text-destructive">
              Impossible de charger le programme. Réessayez.
            </p>
          )}
          {programme && !programmeSwr.isLoading && !programmeSwr.error && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {programme.departement && (
                    <p className="text-sm text-fg-muted">{programme.departement}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs uppercase text-fg-muted">Admission :</span>
                    <SemestresAdmissionBadges semestres={programme.semestres_admission} />
                  </div>
                  {etapesSwr.data !== undefined && (
                    <p className="mt-2 text-sm text-fg-muted">
                      {etapesSwr.data.length === 0
                        ? "Aucune étape configurée"
                        : etapesSwr.data.length === 1
                          ? "1 étape configurée"
                          : `${etapesSwr.data.length} étapes configurées`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Modifier le programme
                  </Button>
                  <EtapeCreateDialog
                    programmeId={programme.id}
                    onCreated={() => etapesSwr.mutate()}
                  />
                </div>
              </div>

              <ProgrammeCalendarPanel programmeId={programme.id} />

              <div>
                <h2 className="text-title-sm font-semibold text-fg mb-3">Étapes et cours</h2>
                {etapesSwr.isLoading ? (
                  <p className="text-sm text-fg-muted">Chargement…</p>
                ) : (
                  <EtapeAccordion
                    programmeId={programme.id}
                    etapes={etapesSwr.data ?? []}
                    onDeleteEtape={setDeletingEtape}
                    onCursusChanged={() => etapesSwr.mutate()}
                  />
                )}
              </div>

              <ProgrammeEditDialog
                programme={editing ? programme : null}
                onClose={() => setEditing(false)}
                onUpdated={() => {
                  programmeSwr.mutate();
                  onChanged?.();
                }}
              />
              <EtapeDeleteDialog
                programmeId={programme.id}
                etape={deletingEtape}
                onClose={() => setDeletingEtape(null)}
                onDone={() => etapesSwr.mutate()}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
