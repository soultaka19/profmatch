import type { Semestre, SessionStatut } from "./api";

export const SEMESTRE_LABEL_LONG: Record<Semestre, string> = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
};

export const STATUT_LABEL: Record<SessionStatut, string> = {
  planifiee: "Planifiée",
  ouverte: "Ouverte",
  fermee: "Fermée",
};

// Couleurs dérivées des tokens de design (themes via data-theme), jamais de
// palette Tailwind brute : planifiée = neutre, ouverte = succès, fermée = atténuée.
export const STATUT_CLASSES: Record<SessionStatut, string> = {
  planifiee: "border-border bg-surface text-fg-muted",
  ouverte: "border-success-border bg-success-bg text-success",
  fermee: "border-border-soft bg-surface-subtle text-fg-subtle",
};

export interface SessionCreateInput {
  annee: number;
  semestre: Semestre;
  statut?: SessionStatut;
}

export interface SessionUpdateInput {
  statut: SessionStatut;
}

export interface PonderationsUpdateInput {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  xai_actif?: boolean;
}
