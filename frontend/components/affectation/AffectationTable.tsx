"use client";

import { AffectationCard } from "./AffectationCard";
import type { AffectationOut } from "@/lib/types/api";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface AffectationTableProps {
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
}

export function AffectationTable({
  affectations,
  coursNames,
  professorNames,
  poids,
  onValidate,
  onReject,
}: AffectationTableProps) {
  if (affectations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Aucune proposition d&apos;affectation générée.
      </p>
    );
  }

  // Grouper par cours_id, trier chaque groupe par score desc
  const groups = affectations.reduce<Record<number, AffectationOut[]>>(
    (acc, aff) => {
      if (!acc[aff.cours_id]) acc[aff.cours_id] = [];
      acc[aff.cours_id].push(aff);
      return acc;
    },
    {}
  );

  Object.values(groups).forEach((group) =>
    group.sort((a, b) => b.score_total - a.score_total)
  );

  const coursIds = Object.keys(groups).map(Number).sort();

  return (
    <div className="space-y-8">
      {coursIds.map((coursId) => {
        const group = groups[coursId];
        const coursName = coursNames[coursId] ?? `Cours #${coursId}`;
        const n = group.length;

        return (
          <section key={coursId}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-fg">{coursName}</h3>
              <span className="text-xs text-fg-muted">
                {n} candidat{n > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((aff) => (
                <AffectationCard
                  key={aff.id}
                  aff={aff}
                  poids={poids}
                  professorName={
                    professorNames[aff.professeur_id] ??
                    `Prof #${aff.professeur_id}`
                  }
                  onValidate={onValidate}
                  onReject={onReject}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
