import { apiClient } from "./client";
import type {
  CoursCompetence,
  CoursCompetenceCreateInput,
  CoursCompetenceUpdateInput,
} from "@/lib/types/cours";

export const coursCompetencesApi = {
  list: (coursId: number): Promise<CoursCompetence[]> =>
    apiClient.get<CoursCompetence[]>(`/api/cours/${coursId}/competences`),

  create: (
    coursId: number,
    input: CoursCompetenceCreateInput,
  ): Promise<CoursCompetence> =>
    apiClient.post<CoursCompetence>(`/api/cours/${coursId}/competences`, input),

  update: (
    coursId: number,
    competenceId: number,
    input: CoursCompetenceUpdateInput,
  ): Promise<CoursCompetence> =>
    apiClient.put<CoursCompetence>(
      `/api/cours/${coursId}/competences/${competenceId}`,
      input,
    ),

  remove: (coursId: number, competenceId: number): Promise<void> =>
    apiClient.delete<void>(`/api/cours/${coursId}/competences/${competenceId}`),
};
