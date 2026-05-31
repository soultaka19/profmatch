"use client";

import { Brain, Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { GenerationPhase } from "@/lib/types/api";

type StepState = "pending" | "active" | "done";

const STEPS: { id: number; label: string }[] = [
  { id: 1, label: "Analyse des profils traités" },
  { id: 2, label: "Chargement des cours et compétences" },
  { id: 3, label: "Calcul des scores W1 – W4" },
  { id: 4, label: "Composition des propositions d'affectation" },
];

const STEP_INTERVAL_MS = 550;

const ANNOUNCE: Record<GenerationPhase, string> = {
  pending: "Génération en attente de traitement",
  queued: "Génération en attente de traitement",
  processing: "Génération en cours, l'IA compose les propositions d'affectation",
  done: "Génération terminée, propositions prêtes",
  error: "La génération a échoué",
};

/**
 * Overlay immersif du pipeline de génération — la fonctionnalité phare.
 *
 * Au lieu d'un simple spinner sur fond blanc, on matérialise le travail de
 * l'IA : un panneau pleine largeur sur fond dégradé teinté, traversé d'une
 * barre de progression indéterminée et d'un shimmer diagonal, avec une
 * pastille « cerveau » en halo pulsé. Les 4 étapes passent automatiquement
 * de `active` (◐) à `done` (✓) à intervalle régulier ; quand `status === "done"`
 * elles sont toutes cochées d'un coup (génération arrivée si vite que la
 * progression visuelle n'a pas eu le temps de s'amorcer).
 *
 * Le langage visuel (progress-slide / shimmer / dot-pulse / halo-pulse) est
 * partagé avec l'extraction de CV (`ProgressCard`) pour une expérience cohérente.
 */
export function GenerationProgress({ status = "queued" }: { status?: GenerationPhase }) {
  const [currentStep, setCurrentStep] = useState(0);
  const isDone = status === "done";

  useEffect(() => {
    if (isDone) return;
    const interval = window.setInterval(() => {
      setCurrentStep((step) => (step < STEPS.length - 1 ? step + 1 : step));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isDone]);

  const stateFor = (index: number): StepState => {
    if (isDone) return "done";
    if (index < currentStep) return "done";
    if (index === currentStep) return "active";
    return "pending";
  };

  return (
    <section
      aria-labelledby="gen-overlay-title"
      className="relative overflow-hidden rounded-2xl border border-primary-border/50 bg-gradient-to-br from-primary-soft via-canvas-pure to-canvas px-6 py-12 shadow-lift"
    >
      {/* Barre de progression indéterminée en haut */}
      {!isDone && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 animate-progress-slide bg-[length:200%_100%]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
          }}
        />
      )}
      {/* Shimmer diagonal */}
      {!isDone && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-shimmer bg-[length:200%_100%]"
          style={{
            backgroundImage:
              "linear-gradient(110deg, transparent 35%, var(--primary-tint) 50%, transparent 65%)",
          }}
        />
      )}
      {/* Halos flottants qui matérialisent l'activité en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 top-1/4 h-44 w-44 animate-dot-pulse rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 animate-dot-pulse rounded-full bg-primary/10 blur-3xl"
        style={{ animationDelay: "0.7s" }}
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-7 text-center">
        {/* Pastille IA animée */}
        <div className="flex flex-col items-center gap-3">
          <span
            className={
              isDone
                ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
                : "flex h-14 w-14 animate-halo-pulse items-center justify-center rounded-2xl bg-primary/12 text-primary"
            }
          >
            {isDone ? (
              <Check className="h-7 w-7" aria-hidden />
            ) : (
              <span className="relative">
                <Brain className="h-7 w-7" aria-hidden />
                <Sparkles
                  className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-dot-pulse text-primary"
                  aria-hidden
                />
              </span>
            )}
          </span>
          <h3
            id="gen-overlay-title"
            className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary"
          >
            {isDone ? "Propositions prêtes" : "L'IA compose les affectations"}
          </h3>
        </div>

        <ol className="flex w-full flex-col gap-3 text-left">
          {STEPS.map((step, index) => {
            const state = stateFor(index);
            return (
              <li
                key={step.id}
                aria-label={`Étape ${step.id} sur ${STEPS.length}`}
                data-state={state}
                className="flex items-center gap-3 text-sm transition-colors duration-300"
              >
                <StepIcon state={state} />
                <span
                  className={
                    state === "done"
                      ? "text-fg-muted line-through decoration-fg-muted/40"
                      : state === "active"
                      ? "font-medium text-fg"
                      : "text-fg-muted/70"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <p role="status" aria-live="polite" className="text-xs font-medium text-fg-muted">
          {ANNOUNCE[status]}
        </p>
      </div>
    </section>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-300">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex h-6 w-6 shrink-0 animate-halo-pulse items-center justify-center rounded-full border border-primary text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-fg-muted/40"
      aria-hidden
    >
      <span className="h-1.5 w-1.5 rounded-full bg-fg-muted/30" />
    </span>
  );
}
