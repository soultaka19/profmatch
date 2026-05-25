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

  // Affectations en phase review
  const { data: affectations, mutate: mutateAffectations } =
    useSWR<AffectationOut[]>(
      phase === "review" && sessionId
        ? `/api/affectations/?session_id=${sessionId}`
        : null,
      phase === "review" && sessionId
        ? () => affectationsApi.list(sessionId)
        : null
    );

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

  const handleTaskStarted = useCallback((tid: string, sid: number, nextScope: GenerationScope) => {
    setTaskId(tid);
    setSessionId(sid);
    setScope(nextScope);
    setPhase("generating");
  }, []);

  const handleValidate = useCallback(
    async (id: number) => {
      const current = affectations?.find((affectation) => affectation.id === id);
      const nextCandidate = affectations?.find(
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
        await mutateAffectations();
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
    [affectations, mutateAffectations]
  );

  const handleReject = useCallback(
    async (id: number) => {
      const current = affectations?.find((affectation) => affectation.id === id);
      const nextCandidate = affectations?.find(
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
        await mutateAffectations();
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
    [affectations, mutateAffectations]
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

  const hasPendingProposals = (affectations ?? []).some(
    (affectation) => affectation.statut === "proposee"
  );

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
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
        <div className="space-y-5">
          {scope && <GenerationScopeSummary scope={scope} />}
          <p role="status" aria-live="polite" className="sr-only">
            Génération terminée. {(affectations ?? []).length} propositions disponibles.
          </p>
          <ReviewSummary affectations={affectations ?? []} />
          <AffectationTable
            affectations={affectations ?? []}
            coursNames={coursNames}
            professorNames={professorNames}
            poids={poids}
            onValidate={handleValidate}
            onReject={handleReject}
            pendingActionId={pendingActionId}
            pendingAction={pendingAction}
            actionFeedback={actionFeedback}
            focusCandidateId={focusCandidateId}
          />
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
