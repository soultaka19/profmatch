import { apiClient, ApiError } from "./client";
import type { CVResponse, CVTexteResponse } from "@/lib/types/api";

export const cvApi = {
  upload: (file: File): Promise<CVResponse> => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm<CVResponse>("/api/cv/upload", form);
  },

  me: async (): Promise<CVResponse | null> => {
    try {
      return await apiClient.get<CVResponse>("/api/cv/me");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  texte: (): Promise<CVTexteResponse> =>
    apiClient.get<CVTexteResponse>("/api/cv/me/texte"),

  createManual: (): Promise<CVResponse> =>
    apiClient.post<CVResponse>("/api/cv/manual", undefined),
};
