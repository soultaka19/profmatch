import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AffectationsPage from "../page";

const PROPOSEE = {
  id: 1, session_id: 7, professeur_id: 1, cours_id: 100, score_total: 0.8,
  score_comp: 0.8, score_exp: 0.8, score_hist: 0.8, score_sem: 0.8,
  justification: null, statut: "proposee", origine: "algo",
  valide_par_user_id: null, valide_le: null, cree_le: "2026-01-01",
  cours_nom: "Programmation avancée", cours_code: "INF-200", professeur_nom: "Alice",
};
const VALIDEE = {
  ...PROPOSEE, id: 2, professeur_id: 2, cours_id: 30733, statut: "validee",
  cours_nom: "Introduction à la programmation", cours_code: "30733 IFM", professeur_nom: "Bob",
};

vi.mock("swr", () => ({
  default: (key: unknown) => {
    if (typeof key === "string" && key.startsWith("gen-current:")) {
      return { data: [PROPOSEE], mutate: vi.fn() };
    }
    if (typeof key === "string" && key.startsWith("gen-programme:")) {
      return { data: [PROPOSEE, VALIDEE], mutate: vi.fn() };
    }
    if (typeof key === "string" && key.includes("/ponderations")) {
      return { data: { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 }, mutate: vi.fn() };
    }
    return { data: undefined, mutate: vi.fn() };
  },
}));

vi.mock("@/lib/hooks/useGenerationPoller", () => ({
  useGenerationPoller: () => ({ data: { status: "done" } }),
}));

vi.mock("@/components/affectation/GenerationForm", () => ({
  GenerationForm: ({
    onTaskStarted,
  }: {
    onTaskStarted: (t: string, s: number, scope: unknown) => void;
  }) => (
    <button
      onClick={() =>
        onTaskStarted("t1", 7, {
          session: { id: 7, nom: "S" },
          programmes: [{ id: 46, code: "51046", nom: "Prog" }],
          etapes: [
            { id: 9, ordre: 2, nom: "Étape 2", programmeId: 46, programmeCode: "51046" },
          ],
          weights: { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
        })
      }
    >
      go
    </button>
  ),
}));

describe("AffectationsPage — séparation des résultats", () => {
  it("place les déjà traitées dans une section distincte des propositions courantes", async () => {
    render(<AffectationsPage />);
    fireEvent.click(screen.getByText("go"));

    const section = await screen.findByText(/Affectations déjà traitées du programme/i);
    expect(section.textContent).toMatch(/\(1\)/);

    await waitFor(() =>
      expect(screen.getAllByText(/Programmation avancée/).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/Introduction à la programmation/).length).toBeGreaterThan(0);
  });
});
