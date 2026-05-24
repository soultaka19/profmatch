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

export const STATUT_CLASSES: Record<SessionStatut, string> = {
  planifiee:
    "border-slate-300 bg-slate-50 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700",
  ouverte:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800",
  fermee:
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300 dark:border-zinc-700",
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
