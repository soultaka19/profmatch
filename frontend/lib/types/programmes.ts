export type CategorieCours = "obligatoire" | "choix_francais" | "choix_anglais";

export const CATEGORIE_LABEL: Record<CategorieCours, string> = {
  obligatoire: "Obligatoire",
  choix_francais: "Choix français",
  choix_anglais: "Choix anglais",
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
}

export interface ProgrammeUpdateInput {
  nom?: string;
  departement?: string | null;
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
