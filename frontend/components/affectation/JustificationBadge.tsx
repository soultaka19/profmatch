"use client";

import { AlertCircle, FileText, Loader2, Sparkles } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { JustificationStatut } from "@/lib/types/api";

interface Props {
  statut: JustificationStatut | undefined;
}

interface Config {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  ariaLabel: string;
  className: string;
  iconClassName?: string;
}

const CONFIG: Record<JustificationStatut, Config> = {
  enrichie: {
    Icon: Sparkles,
    ariaLabel: "Justification enrichie par l'IA",
    className: "border-primary/40 bg-primary/8 text-primary",
  },
  en_cours: {
    Icon: Loader2,
    ariaLabel: "Enrichissement IA en cours",
    className: "border-primary/30 bg-canvas-pure text-primary",
    iconClassName: "animate-spin",
  },
  statique: {
    Icon: FileText,
    ariaLabel: "Justification technique (mode hors-ligne)",
    className: "border-border bg-canvas-pure text-fg-muted",
  },
  echec: {
    Icon: AlertCircle,
    ariaLabel: "IA indisponible — justification technique conservée",
    className: "border-amber-300/60 bg-amber-50/60 text-amber-700",
  },
};

/**
 * Pastille d'état placée à gauche d'une justification d'affectation.
 *
 * Permet au RH de distinguer en un coup d'œil les justifications enrichies
 * par l'IA (narration soignée) des statiques (gabarit déterministe). Le
 * statut `en_cours` est rare mais utile en démo : il signale l'enrichissement
 * en marche pour cette ligne spécifique. `echec` ne bloque rien — la
 * justification statique reste lisible, le badge informe simplement le RH.
 */
export function JustificationBadge({ statut }: Props) {
  if (!statut) return null;
  const { Icon, ariaLabel, className, iconClassName } = CONFIG[statut];
  return (
    <span
      data-statut={statut}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${className}`}
    >
      <Icon className={`h-3 w-3 ${iconClassName ?? ""}`.trim()} aria-hidden />
    </span>
  );
}
