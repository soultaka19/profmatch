export type CategorieCours = "obligatoire" | "choix_francais" | "choix_anglais";

export const CATEGORIE_LABEL: Record<CategorieCours, string> = {
  obligatoire: "Obligatoire",
  choix_francais: "Choix français",
  choix_anglais: "Choix anglais",
};

// Semestres exposés dans l'UI admin pour le rythme d'admission.
// L'enum backend a aussi "ete" mais on ne l'expose pas dans le menu admin
// (rarement utilisé au collégial — Printemps couvre la session estivale).
export const SEMESTRES_ADMISSION = ["automne", "hiver", "printemps"] as const;
export type SemestreAdmission = (typeof SEMESTRES_ADMISSION)[number];

export const SEMESTRE_LABEL: Record<SemestreAdmission, string> = {
  automne: "Automne",
  hiver: "Hiver",
  printemps: "Printemps",
};

export interface Etape {
  id: number;
  programme_id: number;
  ordre: number;
  nom: string | null;
  cree_le: string;
}

export interface CursusItem {
  id: number;
  programme_id: number;
  etape_id: number;
  cours_id: number;
  categorie: CategorieCours;
  cree_le: string;
}

export interface CoursReadOnly {
  id: number;
  code: string;
  nom: string;
  credits: number | null;
  heures: number | null;
}

export interface ProgrammeCreateInput {
  code: string;
  nom: string;
  departement: string | null;
  semestres_admission?: SemestreAdmission[];
}

export interface ProgrammeUpdateInput {
  nom?: string;
  departement?: string | null;
  semestres_admission?: SemestreAdmission[];
}

export interface EtapeCreateInput {
  ordre: number;
  nom: string | null;
}

export interface EtapeUpdateInput {
  nom?: string | null;
}

export interface CursusCreateInput {
  cours_id: number;
  categorie?: CategorieCours;
}

export interface CursusUpdateInput {
  categorie: CategorieCours;
}

// ── Calendrier académique dérivé ──────────────────────────────────────────────

export type Rythme = "standard" | "continu";

export interface ProgrammeCalendrier {
  programme_id: number;
  rythme: Rythme;
  sessions_actives: string[];
  vacances: string[];
  etapes_total: number;
}
