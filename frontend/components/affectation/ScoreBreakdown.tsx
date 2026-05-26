import { Badge } from "@/components/ui/badge";

interface Scores {
  comp: number;
  exp: number;
  hist: number;
  sem: number;
}

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface ScoreBreakdownProps {
  scores: Scores;
  poids: Poids;
  total: number;
}

const SEGMENTS = [
  { key: "comp" as keyof Scores, pKey: "w1" as keyof Poids, className: "bg-score-competences", label: "Compétences" },
  { key: "exp" as keyof Scores, pKey: "w2" as keyof Poids, className: "bg-score-experience", label: "Expérience" },
  { key: "hist" as keyof Scores, pKey: "w3" as keyof Poids, className: "bg-score-historique", label: "Historique" },
  { key: "sem" as keyof Scores, pKey: "w4" as keyof Poids, className: "bg-score-semantique", label: "Sémantique" },
];

function recommendation(total: number): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (total >= 0.8) return { label: "Fortement recommandé", variant: "default" };
  if (total >= 0.6) return { label: "Recommandé avec réserves", variant: "secondary" };
  return { label: "À examiner", variant: "outline" };
}

export function ScoreBreakdown({ scores, poids, total }: ScoreBreakdownProps) {
  const reco = recommendation(Number(total));
  const pct = Math.round(Number(total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold tabular-nums text-fg">{pct}%</span>
        <Badge variant={reco.variant}>{reco.label}</Badge>
      </div>

      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-surface"
        aria-label={`Score total ${pct}%`}
      >
        {SEGMENTS.map(({ key, pKey, className, label }) => {
          const contribution = scores[key] * poids[pKey];
          return (
            <div
              key={key}
              className={className}
              style={{ width: `${contribution * 100}%` }}
              title={`${label}: ${Math.round(Number(scores[key]) * 100)}%`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {SEGMENTS.map(({ key, className, label }) => (
          <span key={key} className="flex items-center gap-1 text-xs text-fg-muted">
            <span
              className={`inline-block h-2 w-2 rounded-full ${className}`}
              aria-hidden="true"
            />
            {label} {Math.round(Number(scores[key]) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
