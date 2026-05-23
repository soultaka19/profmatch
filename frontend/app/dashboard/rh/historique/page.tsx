"use client";

import { useState } from "react";
import useSWR from "swr";
import { affectationsApi, sessionsApi } from "@/lib/api/affectations";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import type { AffectationOut, PonderationsOut, Session } from "@/lib/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const STATUT_BADGE: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  planifiee: "outline",
  ouverte: "default",
  fermee: "secondary",
};

export default function HistoriquePage() {
  const { data: sessions, isLoading } = useSWR<Session[]>(
    "/api/sessions/",
    sessionsApi.list
  );

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const { data: affectations } = useSWR<AffectationOut[]>(
    selectedSession
      ? `/api/affectations/?session_id=${selectedSession.id}&statut=validee`
      : null,
    selectedSession
      ? () => affectationsApi.list(selectedSession.id, "validee")
      : null
  );

  const { data: ponderations } = useSWR<PonderationsOut>(
    selectedSession
      ? `/api/sessions/${selectedSession.id}/ponderations`
      : null,
    selectedSession
      ? () => sessionsApi.getPonderations(selectedSession.id)
      : null
  );

  const poids = ponderations
    ? {
        w1: ponderations.w1,
        w2: ponderations.w2,
        w3: ponderations.w3,
        w4: ponderations.w4,
      }
    : { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold text-fg">
          Historique des sessions
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Consultez les affectations validées par session académique.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-fg-muted">Chargement des sessions…</p>
      )}

      {/* Liste des sessions */}
      {!selectedSession && (
        <div className="space-y-2">
          {(sessions ?? []).length === 0 && !isLoading && (
            <p className="text-sm text-fg-muted">
              Aucune session disponible.
            </p>
          )}
          {(sessions ?? []).map((sess) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSession(sess)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-canvas-pure px-4 py-3 text-left transition-colors hover:bg-canvas"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-fg">{sess.nom}</span>
                <Badge variant={STATUT_BADGE[sess.statut] ?? "outline"}>
                  {sess.statut}
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-fg-muted" />
            </button>
          ))}
        </div>
      )}

      {/* Détail d'une session */}
      {selectedSession && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSession(null)}
            >
              ← Sessions
            </Button>
            <h2 className="text-lg font-semibold text-fg">
              {selectedSession.nom}
            </h2>
            <Badge
              variant={STATUT_BADGE[selectedSession.statut] ?? "outline"}
            >
              {selectedSession.statut}
            </Badge>
          </div>

          <p className="text-sm text-fg-muted">
            {affectations?.length ?? 0} affectation
            {(affectations?.length ?? 0) > 1 ? "s" : ""} validée
            {(affectations?.length ?? 0) > 1 ? "s" : ""}
          </p>

          <AffectationTable
            affectations={affectations ?? []}
            coursNames={{}}
            professorNames={{}}
            poids={poids}
            onValidate={() => {}}
            onReject={() => {}}
          />
        </div>
      )}
    </div>
  );
}
