"use client";

import { BookOpen, Brain, Check, Loader2, Sparkles, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CompetenceRequiseOut, JustificationDetailOut } from "@/lib/types/api";

import { getRecommendationFilter } from "./recommendation";

interface Props {
  open: boolean;
  loading: boolean;
  detail: JustificationDetailOut | null;
  onClose: () => void;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
}

/**
 * Panneau « Match compétences » — wireframe B.
 *
 * Trois zones, lecture verticale rapide :
 *   1. Header  → nom prof, cours, score global avec barre de remplissage
 *   2. Match   → compétences requises (✓ / ✗ + importance ★) à gauche,
 *                compétences maîtrisées en chips à droite
 *   3. Méta    → expérience, historique RH, similarité sémantique en ligne
 *   4. Analyse → narration LLM dans un encadré dédié
 *   5. Actions → Valider / Rejeter sticky en pied de panneau
 *
 * Données fournies par l'endpoint GET /api/affectations/{id}/justification —
 * fetch piloté par le parent qui contrôle `open` + `loading` + `detail`.
 */
export function JustificationDetailSheet({
  open,
  loading,
  detail,
  onClose,
  onValidate,
  onReject,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="p-0">
        {loading || !detail ? (
          <LoadingState />
        ) : (
          <DetailContent
            detail={detail}
            onValidate={onValidate}
            onReject={onReject}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-fg-muted">Chargement du détail…</p>
    </div>
  );
}

function DetailContent({
  detail,
  onValidate,
  onReject,
}: {
  detail: JustificationDetailOut;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const scorePct = Math.round(detail.score_total * 100);
  const reco = getRecommendationFilter(detail.score_total);
  const couvertes = detail.competences_requises.filter((c) => c.couverte).length;
  const total = detail.competences_requises.length;
  const w1pct = Math.round(detail.score_comp * 100);
  const w2pct = Math.round(detail.score_exp * 100);
  const w3pct = Math.round(detail.score_hist * 100);
  // Sépare les compétences supplémentaires (celles que le prof a en plus
  // de ce qui est demandé par le cours). Évite la redondance visuelle.
  const requisesLower = new Set(
    detail.competences_requises.map((c) => c.nom.toLowerCase()),
  );
  const supplementaires = detail.competences_maitrisees.filter(
    (c) => !requisesLower.has(c.toLowerCase()),
  );

  return (
    <div className="flex flex-col">
      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <SheetHeader className="border-b border-border bg-canvas-pure px-6 py-5">
        <SheetTitle className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Match compétences
        </SheetTitle>
        <SheetDescription className="sr-only">
          Détail de l&apos;affectation entre {detail.nom_professeur} et {detail.titre_cours}
        </SheetDescription>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-title-sm font-semibold text-fg">
              {detail.nom_professeur}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-medium text-fg">{detail.code_cours}</span> ·{" "}
              {detail.titre_cours}
            </p>
          </div>
          <ScoreBlock scorePct={scorePct} reco={reco} />
        </div>
      </SheetHeader>

      <div className="space-y-6 px-6 py-6">
        {/* ── 2. Match compétences ──────────────────────────────────────── */}
        <section aria-labelledby="match-comp">
          <header className="mb-3 flex items-center justify-between">
            <h3
              id="match-comp"
              className="text-sm font-semibold uppercase tracking-wide text-fg"
            >
              Compétences
            </h3>
            <span className="text-xs text-fg-muted">
              <span className="font-medium text-fg tabular-nums">
                {couvertes} / {total}
              </span>{" "}
              couvertes · W1 {w1pct} %
            </span>
          </header>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            {/* Colonne gauche : requises */}
            <ul className="space-y-1.5">
              {detail.competences_requises.length === 0 && (
                <li className="text-xs text-fg-muted">
                  Aucune compétence requise déclarée pour ce cours.
                </li>
              )}
              {detail.competences_requises.map((c) => (
                <CompetenceRequiseRow key={c.nom} c={c} />
              ))}
            </ul>

            {/* Séparateur vertical visible uniquement en sm+ */}
            <div
              aria-hidden
              className="hidden h-full w-px self-stretch bg-border sm:block"
            />

            {/* Colonne droite : compétences supplémentaires du prof */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                Compétences supplémentaires
              </p>
              {supplementaires.length === 0 ? (
                <p className="text-xs text-fg-muted">
                  Aucune compétence supplémentaire au-delà des requises.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {supplementaires.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. Métadonnées compactes ─────────────────────────────────── */}
        <section aria-labelledby="meta">
          <h3 id="meta" className="sr-only">
            Métadonnées du candidat
          </h3>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-canvas-pure p-4 sm:grid-cols-3">
            <MetaTile
              icon={<BookOpen className="h-4 w-4" aria-hidden />}
              label="Expérience"
              value={`${detail.annees_experience} ans`}
              hint={`W2 ${w2pct} %`}
            />
            <MetaTile
              icon={<Star className="h-4 w-4" aria-hidden />}
              label="Historique RH"
              value={
                detail.nb_sessions_precedentes > 0
                  ? `${detail.nb_sessions_precedentes} session${
                      detail.nb_sessions_precedentes > 1 ? "s" : ""
                    } · ${detail.note_rh_moyenne.toFixed(1)} / 5`
                  : "Aucune session précédente"
              }
              hint={`W3 ${w3pct} %`}
            />
            <MetaTile
              icon={<Brain className="h-4 w-4" aria-hidden />}
              label="Adéquation sémantique"
              value={detail.similarite_semantique.toFixed(2)}
              hint={`W4 ${Math.round(detail.score_sem * 100)} %`}
            />
          </div>
        </section>

        {/* ── 4. Narration IA ──────────────────────────────────────────── */}
        {detail.justification && (
          <section
            aria-labelledby="ia"
            className="rounded-lg border border-border bg-canvas px-5 py-4"
          >
            <header className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <h3
                id="ia"
                className="text-sm font-semibold uppercase tracking-wide text-fg"
              >
                Analyse IA
              </h3>
            </header>
            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
              {detail.justification}
            </p>
          </section>
        )}
      </div>

      {/* ── 5. Actions sticky ───────────────────────────────────────────── */}
      <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-canvas-pure px-6 py-4">
        <Button
          type="button"
          variant="outline"
          className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => onReject(detail.affectation_id)}
        >
          <X className="h-4 w-4" aria-hidden />
          Rejeter
        </Button>
        <Button
          type="button"
          className="gap-1.5"
          onClick={() => onValidate(detail.affectation_id)}
        >
          <Check className="h-4 w-4" aria-hidden />
          Valider
        </Button>
      </footer>
    </div>
  );
}

function ScoreBlock({
  scorePct,
  reco,
}: {
  scorePct: number;
  reco: "forte" | "reserves" | "examiner";
}) {
  const tone =
    reco === "forte"
      ? "text-emerald-700 dark:text-emerald-400"
      : reco === "reserves"
      ? "text-amber-700 dark:text-amber-400"
      : "text-fg-muted";
  const bar =
    reco === "forte"
      ? "bg-emerald-500"
      : reco === "reserves"
      ? "bg-amber-500"
      : "bg-fg-muted/50";
  const label =
    reco === "forte"
      ? "Recommandé"
      : reco === "reserves"
      ? "Avec réserves"
      : "À examiner";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className={`text-2xl font-semibold tabular-nums ${tone}`}>
        {scorePct} %
      </span>
      <div
        className="h-1.5 w-32 rounded-full bg-border/80"
        role="meter"
        aria-valuenow={scorePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score global ${scorePct} %`}
      >
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${scorePct}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium uppercase tracking-wide ${tone}`}>
        {label}
      </span>
    </div>
  );
}

function CompetenceRequiseRow({ c }: { c: CompetenceRequiseOut }) {
  const stars = "★".repeat(c.importance) + "☆".repeat(Math.max(0, 5 - c.importance));
  const tone = c.couverte
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-amber-700 dark:text-amber-400";
  return (
    <li
      data-testid={`requise-${c.nom}`}
      data-couverte={c.couverte}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm"
    >
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className={tone}>
          {c.couverte ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </span>
        <span className="font-medium text-fg">{c.nom}</span>
      </span>
      <span
        aria-label={`Importance ${c.importance} sur 5`}
        className="select-none text-xs tracking-tight text-fg-muted"
        title={`Importance ${c.importance} / 5`}
      >
        {stars}
      </span>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs text-fg-muted">
      {children}
    </span>
  );
}

function MetaTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-fg-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-fg">{value}</p>
        {hint && (
          <p className="mt-0.5 text-[11px] tabular-nums text-fg-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}
