import { apiClient } from "./client";
import type {
  Etape,
  EtapeCreateInput,
  EtapeUpdateInput,
} from "@/lib/types/programmes";

export const etapesApi = {
  list: (programmeId: number): Promise<Etape[]> =>
    apiClient.get<Etape[]>(`/api/programmes/${programmeId}/etapes`),
  create: (programmeId: number, input: EtapeCreateInput): Promise<Etape> =>
    apiClient.post<Etape>(`/api/programmes/${programmeId}/etapes`, input),
  update: (programmeId: number, etapeId: number, input: EtapeUpdateInput): Promise<Etape> =>
    apiClient.put<Etape>(`/api/programmes/${programmeId}/etapes/${etapeId}`, input),
  remove: (programmeId: number, etapeId: number): Promise<void> =>
    apiClient.delete<void>(`/api/programmes/${programmeId}/etapes/${etapeId}`),
};
