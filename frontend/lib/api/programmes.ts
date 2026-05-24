import { apiClient } from "./client";
import type { Programme } from "@/lib/types/api";
import type {
  ProgrammeCalendrier,
  ProgrammeCreateInput,
  ProgrammeUpdateInput,
} from "@/lib/types/programmes";

export const programmesApi = {
  list: (): Promise<Programme[]> => apiClient.get<Programme[]>("/api/programmes/"),
  get: (id: number): Promise<Programme> => apiClient.get<Programme>(`/api/programmes/${id}`),
  create: (input: ProgrammeCreateInput): Promise<Programme> =>
    apiClient.post<Programme>("/api/programmes/", input),
  update: (id: number, input: ProgrammeUpdateInput): Promise<Programme> =>
    apiClient.put<Programme>(`/api/programmes/${id}`, input),
  remove: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/programmes/${id}`),
  calendrier: (id: number): Promise<ProgrammeCalendrier> =>
    apiClient.get<ProgrammeCalendrier>(`/api/programmes/${id}/calendrier`),
};
