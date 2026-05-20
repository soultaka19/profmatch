import { apiClient } from "./client";

export type CompetenceNiveau = "debutant" | "intermediaire" | "avance" | "expert";
export type LangueNiveau = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "natif";
export type SourceOrigine = "llm" | "manual";

export interface CompetenceDto {
  id: number;
  nom: string;
  niveau: CompetenceNiveau;
  source: SourceOrigine;
}

export interface ExperienceDto {
  id: number;
  poste: string;
  employeur: string;
  annee_debut: number;
  annee_fin: number | null;
  description_courte: string | null;
  source: SourceOrigine;
  ordre: number;
}

export interface FormationDto {
  id: number;
  diplome: string;
  etablissement: string;
  annee: number;
  source: SourceOrigine;
  ordre: number;
}

export interface LangueDto {
  id: number;
  langue: string;
  niveau: LangueNiveau;
  source: SourceOrigine;
}

export interface ProfilDto {
  resume: string | null;
  source: SourceOrigine;
}

export interface ExtractionData {
  profil: ProfilDto;
  competences: CompetenceDto[];
  experiences: ExperienceDto[];
  formations: FormationDto[];
  langues: LangueDto[];
}

export interface CompetenceCreate { nom: string; niveau: CompetenceNiveau; }
export interface CompetenceUpdate { nom?: string; niveau?: CompetenceNiveau; }

export interface ExperienceCreate {
  poste: string;
  employeur: string;
  annee_debut: number;
  annee_fin: number | null;
  description_courte: string | null;
}
export interface ExperienceUpdate {
  poste?: string;
  employeur?: string;
  annee_debut?: number;
  annee_fin?: number | null;
  description_courte?: string | null;
}

export interface FormationCreate { diplome: string; etablissement: string; annee: number; }
export interface FormationUpdate { diplome?: string; etablissement?: string; annee?: number; }

export interface LangueCreate { langue: string; niveau: LangueNiveau; }
export interface LangueUpdate { langue?: string; niveau?: LangueNiveau; }

export interface ProfilUpdate { resume: string | null; }

const ROOT = "/api/cv/me";

export const extractionApi = {
  get: () => apiClient.get<ExtractionData>(`${ROOT}/extraction`),

  profil: {
    update: (data: ProfilUpdate) => apiClient.patch<ProfilDto>(`${ROOT}/profil`, data),
  },

  competences: {
    add: (data: CompetenceCreate) => apiClient.post<CompetenceDto>(`${ROOT}/competences`, data),
    update: (id: number, data: CompetenceUpdate) =>
      apiClient.patch<CompetenceDto>(`${ROOT}/competences/${id}`, data),
    remove: (id: number) => apiClient.delete<void>(`${ROOT}/competences/${id}`),
  },

  experiences: {
    add: (data: ExperienceCreate) => apiClient.post<ExperienceDto>(`${ROOT}/experiences`, data),
    update: (id: number, data: ExperienceUpdate) =>
      apiClient.patch<ExperienceDto>(`${ROOT}/experiences/${id}`, data),
    remove: (id: number) => apiClient.delete<void>(`${ROOT}/experiences/${id}`),
  },

  formations: {
    add: (data: FormationCreate) => apiClient.post<FormationDto>(`${ROOT}/formations`, data),
    update: (id: number, data: FormationUpdate) =>
      apiClient.patch<FormationDto>(`${ROOT}/formations/${id}`, data),
    remove: (id: number) => apiClient.delete<void>(`${ROOT}/formations/${id}`),
  },

  langues: {
    add: (data: LangueCreate) => apiClient.post<LangueDto>(`${ROOT}/langues`, data),
    update: (id: number, data: LangueUpdate) =>
      apiClient.patch<LangueDto>(`${ROOT}/langues/${id}`, data),
    remove: (id: number) => apiClient.delete<void>(`${ROOT}/langues/${id}`),
  },
};
