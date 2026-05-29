import { apiClient } from "./client";
import type { AdminStatsOut } from "@/lib/types/api";

export const adminStatsApi = {
  get: (): Promise<AdminStatsOut> => apiClient.get<AdminStatsOut>("/api/admin/stats"),
};
