"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import { GenerationForm } from "@/components/affectation/GenerationForm";
import { GenerationProgress } from "@/components/affectation/GenerationProgress";
import { GenerationScopeSummary } from "@/components/affectation/GenerationScopeSummary";
import { NewGenerationButton } from "@/components/affectation/NewGenerationButton";
import { ReviewSummary } from "@/components/affectation/ReviewSummary";
import type { ActionFeedback, GenerationScope } from "@/components/affectation/types";
import { useGenerationPoller } from "@/lib/hooks/useGenerationPoller";
import { affectationsApi, sessionsApi } from "@/lib/api/affectations";
import type { AffectationOut, PonderationsOut } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle,
} from "lucide-react";

type Phase = "configure" | "generating" | "review" | "error";

export default function AffectationsPage() {
  const [phase, setPhase] = useState<Phase>("configure");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"validate" | "reject" | null>(null);
  const [scope, setScope] = useState<GenerationScope | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<number, ActionFeedback>>({});
  const [focusCandidateId, setFocusCandidateId] = useState<number | null>(null);

  // Polling génération
  const { data: genStatus } = useGenerationPoller(
    phase === "generating" ? taskId : null
  );

  // Transition generating → review / error
  useEffect(() => {
    if (phase !== "generating" || !genStatus) return;
    if (genStatus.status === "done") {
      setPhase("review");
    } else if (genStatus.status === "error") {
      setErrorMsg(genStatus.detail ?? "Erreur de génération");
      setPhase("error");
    }
  }, [genStatus, phase]);

  // Périmètre exact de la génération courante (dérivé du scope choisi)
  const programmeIds = useMemo(() => scope?.programmes.map((p) => p.id) ?? [], [scope]);
  const etapeIds = useMemo(() => scope?.etapes.map((e) => e.id) ?? [], [scope]);
  const inReview = phase === "review" && sessionId !== null;

  // Génération courante : TOUTES les affectations du périmètre exact (programme +
  // étapes), quel que soit leur statut. Ce qu'on valide/rejette pendant la revue
  // reste donc visible ici (avec son badge) au lieu de basculer dans l'historique.
  const { data: currentProposals, mutate: mutateCurrent } = useSWR<AffectationOut[]>(
    inReview
      ? `gen-current:${sessionId}:${programmeIds.join(",")}:${etapeIds.join(",")}`
      : null,
    inReview
      ? () =>
          affectationsApi.list(sessionId!, undefined, {
            programmeIds,
            etapeIds: etapeIds.length ? etapeIds : undefined,
          })
      : null
  );

  // Toutes les affectations du programme (pour la section « déjà traitées »)
  const { data: programmeAffectations, mutate: mutateProgramme } = useSWR<AffectationOut[]>(
    inReview ? `gen-programme:${sessionId}:${programmeIds.join(",")}` : null,
    inReview ? () => affectationsApi.list(sessionId!, undefined, { programmeIds }) : null
  );

  const proposals = useMemo(() => currentProposals ?? [], [currentProposals]);
  // Le cloisonnement se fait sur le PÉRIMÈTRE, pas sur le statut : l'historique ne
  // garde que les affectations traitées du programme situées hors du périmètre
  // courant (autres étapes). Les ids du périmètre courant sont donc exclus.
  const currentIds = useMemo(
    () => new Set(proposals.map((a) => a.id)),
    [proposals]
  );
  const treated = useMemo(
    () =>
      (programmeAffectations ?? []).filter(
        (a) => !currentIds.has(a.id) && a.statut !== "proposee"
      ),
    [programmeAffectations, currentIds]
  );
  const refreshReview = useCallback(async () => {
    await Promise.all([mutateCurrent(), mutateProgramme()]);
  }, [mutateCurrent, mutateProgramme]);

  // Pondérations pour afficher la barre de score
  const { data: ponderations } = useSWR<PonderationsOut>(
    sessionId ? `/api/sessions/${sessionId}/ponderations` : null,
    sessionId ? () => sessionsApi.getPonderations(sessionId) : null
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
    for (const a of [...proposals, ...treated]) {
      if (a.cours_nom) {
        m[a.cours_id] = a.cours_code
          ? `${a.cours_code} — ${a.cours_nom}`
          : a.cours_nom;
      }
    }
    return m;
  }, [proposals, treated]);

  const professorNames = useMemo(() => {
    const m: Record<number, string> = {};
    for (const a of [...proposals, ...treated]) {
      if (a.professeur_nom) m[a.professeur_id] = a.professeur_nom;
    }
    return m;
  }, [proposals, treated]);

  const handleTaskStarted = useCallback((tid: string, sid: number, nextScope: GenerationScope) => {
    setTaskId(tid);
    setSessionId(sid);
    setScope(nextScope);
    setPhase("generating");
  }, []);

  const handleValidate = useCallback(
    async (id: number) => {
      const current = proposals.find((affectation) => affectation.id === id);
      const nextCandidate = proposals.find(
        (affectation) =>
          affectation.cours_id === current?.cours_id &&
          affectation.id !== id &&
          affectation.statut === "proposee"
      );
      setActionFeedback((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setPendingActionId(id);
      setPendingAction("validate");
      try {
        await affectationsApi.validate(id, "validee");
        await refreshReview();
        setActionFeedback((previous) => ({
          ...previous,
          [id]: { tone: "success", message: "Affectation validée." },
        }));
        setFocusCandidateId(nextCandidate?.id ?? null);
        toast.success("Affectation validée.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Validation impossible.";
        setActionFeedback((previous) => ({
          ...previous,
          [id]: { tone: "error", message },
        }));
        toast.error(message);
      } finally {
        setPendingActionId(null);
        setPendingAction(null);
      }
    },
    [proposals, refreshReview]
  );

  const handleReject = useCallback(
    async (id: number) => {
      const current = proposals.find((affectation) => affectation.id === id);
      const nextCandidate = proposals.find(
        (affectation) =>
          affectation.cours_id === current?.cours_id &&
          affectation.id !== id &&
          affectation.statut === "proposee"
      );
      setActionFeedback((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setPendingActionId(id);
      setPendingAction("reject");
      try {
        await affectationsApi.validate(id, "rejetee");
        await refreshReview();
        setActionFeedback((previous) => ({
          ...previous,
          [id]: { tone: "success", message: "Affectation rejetée." },
        }));
        setFocusCandidateId(nextCandidate?.id ?? null);
        toast.success("Affectation rejetée.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Rejet impossible.";
        setActionFeedback((previous) => ({
          ...previous,
          [id]: { tone: "error", message },
        }));
        toast.error(message);
      } finally {
        setPendingActionId(null);
        setPendingAction(null);
      }
    },
    [proposals, refreshReview]
  );

  const reset = () => {
    setPhase("configure");
    setTaskId(null);
    setSessionId(null);
    setErrorMsg(null);
    setScope(null);
    setActionFeedback({});
    setFocusCandidateId(null);
  };

  // « En attente » = propositions encore à réviser (la vue courante inclut
  // désormais aussi les validées/rejetées, qui ne comptent pas comme en attente).
  const hasPendingProposals = proposals.some((p) => p.statut === "proposee");

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Affectations</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {phase === "configure" &&
              "Configurez et lancez la génération automatique."}
            {phase === "generating" && "Génération en cours…"}
            {phase === "review" &&
              "Révisez et validez les propositions d'affectation."}
            {phase === "error" && "Une erreur est survenue lors de la génération."}
          </p>
        </div>
        {phase === "review" && (
          <NewGenerationButton
            hasPendingProposals={hasPendingProposals}
            onReset={reset}
          />
        )}
        {phase === "error" && (
          <Button variant="outline" size="sm" onClick={reset}>
            Réessayer
          </Button>
        )}
      </div>

      {/* Phase configure */}
      {phase === "configure" && (
        <GenerationForm onTaskStarted={handleTaskStarted} />
      )}

      {/* Phase generating */}
      {phase === "generating" && (
        <div className="space-y-5">
          {scope && <GenerationScopeSummary scope={scope} />}
          <GenerationProgress status={genStatus?.status} />
        </div>
      )}

      {/* Phase review */}
      {phase === "review" && (
        <div className="space-y-8">
          {scope && <GenerationScopeSummary scope={scope} />}
          <p role="status" aria-live="polite" className="sr-only">
            Génération terminée. {proposals.length} propositions disponibles.
          </p>
          <ReviewSummary affectations={proposals} />
          <AffectationTable
            affectations={proposals}
            coursNames={coursNames}
            professorNames={professorNames}
            poids={poids}
            sessionId={sessionId!}
            onValidate={handleValidate}
            onReject={handleReject}
            pendingActionId={pendingActionId}
            pendingAction={pendingAction}
            actionFeedback={actionFeedback}
            focusCandidateId={focusCandidateId}
            onManualAssigned={refreshReview}
          />

          {treated.length > 0 && (
            <details className="rounded-lg border border-border bg-canvas px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-fg">
                Historique du programme hors sélection actuelle ({treated.length})
              </summary>
              <p className="mb-3 mt-1 text-xs text-fg-muted">
                Affectations validées ou rejetées du programme, hors de la génération courante.
              </p>
              <AffectationTable
                mode="history"
                affectations={treated}
                coursNames={coursNames}
                professorNames={professorNames}
                poids={poids}
                onValidate={() => {}}
                onReject={() => {}}
              />
            </details>
          )}
        </div>
      )}

      {/* Phase error */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium text-fg">Erreur lors de la génération</p>
          <p className="text-sm text-fg-muted">{errorMsg}</p>
          <Button variant="outline" onClick={reset}>
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
