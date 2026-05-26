"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sessionsApi } from "@/lib/api/sessions";
import type { Session, SessionStatut } from "@/lib/types/api";
import { STATUT_CLASSES, STATUT_LABEL } from "@/lib/types/sessions";
import { Loader2 } from "lucide-react";

const STATUTS: SessionStatut[] = ["planifiee", "ouverte", "fermee"];

interface Props {
  session: Session;
  onUpdated: () => void;
}

export function SessionStatusSwitcher({ session, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState<SessionStatut | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatut(statut: SessionStatut) {
    if (statut === session.statut) return;
    setSubmitting(statut);
    setError(null);
    try {
      await sessionsApi.update(session.id, { statut });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-md border border-border bg-canvas-pure p-1 shadow-sm">
        {STATUTS.map((s) => {
          const active = s === session.statut;
          return (
            <button
              key={s}
              type="button"
              disabled={submitting !== null}
              onClick={() => setStatut(s)}
              className={
                "inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition " +
                (active
                  ? STATUT_CLASSES[s] + " border"
                  : "text-fg-muted hover:bg-surface")
              }
            >
              {submitting === s && <Loader2 className="h-3 w-3 animate-spin" />}
              {STATUT_LABEL[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
