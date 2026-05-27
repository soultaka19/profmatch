"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { GenerationScope } from "./types";
import {
  affectationsApi,
  sessionsApi,
} from "@/lib/api/affectations";
import type { EtapeStatut, PonderationsOut, Programme, Session } from "@/lib/types/api";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";

interface GenerationFormProps {
  onTaskStarted: (taskId: string, sessionId: number, scope: GenerationScope) => void;
}

function ProgrammeEtapesSection({
  programme,
  sessionId,
  selectedEtapeIds,
  onToggleEtape,
  onEtapesLoaded,
}: {
  programme: Programme;
  sessionId: number;
  selectedEtapeIds: number[];
  onToggleEtape: (etapeId: number) => void;
  onEtapesLoaded: (programmeId: number, etapes: EtapeStatut[]) => void;
}) {
  const { data: etapes } = useSWR<EtapeStatut[]>(
    `/api/sessions/${sessionId}/programmes/${programme.id}/etapes-statut`,
    () => sessionsApi.etapesStatut(sessionId, programme.id)
  );

  useEffect(() => {
    if (etapes) onEtapesLoaded(programme.id, etapes);
  }, [etapes, onEtapesLoaded, programme.id]);

  if (!etapes || etapes.length === 0) return null;

  return (
    <div className="ml-2 mt-2 space-y-1 border-l-2 border-border pl-3">
      <p className="text-xs font-medium text-fg-muted">
        {"Étapes"} &mdash; {programme.code}
      </p>
      {etapes.map((etape) => (
        <label
          key={etape.id}
          className={`flex items-center gap-2 text-sm ${
            etape.affectation_complete ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <Checkbox
            checked={selectedEtapeIds.includes(etape.id)}
            disabled={etape.affectation_complete}
            onCheckedChange={() => onToggleEtape(etape.id)}
          />
          <span>
            {"Étape"} {etape.ordre}
            {etape.nom ? ` — ${etape.nom}` : ""}
          </span>
          {etape.affectation_complete && (
            <>
              <Badge variant="secondary">Déjà affectée</Badge>
              <span className="text-xs text-fg-muted">
                Cours déjà affectés pour cette étape
              </span>
            </>
          )}
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
  const [etapesByProgramme, setEtapesByProgramme] = useState<Record<number, EtapeStatut[]>>({});

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
    setEtapesByProgramme({});
  }, [selectedSessionId]);

  const handleEtapesLoaded = useCallback((programmeId: number, etapes: EtapeStatut[]) => {
    setEtapesByProgramme((previous) => ({ ...previous, [programmeId]: etapes }));
  }, []);

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
      if (next.has(id)) {
        next.delete(id);
        const removedIds = new Set((etapesByProgramme[id] ?? []).map((etape) => etape.id));
        setSelectedEtapeIds((selected) => selected.filter((etapeId) => !removedIds.has(etapeId)));
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleEtape(etapeId: number) {
    const complete = Object.values(etapesByProgramme)
      .flat()
      .find((etape) => etape.id === etapeId)?.affectation_complete;
    if (complete) return;
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
      const selectedProgrammes = (programmes ?? [])
        .filter((programme) => selectedProgrammeIds.has(programme.id))
        .map(({ id, code, nom }) => ({ id, code, nom }));
      const selectedEtapes = selectedProgrammes.flatMap((programme) =>
        (etapesByProgramme[programme.id] ?? [])
          .filter((etape) => selectedEtapeIds.includes(etape.id))
          .map((etape) => ({
            id: etape.id,
            ordre: etape.ordre,
            nom: etape.nom,
            programmeId: programme.id,
            programmeCode: programme.code,
          }))
      );
      const selectedSession = sessions?.find((session) => session.id === selectedSessionId);
      onTaskStarted(res.task_id, selectedSessionId, {
        session: {
          id: selectedSessionId,
          nom: selectedSession?.nom ?? `Session #${selectedSessionId}`,
        },
        programmes: selectedProgrammes,
        etapes: selectedEtapes,
        weights,
      });
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : "Erreur lors du lancement"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="xl:col-span-2">
        <h2 className="text-xl font-semibold text-fg">
          {"Générer les affectations"}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {"Sélectionnez la session, les programmes et étapes concernés, puis ajustez les pondérations avant de lancer."}
        </p>
      </div>

      {/* Session */}
      <div className="space-y-2 rounded-lg border border-border bg-canvas-pure p-5 xl:col-start-1">
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
        <div className="space-y-3 rounded-lg border border-border bg-canvas-pure p-5 xl:col-start-1">
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
                        sessionId={selectedSessionId}
                        selectedEtapeIds={selectedEtapeIds}
                        onToggleEtape={toggleEtape}
                        onEtapesLoaded={handleEtapesLoaded}
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
          {selectedProgrammeIds.size > 0 && (
            <div className="rounded-md border border-border bg-primary-tint px-3 py-2 text-sm text-fg-muted">
              <p className="font-medium text-fg">Périmètre sélectionné</p>
              <p>
                {selectedProgrammeIds.size} programme{selectedProgrammeIds.size > 1 ? "s" : ""} sélectionné{selectedProgrammeIds.size > 1 ? "s" : ""}
                {" · "}
                {selectedEtapeIds.length > 0
                  ? `${selectedEtapeIds.length} étape${selectedEtapeIds.length > 1 ? "s" : ""} ciblée${selectedEtapeIds.length > 1 ? "s" : ""}`
                  : "toutes les étapes disponibles"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sliders W1-W4 */}
      {selectedSessionId && (
        <aside className="space-y-4 rounded-lg border border-border bg-canvas-pure p-5 xl:col-start-2 xl:row-start-2 xl:row-span-3">
          <h3 className="text-sm font-semibold text-fg">Pondérations et lancement</h3>
          <WeightSliders
            value={weights}
            onChange={setWeights}
            disabled={isSaving}
          />
          {launchError && <p className="text-sm text-destructive">{launchError}</p>}
          <Button
            onClick={handleLaunch}
            disabled={!canLaunch || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {"Préparation de la génération…"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Lancer la {"génération"}
              </>
            )}
          </Button>
          {isSaving && (
            <p role="status" aria-live="polite" className="text-xs text-fg-muted">
              Paramètres verrouillés temporairement pendant le lancement.
            </p>
          )}
        </aside>
      )}

      {!selectedSessionId && (
        <div className="space-y-4 rounded-lg border border-dashed border-border bg-canvas-pure p-5 text-sm text-fg-muted xl:col-start-2 xl:row-start-2">
          <p>Choisissez une session pour configurer les pondérations et lancer la génération.</p>
          <Button disabled className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Lancer la génération
          </Button>
        </div>
      )}
    </div>
  );
}
