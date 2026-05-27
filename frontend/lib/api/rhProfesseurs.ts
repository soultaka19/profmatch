import { apiClient } from "./client";
import type {
  CompetenceDto,
  ExperienceDto,
  FormationDto,
  LangueDto,
  ProfilDto,
} from "./extraction";

export type CvStatut = "en_attente" | "en_cours" | "traite" | "erreur";

export interface ProfesseurListItem {
  professeur_id: number;
  nom_complet: string;
  email: string;
  cv_statut: CvStatut | null;
  cv_nom_original: string | null;
  traite_le: string | null;
}

export interface ProfesseurListResponse {
  items: ProfesseurListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProfesseurDetail {
  professeur_id: number;
  nom_complet: string;
  email: string;
  cv_statut: CvStatut | null;
  cv_nom_original: string | null;
  traite_le: string | null;
  profil: ProfilDto;
  competences: CompetenceDto[];
  experiences: ExperienceDto[];
  formations: FormationDto[];
  langues: LangueDto[];
}

export interface ListParams {
  page: number;
  pageSize: number;
  q: string;
}

export const rhProfesseursApi = {
  list: ({ page, pageSize, q }: ListParams): Promise<ProfesseurListResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());
    return apiClient.get<ProfesseurListResponse>(
      `/api/rh/professeurs?${params.toString()}`
    );
  },

  get: (professeurId: number): Promise<ProfesseurDetail> =>
    apiClient.get<ProfesseurDetail>(`/api/rh/professeurs/${professeurId}`),
};
