import type { AffectationOut } from "@/lib/types/api";
import { getRecommendationFilter } from "./recommendation";

export function ReviewSummary({ affectations }: { affectations: AffectationOut[] }) {
  const cours = new Set(affectations.map((affectation) => affectation.cours_id)).size;
  const traitees = affectations.filter((affectation) => affectation.statut !== "proposee").length;
  const recommandations = affectations.reduce(
    (counts, affectation) => {
      counts[getRecommendationFilter(affectation.score_total)] += 1;
      return counts;
    },
    { forte: 0, reserves: 0, examiner: 0 }
  );

  return (
    <section aria-label="Synthèse des propositions" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <SummaryItem value={cours} label={`cours analysé${cours > 1 ? "s" : ""}`} />
      <SummaryItem
        value={affectations.length}
        label={`proposition${affectations.length > 1 ? "s" : ""}`}
      />
      <SummaryItem
        value={traitees}
        label={`traitée${traitees > 1 ? "s" : ""} sur ${affectations.length}`}
      />
      <SummaryItem value={recommandations.forte} label="fortement recommandée" />
      <SummaryItem value={recommandations.reserves} label="avec réserves" />
      <SummaryItem value={recommandations.examiner} label="à examiner" />
    </section>
  );
}

function SummaryItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-border bg-canvas-pure px-3 py-3">
      <p className="text-sm text-fg-muted">
        <span className="mr-1 text-lg font-semibold tabular-nums text-fg">{value}</span>
        {label}
      </p>
    </div>
  );
}
