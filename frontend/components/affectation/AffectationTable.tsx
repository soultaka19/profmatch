"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { AffectationCard } from "./AffectationCard";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ManualAssignDialog } from "./ManualAssignDialog";
import { getRecommendationFilter, type RecommendationFilter } from "./recommendation";
import type { ActionFeedback } from "./types";
import type { AffectationOut } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface AffectationTableProps {
  mode?: "review" | "history";
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
  pendingActionId?: number | null;
  pendingAction?: "validate" | "reject" | null;
  actionFeedback?: Record<number, ActionFeedback>;
  focusCandidateId?: number | null;
  // Présents uniquement en phase de révision active : activent l'affectation
  // manuelle (REV-04). Omis en lecture seule (historique).
  sessionId?: number;
  onManualAssigned?: () => void;
}

export function AffectationTable({
  mode = "review",
  affectations,
  coursNames,
  professorNames,
  poids,
  onValidate,
  onReject,
  pendingActionId = null,
  pendingAction = null,
  actionFeedback = {},
  focusCandidateId = null,
  sessionId,
  onManualAssigned,
}: AffectationTableProps) {
  const [recommendationFilter, setRecommendationFilter] =
    useState<RecommendationFilter>("all");
  const [selectedCoursId, setSelectedCoursId] = useState<string>("all");
  const [justification, setJustification] = useState<AffectationOut | null>(null);

  const coursIds = useMemo(
    () => Array.from(new Set(affectations.map((aff) => aff.cours_id))).sort((a, b) => a - b),
    [affectations]
  );

  const filtered = affectations.filter((aff) => {
    const matchesRecommendation =
      recommendationFilter === "all" ||
      getRecommendationFilter(aff.score_total) === recommendationFilter;
    const matchesCours =
      selectedCoursId === "all" || aff.cours_id === Number(selectedCoursId);
    return matchesRecommendation && matchesCours;
  });

  if (affectations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Aucune proposition d&apos;affectation générée.
      </p>
    );
  }

  const groups = filtered.reduce<Record<number, AffectationOut[]>>((acc, aff) => {
    if (!acc[aff.cours_id]) acc[aff.cours_id] = [];
    acc[aff.cours_id].push(aff);
    return acc;
  }, {});

  Object.values(groups).forEach((group) => group.sort((a, b) => b.score_total - a.score_total));

  const displayedCoursIds = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const activeCourseIndex =
    selectedCoursId === "all" ? -1 : coursIds.indexOf(Number(selectedCoursId));
  const hasNextCourse = activeCourseIndex >= 0 && activeCourseIndex < coursIds.length - 1;

  function showNextCourse() {
    if (selectedCoursId === "all" && coursIds.length > 0) {
      setSelectedCoursId(String(coursIds[0]));
      return;
    }
    if (hasNextCourse) {
      setSelectedCoursId(String(coursIds[activeCourseIndex + 1]));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas-pure p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-fg-muted">
          Filtrer par recommandation
          <select
            value={recommendationFilter}
            onChange={(event) => setRecommendationFilter(event.target.value as RecommendationFilter)}
            className="h-10 rounded-md border border-border bg-canvas-pure px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
          >
            <option value="all">Toutes</option>
            <option value="forte">Fortement recommandées</option>
            <option value="reserves">Avec réserves</option>
            <option value="examiner">À examiner</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-fg-muted">
          {mode === "history" ? "Filtrer par cours" : "Cours à réviser"}
          <select
            value={selectedCoursId}
            onChange={(event) => setSelectedCoursId(event.target.value)}
            className="h-10 rounded-md border border-border bg-canvas-pure px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
          >
            <option value="all">Tous les cours</option>
            {coursIds.map((coursId) => (
              <option key={coursId} value={coursId}>
                {coursNames[coursId] ?? `Cours #${coursId}`}
              </option>
            ))}
          </select>
        </label>
        {mode === "review" && (
          <Button
            type="button"
            variant="outline"
            onClick={showNextCourse}
            disabled={selectedCoursId !== "all" && !hasNextCourse}
          >
            Cours suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {displayedCoursIds.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-muted">
          Aucune proposition ne correspond aux filtres choisis.
        </p>
      )}

      <div className="space-y-8">
        {displayedCoursIds.map((coursId) => {
          const group = groups[coursId];
          const coursName = coursNames[coursId] ?? `Cours #${coursId}`;
          return (
            <section key={coursId}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-fg">{coursName}</h3>
                  <span className="text-xs text-fg-muted">
                    {group.length} candidat{group.length > 1 ? "s" : ""}
                  </span>
                </div>
                {sessionId !== undefined && onManualAssigned && (
                  <ManualAssignDialog
                    sessionId={sessionId}
                    coursId={coursId}
                    onAssigned={onManualAssigned}
                  />
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((aff) => (
                  <AffectationCard
                    key={aff.id}
                    aff={aff}
                    poids={poids}
                    professorName={professorNames[aff.professeur_id] ?? `Prof #${aff.professeur_id}`}
                    onValidate={onValidate}
                    onReject={onReject}
                    pendingAction={pendingActionId === aff.id ? pendingAction : null}
                    actionFeedback={actionFeedback[aff.id] ?? null}
                    onViewJustification={setJustification}
                    focusPrimaryAction={focusCandidateId === aff.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <JustificationDialog
        affectation={justification}
        coursName={justification ? coursNames[justification.cours_id] : undefined}
        professorName={justification ? professorNames[justification.professeur_id] : undefined}
        poids={poids}
        onClose={() => setJustification(null)}
      />
    </div>
  );
}

function JustificationDialog({
  affectation,
  coursName,
  professorName,
  poids,
  onClose,
}: {
  affectation: AffectationOut | null;
  coursName?: string;
  professorName?: string;
  poids: Poids;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(affectation)} onOpenChange={(open) => !open && onClose()}>
      {affectation && (
        <SheetContent className="inset-3 left-3 top-3 max-h-[calc(100vh-1.5rem)] w-[calc(100%-1.5rem)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-lg p-5 sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-7">
          <SheetHeader>
            <SheetTitle className="text-xl not-italic">Justification IA</SheetTitle>
            <SheetDescription>
              {coursName ?? `Cours #${affectation.cours_id}`} ·{" "}
              {professorName ?? `Prof #${affectation.professeur_id}`}
            </SheetDescription>
          </SheetHeader>
          <ScoreBreakdown
            scores={{
              comp: affectation.score_comp,
              exp: affectation.score_exp,
              hist: affectation.score_hist,
              sem: affectation.score_sem,
            }}
            poids={poids}
            total={affectation.score_total}
          />
          <div className="rounded-md bg-canvas px-4 py-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
              <Sparkles className="h-4 w-4" />
              Analyse détaillée
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
              {affectation.justification}
            </p>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
