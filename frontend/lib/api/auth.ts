import { apiClient } from "./client";
import type { TokenResponse, UserOut } from "@/lib/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>("/api/auth/login", { email, password }),
  me: () => apiClient.get<UserOut>("/api/auth/me"),
};
