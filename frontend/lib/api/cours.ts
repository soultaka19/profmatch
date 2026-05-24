import { apiClient } from "./client";
import type {
  Cours,
  CoursCreateInput,
  CoursUpdateInput,
} from "@/lib/types/cours";
import type { CoursReadOnly } from "@/lib/types/programmes";

export const coursApi = {
  list: (q?: string): Promise<CoursReadOnly[]> => {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiClient.get<CoursReadOnly[]>(`/api/cours${query}`);
  },

  get: (id: number): Promise<Cours> => apiClient.get<Cours>(`/api/cours/${id}`),

  create: (input: CoursCreateInput): Promise<Cours> =>
    apiClient.post<Cours>("/api/cours", input),

  update: (id: number, input: CoursUpdateInput): Promise<Cours> =>
    apiClient.put<Cours>(`/api/cours/${id}`, input),

  remove: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/cours/${id}`),
};
