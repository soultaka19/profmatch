"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { GenerationPhase } from "@/lib/types/api";

type StepState = "pending" | "active" | "done";

const STEPS: { id: number; label: string }[] = [
  { id: 1, label: "Analyse des profils traités" },
  { id: 2, label: "Chargement des cours et compétences" },
  { id: 3, label: "Calcul des scores W1 – W4" },
  { id: 4, label: "Rédaction des justifications XAI" },
];

const STEP_INTERVAL_MS = 550;

const ANNOUNCE: Record<GenerationPhase, string> = {
  pending: "Génération en attente de traitement",
  queued: "Génération en attente de traitement",
  processing: "Génération en cours, calcul des propositions",
  done: "Génération terminée",
  error: "La génération a échoué",
};

/**
 * Overlay pipeline qui matérialise les 4 étapes de génération.
 *
 * Plutôt qu'un spinner muet qui inquiète, on montre au RH où en est le système :
 * chaque étape passe automatiquement de `active` (◐ rotatif) à `done` (✓) à
 * intervalle régulier. Quand `status === "done"`, toutes les étapes sont
 * cochées d'un coup — utile si la génération est arrivée si vite (< 2 s) que
 * la progression visuelle n'a pas eu le temps de s'amorcer.
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
      className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-canvas-pure/95 px-8 py-10 text-center shadow-lg backdrop-blur-sm"
    >
      <h3 id="gen-overlay-title" className="text-sm font-medium tracking-wide text-fg-muted uppercase">
        Pipeline ProfMatch
      </h3>

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
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary text-primary">
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
