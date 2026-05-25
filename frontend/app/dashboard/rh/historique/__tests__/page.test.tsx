import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HistoriquePage from "../page";

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/sessions/") {
      return {
        data: [
          {
            id: 1,
            annee: 2026,
            semestre: "automne",
            statut: "fermee",
            nom: "Automne 2026",
            cree_le: "2026-05-25T00:00:00Z",
          },
        ],
        error: undefined,
        isLoading: false,
      };
    }
    if (key?.startsWith("/api/affectations/")) {
      return { data: [], error: undefined, isLoading: false };
    }
    if (key?.includes("/ponderations")) {
      return {
        data: { session_id: 1, w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
        error: undefined,
        isLoading: false,
      };
    }
    return { data: undefined, error: undefined, isLoading: false };
  },
}));

describe("HistoriquePage", () => {
  it("présente une action explicite et un état vide pour une session sans validation", () => {
    render(<HistoriquePage />);

    fireEvent.click(screen.getByRole("button", { name: /Voir les affectations/i }));

    expect(
      screen.getByText(/Aucune affectation validée pour cette session/i)
    ).toBeInTheDocument();
  });
});
