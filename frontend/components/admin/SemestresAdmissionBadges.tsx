"use client";

import { Badge } from "@/components/ui/badge";
import {
  SEMESTRE_LABEL,
  type SemestreAdmission,
} from "@/lib/types/programmes";
import type { Semestre } from "@/lib/types/api";

interface Props {
  semestres: Semestre[];
}

function variantFor(s: Semestre): "default" | "secondary" | "outline" {
  if (s === "automne") return "default";
  if (s === "hiver") return "secondary";
  return "outline";
}

export function SemestresAdmissionBadges({ semestres }: Props) {
  if (!semestres || semestres.length === 0) {
    return <span className="text-fg-muted text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {semestres.map((s) => {
        // Cas de l'enum backend "ete" non exposé dans l'UI : on l'affiche tel quel.
        const label =
          s in SEMESTRE_LABEL
            ? SEMESTRE_LABEL[s as SemestreAdmission]
            : s.charAt(0).toUpperCase() + s.slice(1);
        return (
          <Badge key={s} variant={variantFor(s)} className="text-xs">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
