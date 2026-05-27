import type { AffectationOut } from "@/lib/types/api";
import { getRecommendationFilter } from "./recommendation";

export function ReviewSummary({ affectations }: { affectations: AffectationOut[] }) {
  const coursRestants = new Set(
    affectations.filter((affectation) => affectation.statut === "proposee").map((affectation) => affectation.cours_id)
  ).size;
  const enAttente = affectations.filter((affectation) => affectation.statut === "proposee").length;
  const validees = affectations.filter((affectation) => affectation.statut === "validee").length;
  const rejetees = affectations.filter((affectation) => affectation.statut === "rejetee").length;
  const recommandations = affectations.reduce(
    (counts, affectation) => {
      counts[getRecommendationFilter(affectation.score_total)] += 1;
      return counts;
    },
    { forte: 0, reserves: 0, examiner: 0 }
  );

  return (
    <section aria-label="Synthèse des propositions" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem value={coursRestants} label={`cours restant${coursRestants > 1 ? "s" : ""} à traiter`} />
        <SummaryItem value={enAttente} label={`proposition${enAttente > 1 ? "s" : ""} en attente`} />
        <SummaryItem value={validees} label={`validée${validees > 1 ? "s" : ""}`} />
        <SummaryItem value={rejetees} label={`rejetée${rejetees > 1 ? "s" : ""}`} />
      </div>
      <div className="flex flex-wrap gap-3" aria-label="Filtres de recommandation disponibles">
        <SummaryItem value={recommandations.forte} label="fortement recommandée" compact />
        <SummaryItem value={recommandations.reserves} label="avec réserves" compact />
        <SummaryItem value={recommandations.examiner} label="à examiner" compact />
      </div>
    </section>
  );
}

function SummaryItem({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-border bg-canvas-pure px-3 ${compact ? "py-2" : "py-3"}`}>
      <p className="text-sm text-fg-muted">
        <span className={`mr-1 font-semibold tabular-nums text-fg ${compact ? "text-base" : "text-lg"}`}>{value}</span>
        {label}
      </p>
    </div>
  );
}
