import { ArrowRight, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type StepKey = "upload" | "extraction" | "indexation";

interface Step {
  key: StepKey;
  label: string;
}

const STEPS: Step[] = [
  { key: "upload", label: "Téléversé" },
  { key: "extraction", label: "Extraction du texte" },
  { key: "indexation", label: "Indexation" },
];

interface Props {
  fileName: string;
  fileMeta: string;
  activeStep: StepKey;
}

function stepState(activeStep: StepKey, step: StepKey): "done" | "active" | "pending" {
  const order: StepKey[] = ["upload", "extraction", "indexation"];
  const ai = order.indexOf(activeStep);
  const si = order.indexOf(step);
  if (si < ai) return "done";
  if (si === ai) return "active";
  return "pending";
}

export function ProgressCard({ fileName, fileMeta, activeStep }: Props) {
  return (
    <div className="relative mt-6 max-w-[680px] overflow-hidden rounded-lg border border-border bg-canvas px-6 py-6 shadow-soft ring-4 ring-warning/[0.04]">
      {/* Progress bar indéterminée en haut */}
      <div
        className="absolute left-0 right-0 top-0 h-0.5 animate-progress-slide bg-[length:200%_100%]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, #B45309 30%, #D97706 50%, #B45309 70%, transparent 100%)",
        }}
      />
      {/* Shimmer diagonal */}
      <div
        className="pointer-events-none absolute inset-0 animate-shimmer bg-[length:200%_100%]"
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 30%, rgba(180,83,9,0.04) 50%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3.5 py-1.5 text-xs font-semibold text-warning">
          {/* Motif IA partagé avec le pipeline de génération — « l'IA travaille » */}
          <span className="relative inline-flex">
            <Brain className="h-3.5 w-3.5" aria-hidden />
            <Sparkles
              className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-dot-pulse"
              aria-hidden
            />
          </span>
          Extraction en cours
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-fg">{fileName}</div>
          <div className="mt-0.5 text-xs text-fg-subtle">{fileMeta}</div>
        </div>
        {/* Spinner conique */}
        <div
          className="h-7 w-7 animate-spinner-conic rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #B45309, transparent 70%)",
            WebkitMask: "radial-gradient(circle, transparent 56%, black 60%)",
            mask: "radial-gradient(circle, transparent 56%, black 60%)",
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative mt-5 flex items-center gap-3 border-t border-border-soft pt-4 text-xs text-fg-subtle">
        {STEPS.map((step, idx) => {
          const state = stepState(activeStep, step.key);
          return (
            <div key={step.key} className="contents">
              <div
                data-testid={`step-${step.key}`}
                data-state={state}
                className={cn(
                  "inline-flex items-center gap-2",
                  state === "done" && "text-success",
                  state === "active" && "font-medium text-warning"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 flex-shrink-0 rounded-full bg-border",
                    state === "done" && "bg-success",
                    state === "active" && "animate-halo-pulse bg-warning"
                  )}
                />
                {step.label}
              </div>
              {idx < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-border" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
