import { apiClient } from "./client";
import type { ActivateRequest, TokenResponse } from "@/lib/types/api";

export const activationApi = {
  activate: (input: ActivateRequest): Promise<TokenResponse> =>
    apiClient.post<TokenResponse>("/api/auth/activate", input),
};
