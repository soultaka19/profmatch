import { apiClient } from "./client";
import type {
  UserAdmin,
  UserCreateInput,
  UserCreateResponse,
  UserUpdateInput,
} from "@/lib/types/api";

export const usersApi = {
  list: (actif?: boolean): Promise<UserAdmin[]> => {
    const query = actif === undefined ? "" : `?actif=${actif}`;
    return apiClient.get<UserAdmin[]>(`/api/admin/utilisateurs/${query}`);
  },

  get: (id: number): Promise<UserAdmin> =>
    apiClient.get<UserAdmin>(`/api/admin/utilisateurs/${id}`),

  create: (input: UserCreateInput): Promise<UserCreateResponse> =>
    apiClient.post<UserCreateResponse>("/api/admin/utilisateurs", input),

  update: (id: number, input: UserUpdateInput): Promise<UserAdmin> =>
    apiClient.put<UserAdmin>(`/api/admin/utilisateurs/${id}`, input),

  deactivate: (id: number): Promise<UserAdmin> =>
    apiClient.delete<UserAdmin>(`/api/admin/utilisateurs/${id}`),

  restore: (id: number): Promise<UserAdmin> =>
    apiClient.post<UserAdmin>(`/api/admin/utilisateurs/${id}/restaurer`, {}),

  reinitPassword: (id: number): Promise<UserCreateResponse> =>
    apiClient.post<UserCreateResponse>(
      `/api/admin/utilisateurs/${id}/reinit-password`,
      {}
    ),
};
