import { Badge } from "@/components/ui/badge";
import type { GenerationScope } from "./types";

export function GenerationScopeSummary({ scope }: { scope: GenerationScope }) {
  const programmes = scope.programmes
    .map((programme) => `${programme.code} - ${programme.nom}`)
    .join(", ");
  const etapes =
    scope.etapes.length > 0
      ? scope.etapes.map((etape) => `Étape ${etape.ordre}`).join(", ")
      : "Toutes les étapes";

  return (
    <section
      aria-label="Périmètre de la génération"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-canvas-pure px-4 py-3 text-sm"
    >
      <span className="font-medium text-fg">{scope.session.nom}</span>
      <Badge variant="outline">{programmes}</Badge>
      <Badge variant="secondary">{etapes}</Badge>
      <span className="text-xs tabular-nums text-fg-muted">
        W1 {Math.round(scope.weights.w1 * 100)}% · W2 {Math.round(scope.weights.w2 * 100)}% · W3{" "}
        {Math.round(scope.weights.w3 * 100)}% · W4 {Math.round(scope.weights.w4 * 100)}%
      </span>
    </section>
  );
}
