import { apiClient } from "./client";

export interface SeedDemoResult {
  utilisateurs: number;
  professeurs: number;
  cours: number;
  sessions: number;
  embeddings_professeurs: number;
  embeddings_cours: number;
}

export const maintenanceApi = {
  /** Charge (idempotent) le jeu de données de démonstration côté serveur. */
  seedDemo: (): Promise<SeedDemoResult> =>
    apiClient.post<SeedDemoResult>("/api/admin/maintenance/seed-demo", {}),
};
