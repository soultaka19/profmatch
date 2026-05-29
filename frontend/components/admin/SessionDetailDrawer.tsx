"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { sessionsApi } from "@/lib/api/sessions";
import type { Session } from "@/lib/types/api";
import { SessionStatusSwitcher } from "@/components/admin/SessionStatusSwitcher";
import { SessionStatutBadge } from "@/components/admin/SessionStatutBadge";
import { PonderationsPanel } from "@/components/admin/PonderationsPanel";
import { ProgrammesEligiblesPanel } from "@/components/admin/ProgrammesEligiblesPanel";
import { SEMESTRE_LABEL_LONG } from "@/lib/types/sessions";

interface Props {
  sessionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function SessionDetailDrawer({ sessionId, open, onOpenChange, onChanged }: Props) {
  const { data, mutate, isLoading, error } = useSWR<Session>(
    open && sessionId !== null ? `session:${sessionId}` : null,
    () => sessionsApi.get(sessionId as number),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-7">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {data?.nom ?? "Détail de la session"}
            {data && <SessionStatutBadge statut={data.statut} />}
          </SheetTitle>
          {data && (
            <SheetDescription>
              {SEMESTRE_LABEL_LONG[data.semestre]} {data.annee} — créée le{" "}
              {new Date(data.cree_le).toLocaleDateString("fr-CA")}.
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs italic text-fg-subtle">Chargement de la session…</p>
            </div>
          )}
          {error && !isLoading && (
            <p className="py-8 text-sm text-destructive">
              Impossible de charger la session. Réessayez.
            </p>
          )}
          {data && !isLoading && !error && (
            <div className="space-y-6">
              <SessionStatusSwitcher
                session={data}
                onUpdated={() => {
                  mutate();
                  onChanged?.();
                }}
              />

              <PonderationsPanel sessionId={data.id} />

              <ProgrammesEligiblesPanel sessionId={data.id} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
