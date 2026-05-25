"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import type { AffectationOut, AffectationStatut } from "@/lib/types/api";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface AffectationCardProps {
  aff: AffectationOut;
  poids: Poids;
  professorName: string;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
  pendingAction?: "validate" | "reject" | null;
}

const STATUT_BADGE: Record<
  AffectationStatut,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  proposee: { label: "Proposée", variant: "secondary" },
  validee: { label: "Validée", variant: "default" },
  rejetee: { label: "Rejetée", variant: "destructive" },
};

export function AffectationCard({
  aff,
  poids,
  professorName,
  onValidate,
  onReject,
  pendingAction = null,
}: AffectationCardProps) {
  const statut = STATUT_BADGE[aff.statut];
  const isPending = pendingAction !== null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-canvas-pure p-4 shadow-sm">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-fg">{professorName}</p>
          <p className="text-xs text-fg-muted">Prof #{aff.professeur_id}</p>
        </div>
        <Badge variant={statut.variant}>{statut.label}</Badge>
      </div>

      {/* Score */}
      <ScoreBreakdown
        scores={{
          comp: aff.score_comp,
          exp: aff.score_exp,
          hist: aff.score_hist,
          sem: aff.score_sem,
        }}
        poids={poids}
        total={aff.score_total}
      />

      {/* Justification XAI */}
      {aff.justification && (
        <Accordion type="single" collapsible>
          <AccordionItem value="xai" className="border-none">
            <AccordionTrigger className="py-1 text-sm text-fg-muted hover:text-fg">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Justification IA
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                {aff.justification}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Actions */}
      {aff.statut === "proposee" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            disabled={isPending}
            onClick={() => onValidate(aff.id)}
          >
            {pendingAction === "validate" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            {pendingAction === "validate" ? "Validation..." : "Valider"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={isPending}
            onClick={() => onReject(aff.id)}
          >
            {pendingAction === "reject" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-1 h-4 w-4" />
            )}
            {pendingAction === "reject" ? "Rejet..." : "Rejeter"}
          </Button>
        </div>
      )}
    </div>
  );
}
