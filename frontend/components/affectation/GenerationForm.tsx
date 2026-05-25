"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  etapesApi,
  sessionsApi,
} from "@/lib/api/affectations";
import type { EtapeProgramme, PonderationsOut, Programme, Session } from "@/lib/types/api";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";

interface GenerationFormProps {
  onTaskStarted: (taskId: string, sessionId: number) => void;
}

function ProgrammeEtapesSection({
  programme,
  selectedEtapeIds,
  onToggleEtape,
}: {
  programme: Programme;
  selectedEtapeIds: number[];
  onToggleEtape: (etapeId: number) => void;
}) {
  const { data: etapes } = useSWR<EtapeProgramme[]>(
    `/api/programmes/${programme.id}/etapes`,
    () => etapesApi.list(programme.id)
  );

  if (!etapes || etapes.length === 0) return null;

  return (
    <div className="ml-2 mt-2 space-y-1 border-l-2 border-border pl-3">
      <p className="text-xs font-medium text-fg-muted">
        {"Étapes"} &mdash; {programme.code}
      </p>
      {etapes.map((etape) => (
        <label
          key={etape.id}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            checked={selectedEtapeIds.includes(etape.id)}
            onCheckedChange={() => onToggleEtape(etape.id)}
          />
          <span>
            {"Étape"} {etape.ordre}
            {etape.nom ? ` — ${etape.nom}` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

export function GenerationForm({ onTaskStarted }: GenerationFormProps) {
  const {
    data: sessions,
    error: sessionsError,
    isLoading: sessionsLoading,
  } = useSWR<Session[]>("/api/sessions/", sessionsApi.list);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<Set<number>>(new Set());
  const [selectedEtapeIds, setSelectedEtapeIds] = useState<number[]>([]);
  const [weights, setWeights] = useState<Weights>({ w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 });
  const [isSaving, setIsSaving] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Programmes éligibles pour la session sélectionnée
  const {
    data: programmes,
    error: programmesError,
    isLoading: programmesLoading,
  } = useSWR<Programme[]>(
    selectedSessionId
      ? `/api/sessions/${selectedSessionId}/programmes-eligibles`
      : null,
    selectedSessionId
      ? () => sessionsApi.programmesEligibles(selectedSessionId)
      : null
  );

  // Pondérations actuelles de la session
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

  // Réinitialiser les sélections quand la session change
  useEffect(() => {
    setSelectedProgrammeIds(new Set());
    setSelectedEtapeIds([]);
  }, [selectedSessionId]);

  const sumValid =
    Math.abs(weights.w1 + weights.w2 + weights.w3 + weights.w4 - 1) <= 0.001;
  const canLaunch =
    selectedSessionId !== null &&
    selectedProgrammeIds.size > 0 &&
    sumValid &&
    !programmesLoading &&
    !programmesError;

  function toggleProgramme(id: number) {
    setSelectedProgrammeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleEtape(etapeId: number) {
    setSelectedEtapeIds((prev) =>
      prev.includes(etapeId)
        ? prev.filter((id) => id !== etapeId)
        : [...prev, etapeId]
    );
  }

  async function handleLaunch() {
    if (!selectedSessionId || !canLaunch) return;
    setLaunchError(null);
    setIsSaving(true);
    try {
      await sessionsApi.updatePonderations(selectedSessionId, weights);
      const etapeIds =
        selectedEtapeIds.length > 0 ? selectedEtapeIds : undefined;
      const res = await affectationsApi.generer(
        selectedSessionId,
        Array.from(selectedProgrammeIds),
        etapeIds
      );
      onTaskStarted(res.task_id, selectedSessionId);
    } catch (err) {
      setLaunchError(
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
          {"Générer les affectations"}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {"Sélectionnez la session, les programmes et étapes concernés, puis ajustez les pondérations avant de lancer."}
        </p>
      </div>

      {/* Session */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg">
          Session {"académique"}
        </label>
        {sessionsLoading && (
          <p className="flex items-center gap-2 text-xs text-fg-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement des sessions...
          </p>
        )}
        {sessionsError && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Impossible de charger les sessions.
          </p>
        )}
        <Select
          value={selectedSessionId?.toString() ?? ""}
          onValueChange={(v) => setSelectedSessionId(Number(v))}
          disabled={sessionsLoading || Boolean(sessionsError)}
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

      {/* Programmes éligibles + étapes */}
      {selectedSessionId && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-fg">
            Programmes {"éligibles"}
          </label>
          {programmesLoading ? (
            <p className="flex items-center gap-2 text-xs text-fg-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Chargement des programmes éligibles...
            </p>
          ) : programmesError ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Impossible de charger les programmes éligibles.
            </p>
          ) : (programmes ?? []).length === 0 ? (
            <p className="text-xs text-fg-muted">
              Aucun programme actif pour cette session.
            </p>
          ) : (
            <div className="space-y-3">
              {(programmes ?? []).map((p) => {
                const selected = selectedProgrammeIds.has(p.id);
                return (
                  <div key={p.id}>
                    <Button
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      type="button"
                      aria-pressed={selected}
                      className="justify-start text-left"
                      onClick={() => toggleProgramme(p.id)}
                    >
                      {selected && <Check className="h-4 w-4" />}
                      {p.code} &mdash; {p.nom}
                    </Button>
                    {selected && (
                      <ProgrammeEtapesSection
                        programme={p}
                        selectedEtapeIds={selectedEtapeIds}
                        onToggleEtape={toggleEtape}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {selectedProgrammeIds.size === 0 && (programmes ?? []).length > 0 && (
            <p className="text-xs text-fg-muted">
              {"Sélectionnez au moins un programme."}
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

      {launchError && <p className="text-sm text-destructive">{launchError}</p>}

      <Button
        onClick={handleLaunch}
        disabled={!canLaunch || isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {"Enregistrement…"}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Lancer la {"génération"}
          </>
        )}
      </Button>
    </div>
  );
}
