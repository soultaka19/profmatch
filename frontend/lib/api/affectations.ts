import { apiClient } from "./client";
import type {
  AffectationOut,
  AffectationStatut,
  EtapeProgramme,
  GenerationResponse,
  GenerationStatus,
  PonderationsOut,
  Programme,
  Session,
} from "@/lib/types/api";

export const sessionsApi = {
  list: (): Promise<Session[]> =>
    apiClient.get<Session[]>("/api/sessions/"),

  getPonderations: (sessionId: number): Promise<PonderationsOut> =>
    apiClient.get<PonderationsOut>(`/api/sessions/${sessionId}/ponderations`),

  updatePonderations: (
    sessionId: number,
    weights: { w1: number; w2: number; w3: number; w4: number }
  ): Promise<PonderationsOut> =>
    apiClient.put<PonderationsOut>(
      `/api/sessions/${sessionId}/ponderations`,
      weights
    ),

  programmesEligibles: (sessionId: number): Promise<Programme[]> =>
    apiClient.get<Programme[]>(
      `/api/sessions/${sessionId}/programmes-eligibles`
    ),
};

export const programmesApi = {
  list: (): Promise<Programme[]> =>
    apiClient.get<Programme[]>("/api/programmes/"),
};

export const etapesApi = {
  list: (programmeId: number): Promise<EtapeProgramme[]> =>
    apiClient.get<EtapeProgramme[]>(`/api/programmes/${programmeId}/etapes`),
};

export const affectationsApi = {
  generer: (
    sessionId: number,
    programmeIds: number[],
    etapeIds?: number[]
  ): Promise<GenerationResponse> =>
    apiClient.post<GenerationResponse>("/api/affectations/generer", {
      session_id: sessionId,
      programme_ids: programmeIds,
      etape_ids: etapeIds ?? null,
    }),

  getGenerationStatus: (taskId: string): Promise<GenerationStatus> =>
    apiClient.get<GenerationStatus>(
      `/api/affectations/generation/${taskId}`
    ),

  list: (
    sessionId: number,
    statut?: AffectationStatut
  ): Promise<AffectationOut[]> => {
    const params = new URLSearchParams({ session_id: String(sessionId) });
    if (statut) params.set("statut", statut);
    return apiClient.get<AffectationOut[]>(`/api/affectations/?${params}`);
  },

  validate: (
    id: number,
    statut: "validee" | "rejetee"
  ): Promise<AffectationOut> =>
    apiClient.patch<AffectationOut>(`/api/affectations/${id}`, { statut }),

  addFeedback: (
    id: number,
    note: number,
    commentaire?: string
  ): Promise<{ id: number; note: number }> =>
    apiClient.post(`/api/affectations/${id}/feedback`, { note, commentaire }),
};
