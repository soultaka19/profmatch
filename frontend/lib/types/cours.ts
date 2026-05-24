export interface Cours {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  credits: number | null;
  heures: number | null;
  cree_le: string;
  mis_a_jour_le: string;
}

export interface CoursCreateInput {
  code: string;
  nom: string;
  description?: string | null;
  credits?: number | null;
  heures?: number | null;
}

export interface CoursUpdateInput {
  nom?: string;
  description?: string | null;
  credits?: number | null;
  heures?: number | null;
}

export interface CoursCompetence {
  id: number;
  cours_id: number;
  nom: string;
  importance: number;
  cree_le: string;
}

export interface CoursCompetenceCreateInput {
  nom: string;
  importance?: number;
}

export interface CoursCompetenceUpdateInput {
  importance: number;
}
