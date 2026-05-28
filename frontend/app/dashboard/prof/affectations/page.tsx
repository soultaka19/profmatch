"use client";

import { useMemo } from "react";
import { AlertCircle, BookOpen, Loader2, Sparkles } from "lucide-react";
import useSWR from "swr";
import { MesAffectationsCard } from "@/components/affectation/MesAffectationsCard";
import { affectationsApi } from "@/lib/api/affectations";
import type { AffectationProfOut } from "@/lib/types/api";

function groupBySession(affectations: AffectationProfOut[]) {
  const groups = new Map<string, AffectationProfOut[]>();
  for (const affectation of affectations) {
    const current = groups.get(affectation.session_nom) ?? [];
    current.push(affectation);
    groups.set(affectation.session_nom, current);
  }
  return Array.from(groups.entries()).map(([sessionNom, items]) => ({ sessionNom, items }));
}

export default function MesAffectationsPage() {
  const { data, error, isLoading } = useSWR<AffectationProfOut[]>(
    "/api/affectations/mes-affectations",
    affectationsApi.mesAffectations,
    { refreshInterval: 30_000 }
  );

  const groups = useMemo(() => groupBySession(data ?? []), [data]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-fg">Mes affectations</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-fg-muted">
          Consultez vos affectations validees, avec les scores de correspondance
          et les justifications disponibles.
        </p>
      </header>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement de vos affectations...
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Impossible de charger vos affectations. Rechargez la page.
        </div>
      )}

      {!isLoading && !error && (data ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-canvas-pure py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-fg">Aucune affectation pour le moment</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">
              Vos affectations apparaitront ici lorsqu&apos;elles seront validees.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Les justifications IA restent consultables en lecture seule.
          </div>
        </div>
      )}

      {!isLoading && !error && (data ?? []).length > 0 && (
        <div className="space-y-6">
          {groups.map(({ sessionNom, items }) => (
            <section key={sessionNom} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                {sessionNom}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((affectation) => (
                  <MesAffectationsCard key={affectation.id} affectation={affectation} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
