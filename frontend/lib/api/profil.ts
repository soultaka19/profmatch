import { apiClient } from "./client";
import type { ProfilMe } from "@/lib/types/api";

export const profilApi = {
  getMe: () => apiClient.get<ProfilMe>("/api/profil/me"),

  updateMe: (nom_complet: string) =>
    apiClient.patch<ProfilMe>("/api/profil/me", { nom_complet }),

  changePassword: (current_password: string, new_password: string) =>
    apiClient.put<void>("/api/profil/me/password", { current_password, new_password }),
};
