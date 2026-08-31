import { apiClient } from "./client";
import type { BacASable, StatutDemo } from "@/lib/types/demo";

export const demoApi = {
  creer: () => apiClient.post<BacASable>("/api/demo/sandbox", {}),
  statut: () => apiClient.get<StatutDemo>("/api/demo/status"),
};
