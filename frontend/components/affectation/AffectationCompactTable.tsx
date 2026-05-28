"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AffectationOut } from "@/lib/types/api";

import { JustificationBadge } from "./JustificationBadge";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface Props {
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
  pendingActionId?: number | null;
  pendingAction?: "validate" | "reject" | null;
}

/**
 * Vue tableau dense des propositions d'affectation — alternative à
 * `AffectationTable` (cartes groupées par cours). Optimisée pour le RH qui
 * veut tout voir d'un coup et trier visuellement par score, sans dérouler
 * cours par cours. Toutes les colonnes essentielles tiennent sur une ligne.
 *
 * Pour la lisibilité, la justification est tronquée en cellule ; le RH
 * peut cliquer sur la ligne pour ouvrir le panneau de détail complet.
 */
export function AffectationCompactTable({
  affectations,
  coursNames,
  professorNames,
  poids,
  onValidate,
  onReject,
  pendingActionId = null,
  pendingAction = null,
}: Props) {
  const [detail, setDetail] = useState<AffectationOut | null>(null);

  const sorted = useMemo(
    () => [...affectations].sort((a, b) => b.score_total - a.score_total),
    [affectations],
  );

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Aucune proposition d&apos;affectation à afficher.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas-pure">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-canvas text-xs uppercase tracking-wide text-fg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Cours
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Prof
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Score
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Justification
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((aff) => {
            const coursLabel = coursNames[aff.cours_id] ?? `Cours #${aff.cours_id}`;
            const profLabel =
              professorNames[aff.professeur_id] ?? `Prof #${aff.professeur_id}`;
            const isPending = pendingActionId === aff.id;
            const canAct = aff.statut === "proposee";

            return (
              <tr
                key={aff.id}
                className="cursor-pointer transition-colors hover:bg-canvas"
                onClick={() => setDetail(aff)}
              >
                <td className="px-4 py-3 align-middle">
                  <span className="font-medium text-fg">{coursLabel}</span>
                </td>
                <td className="px-4 py-3 align-middle text-fg-muted">
                  {profLabel}
                </td>
                <td
                  data-testid="score"
                  className="px-4 py-3 text-right font-medium tabular-nums text-fg"
                >
                  {aff.score_total.toFixed(2)}
                </td>
                <td className="max-w-xs px-4 py-3 align-middle">
                  <span className="inline-flex items-center gap-2">
                    <JustificationBadge statut={aff.justification_statut} />
                    <span className="truncate text-fg-muted">
                      {aff.justification ?? "—"}
                    </span>
                  </span>
                </td>
                <td
                  className="px-4 py-3 text-right align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canAct ? (
                    <span className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        disabled={isPending}
                        onClick={() => onValidate(aff.id)}
                        title="Valider"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Valider</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-destructive hover:bg-destructive hover:text-white"
                        disabled={isPending}
                        onClick={() => onReject(aff.id)}
                        title="Rejeter"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Rejeter</span>
                      </Button>
                    </span>
                  ) : (
                    <StatutDecide statut={aff.statut} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DetailSheet
        affectation={detail}
        coursName={detail ? coursNames[detail.cours_id] : undefined}
        professorName={detail ? professorNames[detail.professeur_id] : undefined}
        poids={poids}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function StatutDecide({ statut }: { statut: "proposee" | "validee" | "rejetee" }) {
  if (statut === "validee") {
    return <span className="text-xs text-primary">Validée</span>;
  }
  return <span className="text-xs text-fg-muted">Rejetée</span>;
}

function DetailSheet({
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
            <SheetTitle className="text-title-sm font-semibold">
              Justification IA
            </SheetTitle>
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
