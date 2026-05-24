import { apiClient } from "./client";
import type {
  CursusCreateInput,
  CursusItem,
  CursusUpdateInput,
} from "@/lib/types/programmes";

export const cursusApi = {
  list: (programmeId: number, etapeId: number): Promise<CursusItem[]> =>
    apiClient.get<CursusItem[]>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours`
    ),
  create: (
    programmeId: number,
    etapeId: number,
    input: CursusCreateInput
  ): Promise<CursusItem> =>
    apiClient.post<CursusItem>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours`,
      input
    ),
  update: (
    programmeId: number,
    etapeId: number,
    lienId: number,
    input: CursusUpdateInput
  ): Promise<CursusItem> =>
    apiClient.put<CursusItem>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours/${lienId}`,
      input
    ),
  remove: (programmeId: number, etapeId: number, lienId: number): Promise<void> =>
    apiClient.delete<void>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours/${lienId}`
    ),
};
