import { apiClient } from "./client";
import type {
  AffectationOut,
  AffectationProfOut,
  AffectationStatut,
  EtapeProgramme,
  EtapeStatut,
  GenerationResponse,
  GenerationStatus,
  JustificationDetailOut,
  PonderationsOut,
  ProfesseurDisponibleOut,
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

  etapesStatut: (
    sessionId: number,
    programmeId: number
  ): Promise<EtapeStatut[]> =>
    apiClient.get<EtapeStatut[]>(
      `/api/sessions/${sessionId}/programmes/${programmeId}/etapes-statut`
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

  getJustificationDetail: (id: number): Promise<JustificationDetailOut> =>
    apiClient.get<JustificationDetailOut>(
      `/api/affectations/${id}/justification`
    ),

  list: (
    sessionId: number,
    statut?: AffectationStatut,
    opts?: { programmeIds?: number[]; etapeIds?: number[] }
  ): Promise<AffectationOut[]> => {
    const params = new URLSearchParams({ session_id: String(sessionId) });
    if (statut) params.set("statut", statut);
    for (const pid of opts?.programmeIds ?? []) params.append("programme_ids", String(pid));
    for (const eid of opts?.etapeIds ?? []) params.append("etape_ids", String(eid));
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

  createManuelle: (payload: {
    session_id: number;
    professeur_id: number;
    cours_id: number;
  }): Promise<AffectationOut> =>
    apiClient.post<AffectationOut>("/api/affectations/manuelle", payload),

  listProfesseursDisponibles: (
    sessionId: number,
    coursId: number
  ): Promise<ProfesseurDisponibleOut[]> =>
    apiClient.get<ProfesseurDisponibleOut[]>(
      `/api/affectations/professeurs-disponibles?session_id=${sessionId}&cours_id=${coursId}`
    ),

  mesAffectations: (): Promise<AffectationProfOut[]> =>
    apiClient.get<AffectationProfOut[]>("/api/affectations/mes-affectations"),
};
