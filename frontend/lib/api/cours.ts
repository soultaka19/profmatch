import { apiClient } from "./client";
import type { CoursReadOnly } from "@/lib/types/programmes";

export const coursApi = {
  list: (q?: string): Promise<CoursReadOnly[]> => {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiClient.get<CoursReadOnly[]>(`/api/cours${query}`);
  },
};
