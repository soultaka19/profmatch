"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { sessionsApi } from "@/lib/api/sessions";
import type { PonderationsOut } from "@/lib/types/api";
import { Loader2, Scale, RotateCcw, Check } from "lucide-react";

const WEIGHTS = [
  { key: "w1" as const, label: "W1 — Compétences", description: "Couverture des compétences requises par le cours" },
  { key: "w2" as const, label: "W2 — Expérience", description: "Années d'expérience et historique d'enseignement" },
  { key: "w3" as const, label: "W3 — Historique", description: "Performance passée sur des cours similaires" },
  { key: "w4" as const, label: "W4 — Score sémantique", description: "Similarité cosinus entre CV et description du cours" },
] as const;

type Key = (typeof WEIGHTS)[number]["key"];
type Poids = Record<Key, number>;

interface Props {
  sessionId: number;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function PonderationsPanel({ sessionId }: Props) {
  const { data, mutate, isLoading } = useSWR<PonderationsOut>(
    `ponderations:${sessionId}`,
    () => sessionsApi.getPonderations(sessionId),
  );

  const [poids, setPoids] = useState<Poids | null>(null);
  const [xai, setXai] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setPoids({ w1: data.w1, w2: data.w2, w3: data.w3, w4: data.w4 });
      setXai(data.xai_actif);
    }
  }, [data]);

  if (isLoading || !data || !poids) {
    return (
      <div className="rounded-lg border border-border bg-canvas-pure p-4">
        <p className="text-sm text-fg-muted">Chargement des pondérations…</p>
      </div>
    );
  }

  const somme = round3(poids.w1 + poids.w2 + poids.w3 + poids.w4);
  const ecart = round3(somme - 1);
  const valide = Math.abs(ecart) <= 0.001;

  function handleChange(key: Key, raw: number) {
    if (!poids) return;
    setPoids({ ...poids, [key]: round3(raw / 100) });
    setSavedAt(null);
  }

  function reset() {
    if (!data) return;
    setPoids({ w1: data.w1, w2: data.w2, w3: data.w3, w4: data.w4 });
    setXai(data.xai_actif);
    setError(null);
    setSavedAt(null);
  }

  function distribute() {
    if (!poids) return;
    const reste = round3(1 - somme);
    if (Math.abs(reste) < 0.001) return;
    const next = { ...poids };
    next.w4 = round3(poids.w4 + reste);
    if (next.w4 < 0) next.w4 = 0;
    if (next.w4 > 1) next.w4 = 1;
    setPoids(next);
  }

  async function save() {
    if (!valide) return;
    setSaving(true);
    setError(null);
    try {
      await sessionsApi.putPonderations(sessionId, {
        w1: poids!.w1,
        w2: poids!.w2,
        w3: poids!.w3,
        w4: poids!.w4,
        xai_actif: xai,
      });
      await mutate();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    poids.w1 !== data.w1 ||
    poids.w2 !== data.w2 ||
    poids.w3 !== data.w3 ||
    poids.w4 !== data.w4 ||
    xai !== data.xai_actif;

  return (
    <div className="rounded-lg border border-border bg-canvas-pure overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-hover px-4 py-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-fg-muted" />
          <h3 className="font-semibold text-fg">Pondérations W1–W4</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {valide ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800">
              <Check className="h-3 w-3" />
              Σ = {somme.toFixed(3)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-destructive bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive">
              Σ = {somme.toFixed(3)} (attendu 1.000)
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {WEIGHTS.map(({ key, label, description }) => (
          <div key={key} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-xs text-fg-muted">{description}</p>
              </div>
              <span className="font-mono text-sm font-medium tabular-nums">
                {(poids[key] * 100).toFixed(1)} %
              </span>
            </div>
            <Slider
              value={[Math.round(poids[key] * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => handleChange(key, v[0])}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-surface-subtle px-4 py-3 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={xai}
            onChange={(e) => setXai(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span>
            <strong>XAI actif</strong> — justifications narratives générées par le LLM
            (sinon : fallback statique)
          </span>
        </label>

        {!valide && (
          <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800">
            <span>
              Écart de {(ecart * 100).toFixed(1)} % à corriger.
            </span>
            <Button size="sm" variant="outline" onClick={distribute}>
              Ajuster W4 automatiquement
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-fg-muted">
            {savedAt && !dirty && (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                Enregistré.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty || saving}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Annuler
            </Button>
            <Button size="sm" onClick={save} disabled={!valide || !dirty || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Sauvegarde…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
