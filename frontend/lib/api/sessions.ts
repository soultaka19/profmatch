import { apiClient } from "./client";
import type { PonderationsOut, Programme, Session } from "@/lib/types/api";
import type {
  PonderationsUpdateInput,
  SessionCreateInput,
  SessionUpdateInput,
} from "@/lib/types/sessions";

export const sessionsApi = {
  list: (): Promise<Session[]> => apiClient.get<Session[]>("/api/sessions"),
  get: (id: number): Promise<Session> =>
    apiClient.get<Session>(`/api/sessions/${id}`),
  create: (input: SessionCreateInput): Promise<Session> =>
    apiClient.post<Session>("/api/sessions", input),
  update: (id: number, input: SessionUpdateInput): Promise<Session> =>
    apiClient.put<Session>(`/api/sessions/${id}`, input),
  remove: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/sessions/${id}`),
  getPonderations: (id: number): Promise<PonderationsOut> =>
    apiClient.get<PonderationsOut>(`/api/sessions/${id}/ponderations`),
  putPonderations: (
    id: number,
    input: PonderationsUpdateInput,
  ): Promise<PonderationsOut> =>
    apiClient.put<PonderationsOut>(`/api/sessions/${id}/ponderations`, input),
  programmesEligibles: (id: number): Promise<Programme[]> =>
    apiClient.get<Programme[]>(`/api/sessions/${id}/programmes-eligibles`),
};
