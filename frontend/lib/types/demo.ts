import type { UserRole } from "./api";

/** Ce que rend `POST /api/demo/sandbox` : de quoi entrer, dans les trois rôles. */
export interface BacASable {
  sandbox_id: number;
  // Un jeton par rôle : changer de rôle ne doit pas demander de se reconnecter.
  jetons: Record<UserRole, string>;
  expire_le: string;
  session_id: number;
  session_nom: string;
  appels_ia_total: number;
  appels_ia_restants: number;
}

/** Ce que rend `GET /api/demo/status`. Un compte réel répond `est_demo: false`. */
export interface StatutDemo {
  est_demo: boolean;
  expire_le?: string | null;
  appels_ia_total?: number | null;
  appels_ia_restants?: number | null;
}
