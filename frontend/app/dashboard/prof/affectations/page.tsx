"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { affectationsApi } from "@/lib/api/affectations";
import { MesAffectationsCard } from "@/components/affectation/MesAffectationsCard";
import type { AffectationProfOut, AffectationStatut } from "@/lib/types/api";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BookOpen, Loader2, Sparkles } from "lucide-react";

// ── Filtre par statut ────────────────────────────────────────────────────────

type FiltreStatut = "toutes" | AffectationStatut;

const FILTRE_OPTIONS: { value: FiltreStatut; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "validee", label: "Validées" },
  { value: "proposee", label: "Proposées" },
  { value: "rejetee", label: "Rejetées" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Groupe les affectations par nom de session (tri décroissant par annee + semestre). */
function groupBySession(
  affs: AffectationProfOut[]
): { sessionNom: string; items: AffectationProfOut[] }[] {
  const map = new Map<string, AffectationProfOut[]>();
  for (const aff of affs) {
    const key = aff.session_nom;
    const existing = map.get(key);
    if (existing) {
      existing.push(aff);
    } else {
      map.set(key, [aff]);
    }
  }
  // Conserver l'ordre d'insertion (API trie par cree_le desc → sessions récentes d'abord)
  return Array.from(map.entries()).map(([sessionNom, items]) => ({
    sessionNom,
    items,
  }));
}

const STATUT_BADGE_VARIANT: Record<
  AffectationStatut,
  "default" | "secondary" | "destructive"
> = {
  validee: "default",
  proposee: "secondary",
  rejetee: "destructive",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MesAffectationsPage() {
  const [filtre, setFiltre] = useState<FiltreStatut>("toutes");

  const { data, error, isLoading } = useSWR<AffectationProfOut[]>(
    "/api/affectations/mes-affectations",
    affectationsApi.mesAffectations,
    { refreshInterval: 30_000 }
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filtre === "toutes") return data;
    return data.filter((a) => a.statut === filtre);
  }, [data, filtre]);

  const groups = useMemo(() => groupBySession(filtered), [filtered]);

  // Compteurs par statut
  const counts = useMemo(() => {
    const c = { validee: 0, proposee: 0, rejetee: 0 };
    for (const a of data ?? []) {
      if (a.statut in c) c[a.statut as keyof typeof c]++;
    }
    return c;
  }, [data]);

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-display font-semibold text-fg">Mes affectations</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-fg-muted">
          Retrouvez ici toutes vos propositions et affectations validées,
          accompagnées de la justification IA pour chaque cours.
        </p>
      </div>

      {/* Chargement */}
      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de vos affectations…
        </p>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Impossible de charger vos affectations. Rechargez la page.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (data ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-canvas-pure py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-fg">Aucune affectation pour le moment</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">
              L&apos;algorithme proposera des cours une fois que votre CV aura
              été analysé et qu&apos;un responsable RH aura lancé une génération
              pour votre programme.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Sparkles className="h-3.5 w-3.5" />
            Chaque proposition inclut une justification IA détaillée.
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {!isLoading && !error && (data ?? []).length > 0 && (
        <div className="space-y-6">
          {/* Résumé + filtres */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Résumé compteurs */}
            <div className="flex flex-wrap items-center gap-2">
              {(["validee", "proposee", "rejetee"] as AffectationStatut[])
                .filter((s) => counts[s] > 0)
                .map((s) => (
                  <Badge key={s} variant={STATUT_BADGE_VARIANT[s]} className="gap-1">
                    {counts[s]}
                    {s === "validee" && " validée" + (counts[s] > 1 ? "s" : "")}
                    {s === "proposee" && " proposée" + (counts[s] > 1 ? "s" : "")}
                    {s === "rejetee" && " rejetée" + (counts[s] > 1 ? "s" : "")}
                  </Badge>
                ))}
            </div>

            {/* Filtres statut */}
            <div
              className="flex rounded-md border border-border bg-canvas-pure overflow-hidden"
              role="group"
              aria-label="Filtrer les affectations"
            >
              {FILTRE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiltre(opt.value)}
                  className={[
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    "border-r border-border last:border-r-0",
                    filtre === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-fg-muted hover:bg-surface hover:text-fg",
                  ].join(" ")}
                  aria-pressed={filtre === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state après filtre */}
          {filtered.length === 0 && (
            <p className="rounded-md border border-border bg-canvas-pure px-5 py-6 text-sm text-fg-muted">
              Aucune affectation dans cette catégorie.
            </p>
          )}

          {/* Groupes par session */}
          {groups.map(({ sessionNom, items }) => (
            <section key={sessionNom} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                {sessionNom}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((aff) => (
                  <MesAffectationsCard key={aff.id} aff={aff} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
