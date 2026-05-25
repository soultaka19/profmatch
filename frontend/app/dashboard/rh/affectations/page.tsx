"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import { GenerationForm } from "@/components/affectation/GenerationForm";
import { useGenerationPoller } from "@/lib/hooks/useGenerationPoller";
import { affectationsApi, sessionsApi } from "@/lib/api/affectations";
import type { AffectationOut, PonderationsOut } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";

type Phase = "configure" | "generating" | "review" | "error";

export default function AffectationsPage() {
  const [phase, setPhase] = useState<Phase>("configure");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Polling génération
  const { data: genStatus } = useGenerationPoller(
    phase === "generating" ? taskId : null
  );

  // Transition generating → review / error
  if (phase === "generating" && genStatus) {
    if (genStatus.status === "done") {
      setPhase("review");
    } else if (genStatus.status === "error") {
      setErrorMsg(genStatus.detail ?? "Erreur de génération");
      setPhase("error");
    }
  }

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

  const handleTaskStarted = useCallback((tid: string, sid: number) => {
    setTaskId(tid);
    setSessionId(sid);
    setPhase("generating");
  }, []);

  const handleValidate = useCallback(
    async (id: number) => {
      await affectationsApi.validate(id, "validee");
      mutateAffectations();
    },
    [mutateAffectations]
  );

  const handleReject = useCallback(
    async (id: number) => {
      await affectationsApi.validate(id, "rejetee");
      mutateAffectations();
    },
    [mutateAffectations]
  );

  const reset = () => {
    setPhase("configure");
    setTaskId(null);
    setSessionId(null);
    setErrorMsg(null);
  };

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
        {(phase === "review" || phase === "error") && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Nouvelle génération
          </Button>
        )}
      </div>

      {/* Phase configure */}
      {phase === "configure" && (
        <GenerationForm onTaskStarted={handleTaskStarted} />
      )}

      {/* Phase generating */}
      {phase === "generating" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-fg-muted">
            Calcul des scores W1–W4 pour toutes les paires professeur-cours…
          </p>
          <p className="text-xs text-fg-muted">
            Statut : {genStatus?.status ?? "en attente"}
          </p>
        </div>
      )}

      {/* Phase review */}
      {phase === "review" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{affectations?.length ?? 0} propositions générées</span>
          </div>
          <AffectationTable
            affectations={affectations ?? []}
            coursNames={coursNames}
            professorNames={professorNames}
            poids={poids}
            onValidate={handleValidate}
            onReject={handleReject}
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
