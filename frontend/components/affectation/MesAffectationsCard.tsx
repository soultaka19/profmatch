"use client";

import { useState } from "react";
import { BookOpen, Calendar, Sparkles, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AffectationProfOut, AffectationStatut } from "@/lib/types/api";

const STATUT_CONFIG: Record<
  AffectationStatut,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  proposee: { label: "Proposee", variant: "secondary" },
  validee: { label: "Validee", variant: "default" },
  rejetee: { label: "Rejetee", variant: "destructive" },
};

const SCORE_ITEMS = [
  { key: "score_comp", label: "Competences", className: "bg-score-competences" },
  { key: "score_exp", label: "Experience", className: "bg-score-experience" },
  { key: "score_hist", label: "Historique", className: "bg-score-historique" },
  { key: "score_sem", label: "Semantique", className: "bg-score-semantique" },
] as const;

interface MesAffectationsCardProps {
  affectation: AffectationProfOut;
}

function formatPct(value: number): string {
  return `${Math.round(Number(value) * 100)}%`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function linesFromJustification(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function MesAffectationsCard({ affectation }: MesAffectationsCardProps) {
  const [justificationOpen, setJustificationOpen] = useState(false);
  const statut = STATUT_CONFIG[affectation.statut];
  const coursLabel = affectation.cours_code
    ? `${affectation.cours_code} - ${affectation.cours_nom ?? ""}`.trim()
    : (affectation.cours_nom ?? `Cours #${affectation.cours_id}`);
  const valideLe = formatDate(affectation.valide_le);

  return (
    <>
      <article className="space-y-4 rounded-lg border border-border bg-canvas-pure p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-semibold text-fg" title={coursLabel}>
              {coursLabel}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {affectation.session_nom}
              </span>
              {valideLe && (
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Affectee le {valideLe}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {affectation.origine === "manuel" && (
              <Badge variant="outline" className="text-[10px]">
                Manuel
              </Badge>
            )}
            <Badge variant={statut.variant}>{statut.label}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-2xl font-bold tabular-nums text-fg">
              {formatPct(affectation.score_total)}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Score global
            </span>
          </div>
          <div className="grid gap-2 text-xs text-fg-muted sm:grid-cols-2">
            {SCORE_ITEMS.map(({ key, label, className }) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${className}`} aria-hidden="true" />
                {label} {formatPct(affectation[key])}
              </span>
            ))}
          </div>
        </div>

        {affectation.justification && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-0 text-fg-muted hover:text-fg"
            onClick={() => setJustificationOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Voir la justification IA
          </Button>
        )}
      </article>

      <Dialog open={justificationOpen} onOpenChange={setJustificationOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              Justification IA
            </DialogTitle>
            <DialogDescription>{coursLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border border-border bg-canvas-pure p-4 text-sm leading-relaxed text-fg">
            {affectation.justification &&
              linesFromJustification(affectation.justification).map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
