"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeightSliders } from "./WeightSliders";
import type { Weights } from "./WeightSliders";
import {
  affectationsApi,
  programmesApi,
  sessionsApi,
} from "@/lib/api/affectations";
import type { PonderationsOut, Programme, Session } from "@/lib/types/api";
import { Loader2, Sparkles } from "lucide-react";

interface GenerationFormProps {
  onTaskStarted: (taskId: string, sessionId: number) => void;
}

export function GenerationForm({ onTaskStarted }: GenerationFormProps) {
  const { data: sessions } = useSWR<Session[]>("/api/sessions/", sessionsApi.list);
  const { data: programmes } = useSWR<Programme[]>("/api/programmes/", programmesApi.list);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<Set<number>>(new Set());
  const [weights, setWeights] = useState<Weights>({ w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les pondérations actuelles de la session sélectionnée
  const { data: ponderations } = useSWR<PonderationsOut>(
    selectedSessionId ? `/api/sessions/${selectedSessionId}/ponderations` : null,
    selectedSessionId ? () => sessionsApi.getPonderations(selectedSessionId) : null
  );

  useEffect(() => {
    if (ponderations) {
      setWeights({
        w1: Number(ponderations.w1),
        w2: Number(ponderations.w2),
        w3: Number(ponderations.w3),
        w4: Number(ponderations.w4),
      });
    }
  }, [ponderations]);

  const sumValid =
    Math.abs(weights.w1 + weights.w2 + weights.w3 + weights.w4 - 1) <= 0.001;
  const canLaunch =
    selectedSessionId !== null && selectedProgrammeIds.size > 0 && sumValid;

  function toggleProgramme(id: number) {
    setSelectedProgrammeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleLaunch() {
    if (!selectedSessionId || !canLaunch) return;
    setError(null);
    setIsSaving(true);
    try {
      await sessionsApi.updatePonderations(selectedSessionId, weights);
      const res = await affectationsApi.generer(
        selectedSessionId,
        Array.from(selectedProgrammeIds)
      );
      onTaskStarted(res.task_id, selectedSessionId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du lancement"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg">
          Générer les affectations
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Sélectionnez la session, les programmes et ajustez les pondérations
          avant de lancer.
        </p>
      </div>

      {/* Session */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg">
          Session académique
        </label>
        <Select
          value={selectedSessionId?.toString() ?? ""}
          onValueChange={(v) => setSelectedSessionId(Number(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir une session…" />
          </SelectTrigger>
          <SelectContent>
            {(sessions ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Programmes */}
      {selectedSessionId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-fg">Programmes</label>
          <div className="flex flex-wrap gap-2">
            {(programmes ?? []).map((p) => {
              const selected = selectedProgrammeIds.has(p.id);
              return (
                <Button
                  key={p.id}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleProgramme(p.id)}
                >
                  {p.code} — {p.nom}
                </Button>
              );
            })}
          </div>
          {selectedProgrammeIds.size === 0 && (
            <p className="text-xs text-fg-muted">
              Sélectionnez au moins un programme.
            </p>
          )}
        </div>
      )}

      {/* Sliders W1-W4 */}
      {selectedSessionId && (
        <WeightSliders
          value={weights}
          onChange={setWeights}
          disabled={isSaving}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleLaunch}
        disabled={!canLaunch || isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Lancer la génération
          </>
        )}
      </Button>
    </div>
  );
}
