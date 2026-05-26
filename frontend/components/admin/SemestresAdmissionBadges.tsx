"use client";

import {
  SEMESTRE_LABEL,
  type SemestreAdmission,
} from "@/lib/types/programmes";
import type { Semestre } from "@/lib/types/api";

interface Props {
  semestres: Semestre[];
}

// Palette par semestre : couleur évocatrice (feuilles d'automne, glace d'hiver,
// pousses de printemps, soleil d'été). Classes Tailwind statiques pour rester
// compatibles avec le JIT compiler.
const SEMESTRE_CLASSES: Record<string, string> = {
  automne:
    "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
  hiver:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  printemps:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  ete:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
};

// Émoji discret pour renforcer l'identité visuelle.
const SEMESTRE_ICON: Record<string, string> = {
  automne: "🍂",
  hiver: "❄️",
  printemps: "🌱",
  ete: "☀️",
};

export function SemestresAdmissionBadges({ semestres }: Props) {
  if (!semestres || semestres.length === 0) {
    return <span className="text-fg-muted text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {semestres.map((s) => {
        const label =
          s in SEMESTRE_LABEL
            ? SEMESTRE_LABEL[s as SemestreAdmission]
            : s.charAt(0).toUpperCase() + s.slice(1);
        const colorClasses =
          SEMESTRE_CLASSES[s] ?? "bg-surface text-fg-muted border-border";
        const icon = SEMESTRE_ICON[s] ?? "";
        return (
          <span
            key={s}
            className={
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium " +
              colorClasses
            }
          >
            {icon && <span aria-hidden="true">{icon}</span>}
            {label}
          </span>
        );
      })}
    </div>
  );
}
