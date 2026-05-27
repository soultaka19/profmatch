"use client";

import Link from "next/link";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { Programme } from "@/lib/types/api";
import { SemestresAdmissionBadges } from "./SemestresAdmissionBadges";
import { GraduationCap, ArrowRight } from "lucide-react";

interface Props {
  sessionId: number;
}

export function ProgrammesEligiblesPanel({ sessionId }: Props) {
  const { data, isLoading } = useSWR<Programme[]>(
    `session-eligibles:${sessionId}`,
    () => sessionsApi.programmesEligibles(sessionId),
  );

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-border bg-canvas-pure p-4">
        <p className="text-sm text-fg-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-canvas-pure overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-hover px-4 py-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-fg-muted" />
          <h3 className="font-semibold text-fg">Programmes éligibles</h3>
        </div>
        <span className="text-xs text-fg-muted">
          {data.length} programme{data.length > 1 ? "s" : ""}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-fg-muted">
          Aucun programme actif pour cette session. Les programmes qui n&apos;admettent qu&apos;en
          Automne sont en vacances aux sessions Printemps.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-fg-muted">{p.code}</span>
                  <span className="font-medium text-fg truncate">{p.nom}</span>
                </div>
                <div className="mt-1">
                  <SemestresAdmissionBadges semestres={p.semestres_admission} />
                </div>
              </div>
              <Link
                href={`/dashboard/admin/programmes/${p.id}`}
                className="text-fg-muted hover:text-fg"
                title="Ouvrir"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
