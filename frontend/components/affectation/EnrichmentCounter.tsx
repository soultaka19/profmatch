"use client";

import { Check, Sparkles } from "lucide-react";

import type { JustificationTotaux } from "@/lib/types/api";

interface Props {
  totaux?: JustificationTotaux | null;
}

/**
 * Compteur silencieux d'enrichissement IA, placé dans le header du tableau RH.
 *
 * Le RH a déjà son tableau (justifications statiques posées au commit Niveau 2),
 * mais l'IA continue à enrichir les justifications en arrière-plan. Ce composant
 * matérialise le travail en cours sans jamais interrompre l'utilisateur :
 *   • anneau de progression circulaire (SVG pur, pas de lib)
 *   • chiffres en `tabular-nums` pour éviter le tremblement quand 9 → 10
 *   • passe en état "terminé" quand `enrichie + echec === total`
 *
 * Pendant que l'IA travaille, le visuel reste discret (couleur primary). Une
 * fois fini, on bascule sur un check vert. L'icône change, la couleur change,
 * mais le composant garde sa place — pas de saut de layout.
 */
export function EnrichmentCounter({ totaux }: Props) {
  if (!totaux || totaux.total === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 text-xs text-fg-muted"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        <span>Enrichissement IA — en attente</span>
      </div>
    );
  }

  const traitees = totaux.enrichie + totaux.echec;
  const complete = traitees >= totaux.total;
  const ratio = totaux.total === 0 ? 0 : totaux.enrichie / totaux.total;
  const dash = 2 * Math.PI * 8; // r=8

  return (
    <div
      role="status"
      aria-live="polite"
      data-complete={complete}
      className="inline-flex items-center gap-2.5 text-xs"
    >
      {complete ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="text-primary"
          aria-hidden
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="2"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - ratio)}
            transform="rotate(-90 10 10)"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
      )}

      <span className="font-medium tabular-nums text-fg">
        {totaux.enrichie} / {totaux.total}
      </span>
      <span className="text-fg-muted">
        {complete ? "justifications enrichies par l'IA" : "enrichies par l'IA…"}
      </span>
      {totaux.echec > 0 && (
        <span className="text-fg-muted/70" title="Justifications statiques conservées">
          ({totaux.echec} hors IA)
        </span>
      )}
    </div>
  );
}
