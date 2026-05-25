"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { affectationsApi, sessionsApi } from "@/lib/api/affectations";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import type { AffectationOut, PonderationsOut, Session } from "@/lib/types/api";
import { STATUT_LABEL } from "@/lib/types/sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";

const STATUT_BADGE: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  planifiee: "outline",
  ouverte: "default",
  fermee: "secondary",
};

export default function HistoriquePage() {
  const { data: sessions, error: sessionsError, isLoading } = useSWR<Session[]>(
    "/api/sessions/",
    sessionsApi.list
  );

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const {
    data: affectations,
    error: affectationsError,
    isLoading: affectationsLoading,
  } = useSWR<AffectationOut[]>(
    selectedSession
      ? `/api/affectations/?session_id=${selectedSession.id}&statut=validee`
      : null,
    selectedSession
      ? () => affectationsApi.list(selectedSession.id, "validee")
      : null
  );

  const {
    data: ponderations,
    error: ponderationsError,
    isLoading: ponderationsLoading,
  } = useSWR<PonderationsOut>(
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

  // Maps id → nom dérivées des champs enrichis renvoyés par l'API
  const coursNames = useMemo(() => {
    const m: Record<number, string> = {};
    for (const a of affectations ?? []) {
      if (a.cours_nom) {
        m[a.cours_id] = a.cours_code
          ? `${a.cours_code} — ${a.cours_nom}`
          : a.cours_nom;
      }
    }
    return m;
  }, [affectations]);

  const professorNames = useMemo(() => {
    const m: Record<number, string> = {};
    for (const a of affectations ?? []) {
      if (a.professeur_nom) m[a.professeur_id] = a.professeur_nom;
    }
    return m;
  }, [affectations]);

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
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des sessions...
        </p>
      )}

      {sessionsError && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Impossible de charger les sessions.
        </p>
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
              className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-canvas-pure px-4 py-3 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-fg">{sess.nom}</span>
                <Badge variant={STATUT_BADGE[sess.statut] ?? "outline"}>
                  {STATUT_LABEL[sess.statut]}
                </Badge>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Voir les affectations
                <ChevronRight className="h-4 w-4" />
              </span>
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
              {STATUT_LABEL[selectedSession.statut]}
            </Badge>
          </div>

          {!affectationsLoading && !affectationsError && (
            <p className="text-sm text-fg-muted">
              {affectations?.length ?? 0} affectation
              {(affectations?.length ?? 0) > 1 ? "s" : ""} validée
              {(affectations?.length ?? 0) > 1 ? "s" : ""}
            </p>
          )}

          {(affectationsLoading || ponderationsLoading) && (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des affectations validées...
            </p>
          )}

          {(affectationsError || ponderationsError) && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Impossible de charger les affectations de cette session.
            </p>
          )}

          {!affectationsLoading &&
            !ponderationsLoading &&
            !affectationsError &&
            !ponderationsError &&
            (affectations ?? []).length === 0 && (
              <div className="rounded-md border border-border bg-canvas-pure px-5 py-6 text-sm text-fg-muted">
                Aucune affectation validée pour cette session.
              </div>
            )}

          {!affectationsLoading &&
            !ponderationsLoading &&
            !affectationsError &&
            !ponderationsError &&
            (affectations ?? []).length > 0 && (
              <AffectationTable
                affectations={affectations ?? []}
                coursNames={coursNames}
                professorNames={professorNames}
                poids={poids}
                onValidate={() => {}}
                onReject={() => {}}
              />
            )}
        </div>
      )}
    </div>
  );
}
