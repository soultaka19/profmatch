"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { affectationsApi } from "@/lib/api/affectations";
import type { AffectationOut, JustificationDetailOut } from "@/lib/types/api";

import { JustificationDetailSheet } from "./JustificationDetailSheet";
import { getRecommendationFilter } from "./recommendation";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface Props {
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
  pendingActionId?: number | null;
  pendingAction?: "validate" | "reject" | null;
}

/**
 * Vue tableau compacte — alternative aux cartes empilées.
 *
 * Organisation : un cours à la fois, paginé via les boutons Précédent /
 * Suivant. À l'intérieur du cours, les candidats sont classés #1/#2/#3 par
 * score décroissant. Le RH traite un cours à la fois, comme dans la vue
 * cartes, mais avec une densité tabulaire et la hiérarchie d'actions
 * Voir / Valider / Rejeter visible en bout de ligne.
 *
 * Choix UX :
 * - Pas de texte de justification en cellule : trop encombrant. Accessible
 *   via le bouton Voir (Eye) ou le clic sur la ligne.
 * - Score en pourcentage entier avec code couleur basé sur la recommandation
 *   (≥ 80 % vert, 60–80 % ambré, < 60 % gris) — lisibilité immédiate.
 * - Rang #1 en pastille primary, suivants en outline neutre.
 * - Actions hiérarchisées : Valider en plein primary (principale), Rejeter
 *   en outline destructive (secondaire négative), Voir en ghost-icon (détail).
 */
export function AffectationCompactTable({
  affectations,
  coursNames,
  professorNames,
  poids,
  onValidate,
  onReject,
  pendingActionId = null,
  pendingAction = null,
}: Props) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch détail (wireframe B) à la demande. SWR garde le cache entre
  // les ouvertures d'un même id — pas de re-fetch si on rouvre la même
  // affectation. Aucune requête tant que detailId est null.
  //
  // Enrichissement XAI lazy : la 1ʳᵉ consultation déclenche côté API
  // l'enrichissement LLM de cette justification (statut → `en_cours`). On
  // poll alors toutes les 2 s jusqu'à ce que la narration remplace la
  // statique (`enrichie`) ou échoue (`echec`). Sinon, pas de polling.
  const { data: detail, isLoading: detailLoading } =
    useSWR<JustificationDetailOut>(
      detailId !== null ? `justification:${detailId}` : null,
      detailId !== null
        ? () => affectationsApi.getJustificationDetail(detailId)
        : null,
      {
        revalidateOnFocus: false,
        refreshInterval: (data) =>
          data?.justification_statut === "en_cours" ? 2000 : 0,
      },
    );

  // Regroupement par cours, à l'intérieur tri par score décroissant.
  // L'ordre d'apparition des cours suit la 1ʳᵉ rencontre dans `affectations`,
  // ce qui préserve l'ordre des filtres amont si l'appelant les a triés.
  const groupes = useMemo(() => {
    const map = new Map<number, AffectationOut[]>();
    const ordreCours: number[] = [];
    for (const aff of affectations) {
      if (!map.has(aff.cours_id)) {
        map.set(aff.cours_id, []);
        ordreCours.push(aff.cours_id);
      }
      map.get(aff.cours_id)!.push(aff);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.score_total - a.score_total);
    }
    return ordreCours.map((coursId) => ({
      coursId,
      candidats: map.get(coursId)!,
    }));
  }, [affectations]);

  // Si le périmètre change (filtres parents), on remet la pagination à zéro
  // pour éviter d'afficher l'index d'un cours qui n'existe plus.
  useEffect(() => {
    if (currentIndex >= groupes.length && groupes.length > 0) {
      setCurrentIndex(0);
    }
  }, [groupes.length, currentIndex]);

  if (groupes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Aucune proposition d&apos;affectation à afficher.
      </p>
    );
  }

  const groupeActuel = groupes[Math.min(currentIndex, groupes.length - 1)];
  const coursLabel =
    coursNames[groupeActuel.coursId] ?? `Cours #${groupeActuel.coursId}`;
  const peutReculer = currentIndex > 0;
  const peutAvancer = currentIndex < groupes.length - 1;

  return (
    <div className="space-y-3">
      {/* Bandeau de pagination + titre du cours courant */}
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-canvas-pure px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            Cours {currentIndex + 1} / {groupes.length}
          </span>
          <h3 className="text-body font-semibold text-fg">{coursLabel}</h3>
          <span className="text-xs text-fg-muted">
            {groupeActuel.candidats.length} candidat
            {groupeActuel.candidats.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="inline-flex gap-2 self-end sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={!peutReculer}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Précédent
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={!peutAvancer}
            onClick={() =>
              setCurrentIndex((i) => Math.min(groupes.length - 1, i + 1))
            }
          >
            Suivant
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      {/* Tableau des candidats du cours courant */}
      <div className="overflow-hidden rounded-lg border border-border bg-canvas-pure">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-canvas text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th scope="col" className="w-14 px-3 py-3 text-center font-medium">
                Rang
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium">
                Prof
              </th>
              <th scope="col" className="w-24 px-4 py-3 text-right font-medium">
                Score
              </th>
              <th scope="col" className="w-64 px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groupeActuel.candidats.map((aff, rankIndex) => {
              const profLabel =
                professorNames[aff.professeur_id] ?? `Prof #${aff.professeur_id}`;
              const isPending = pendingActionId === aff.id;
              const canAct = aff.statut === "proposee";
              const rank = rankIndex + 1;
              const reco = getRecommendationFilter(aff.score_total);

              return (
                <tr
                  key={aff.id}
                  className="group transition-colors hover:bg-canvas focus-within:bg-canvas"
                >
                  <td className="px-3 py-3 text-center align-middle">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="px-4 py-3 align-middle font-medium text-fg">
                    {profLabel}
                  </td>
                  <td
                    data-testid="score"
                    className={`px-4 py-3 text-right align-middle font-semibold tabular-nums ${scoreClass(reco)}`}
                  >
                    {Math.round(aff.score_total * 100)} %
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-fg-muted hover:text-fg"
                        onClick={() => setDetailId(aff.id)}
                        title="Voir la justification détaillée"
                        aria-label="Voir"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Button>
                      {canAct ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 px-3"
                            disabled={isPending}
                            onClick={() => onValidate(aff.id)}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            Valider
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-destructive px-3 text-destructive hover:bg-destructive hover:text-white"
                            disabled={isPending}
                            onClick={() => onReject(aff.id)}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                            Rejeter
                          </Button>
                        </>
                      ) : (
                        <StatutDecide statut={aff.statut} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <JustificationDetailSheet
        open={detailId !== null}
        loading={detailLoading}
        detail={detail ?? null}
        onClose={() => setDetailId(null)}
        onValidate={(id) => {
          onValidate(id);
          setDetailId(null);
        }}
        onReject={(id) => {
          onReject(id);
          setDetailId(null);
        }}
      />
    </div>
  );
}

function scoreClass(reco: "forte" | "reserves" | "examiner"): string {
  if (reco === "forte") return "text-emerald-700 dark:text-emerald-400";
  if (reco === "reserves") return "text-amber-700 dark:text-amber-400";
  return "text-fg-muted";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return null;
  const tone =
    rank === 1
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-canvas-pure text-fg-muted";
  return (
    <span
      className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${tone}`}
      aria-label={`Candidat n°${rank} pour ce cours`}
    >
      #{rank}
    </span>
  );
}

function StatutDecide({ statut }: { statut: "proposee" | "validee" | "rejetee" }) {
  if (statut === "validee") {
    return (
      <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
        Validée
      </span>
    );
  }
  return (
    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      Rejetée
    </span>
  );
}

