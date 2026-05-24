"use client";

import useSWR from "swr";
import { CalendarRange, Palmtree, Repeat } from "lucide-react";
import { programmesApi } from "@/lib/api/programmes";
import type { ProgrammeCalendrier } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
}

const SEMESTRE_META: Record<
  string,
  { label: string; icon: string; classes: string; vacIcon: string }
> = {
  automne: {
    label: "Automne",
    icon: "🍂",
    classes:
      "border-orange-300 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-800",
    vacIcon: "🌴",
  },
  hiver: {
    label: "Hiver",
    icon: "❄️",
    classes:
      "border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800",
    vacIcon: "🌴",
  },
  printemps: {
    label: "Printemps",
    icon: "🌱",
    classes:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800",
    vacIcon: "🌴",
  },
};

const ORDER = ["automne", "hiver", "printemps"];

export function ProgrammeCalendarPanel({ programmeId }: Props) {
  const { data, isLoading } = useSWR<ProgrammeCalendrier>(
    `programme-calendrier:${programmeId}`,
    () => programmesApi.calendrier(programmeId),
  );

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-border bg-bg p-4">
        <p className="text-sm text-fg-muted">Chargement du calendrier…</p>
      </div>
    );
  }

  const rythmeLabel = data.rythme === "continu"
    ? "Continu (3 sessions actives / année)"
    : "Standard (2 sessions actives / année)";

  return (
    <div className="rounded-lg border border-border bg-bg overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-fg-muted" />
          <h3 className="font-semibold text-fg">Année académique</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Repeat className="h-4 w-4 text-fg-muted" />
          <span className="font-medium">{rythmeLabel}</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {ORDER.map((s) => {
          const isActive = data.sessions_actives.includes(s);
          const meta = SEMESTRE_META[s];
          return (
            <div
              key={s}
              className={
                "flex items-center gap-3 px-4 py-3 " +
                (isActive ? "" : "opacity-60")
              }
            >
              <span className="text-2xl" aria-hidden="true">
                {isActive ? meta.icon : meta.vacIcon}
              </span>
              <div className="flex-1">
                <p className="font-medium">{meta.label}</p>
                <p className="text-xs text-fg-muted">
                  {isActive ? "Étapes dispensées" : "Vacances — aucune étape"}
                </p>
              </div>
              <span
                className={
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium " +
                  (isActive
                    ? meta.classes
                    : "border-border bg-bg-muted text-fg-muted")
                }
              >
                {isActive ? "✓ Actif" : "🌴 Vacances"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-bg-muted/30 px-4 py-2 text-xs text-fg-muted">
        {data.etapes_total > 0 ? (
          <>
            <strong className="text-fg">{data.etapes_total}</strong> étape
            {data.etapes_total > 1 ? "s" : ""} configurée
            {data.etapes_total > 1 ? "s" : ""} dans le programme.{" "}
            {data.rythme === "continu" ? (
              <>Les cohortes s&apos;enchaînent sans pause.</>
            ) : data.vacances.length > 0 ? (
              <>
                Pause au {SEMESTRE_META[data.vacances[0]]?.label ?? data.vacances[0]} —
                les cohortes reprennent la session suivante.
              </>
            ) : null}
          </>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Palmtree className="h-3 w-3" />
            Aucune étape configurée pour ce programme.
          </span>
        )}
      </div>
    </div>
  );
}
