"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { BookOpen, Calendar, Sparkles, UserCheck } from "lucide-react";
import type { AffectationProfOut, AffectationStatut } from "@/lib/types/api";

// Pondérations par défaut — le prof n'a pas accès aux pondérations de session,
// on utilise les valeurs recommandées pour l'affichage de la barre de score.
const DEFAULT_POIDS = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

const STATUT_CONFIG: Record<
  AffectationStatut,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  proposee: { label: "Proposée", variant: "secondary" },
  validee: { label: "Validée ✓", variant: "default" },
  rejetee: { label: "Rejetée", variant: "destructive" },
};

interface MesAffectationsCardProps {
  aff: AffectationProfOut;
}

/**
 * Carte d'affectation en lecture seule — vue professeur (PR-I).
 * Affiche le cours, la session, le score W1–W4, le statut et la justification XAI.
 */
export function MesAffectationsCard({ aff }: MesAffectationsCardProps) {
  const [justifOpen, setJustifOpen] = useState(false);
  const statutCfg = STATUT_CONFIG[aff.statut];

  const coursLabel = aff.cours_code
    ? `${aff.cours_code} — ${aff.cours_nom ?? ""}`
    : (aff.cours_nom ?? `Cours #${aff.cours_id}`);

  const valideLe = aff.valide_le
    ? new Intl.DateTimeFormat("fr-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(aff.valide_le))
    : null;

  return (
    <>
      <div className="rounded-lg border border-border bg-canvas-pure p-4 shadow-sm space-y-3">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-fg truncate" title={coursLabel}>
              {coursLabel}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {aff.session_nom}
              </span>
              {valideLe && (
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Affectée le {valideLe}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {aff.origine === "manuel" && (
              <Badge variant="outline" className="text-[10px]">
                Manuel
              </Badge>
            )}
            <Badge variant={statutCfg.variant}>{statutCfg.label}</Badge>
          </div>
        </div>

        {/* Score W1–W4 */}
        <ScoreBreakdown
          scores={{
            comp: aff.score_comp,
            exp: aff.score_exp,
            hist: aff.score_hist,
            sem: aff.score_sem,
          }}
          poids={DEFAULT_POIDS}
          total={aff.score_total}
        />

        {/* Bouton justification */}
        {aff.justification && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-0 text-fg-muted hover:text-fg"
            onClick={() => setJustifOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Voir la justification IA
          </Button>
        )}
      </div>

      {/* Dialog justification XAI */}
      <Dialog open={justifOpen} onOpenChange={setJustifOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Justification IA
            </DialogTitle>
            <p className="text-sm text-fg-muted">{coursLabel}</p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Score récapitulatif */}
            <div className="rounded-md border border-border bg-surface p-3">
              <ScoreBreakdown
                scores={{
                  comp: aff.score_comp,
                  exp: aff.score_exp,
                  hist: aff.score_hist,
                  sem: aff.score_sem,
                }}
                poids={DEFAULT_POIDS}
                total={aff.score_total}
              />
            </div>

            {/* Texte narratif */}
            <div className="rounded-md border border-border bg-canvas-pure p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">
                Analyse détaillée
              </p>
              <div className="space-y-3 text-sm text-fg leading-relaxed">
                {aff.justification
                  ?.split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <p
                      key={i}
                      className={line.startsWith("•") ? "pl-1" : "font-medium"}
                    >
                      {line}
                    </p>
                  ))}
              </div>
            </div>

            <p className="text-xs text-fg-subtle text-center">
              Cette analyse est générée automatiquement par l&apos;algorithme
              de scoring W1–W4 de ProfMatch.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
