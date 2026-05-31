import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import AffectationsPage from "../page";

// Délai minimal d'affichage du pipeline avant la bascule en revue (cf. page.tsx).
const DWELL_MS = 6500;

const PROPOSEE = {
  id: 1, session_id: 7, professeur_id: 1, cours_id: 100, score_total: 0.8,
  score_comp: 0.8, score_exp: 0.8, score_hist: 0.8, score_sem: 0.8,
  justification: null, statut: "proposee", origine: "algo",
  valide_par_user_id: null, valide_le: null, cree_le: "2026-01-01",
  cours_nom: "Programmation avancée", cours_code: "INF-200", professeur_nom: "Alice",
};
// Affectation validée APPARTENANT au périmètre d'étape généré (doit rester courante).
const VALIDEE_CURRENT = {
  ...PROPOSEE, id: 3, professeur_id: 3, cours_id: 101, statut: "validee",
  cours_nom: "Structures de données", cours_code: "INF-201", professeur_nom: "Carol",
};
// Affectation traitée HORS périmètre d'étape (doit aller dans l'historique).
const HIST = {
  ...PROPOSEE, id: 2, professeur_id: 2, cours_id: 30733, statut: "validee",
  cours_nom: "Introduction à la programmation", cours_code: "30733 IFM", professeur_nom: "Bob",
};

// Données mockées mutables : le périmètre courant (gen-current) renvoie tous les
// statuts du périmètre d'étape ; le programme (gen-programme) renvoie tout.
let mockCurrentData: unknown[] = [PROPOSEE];
let mockProgrammeData: unknown[] = [PROPOSEE, HIST];

vi.mock("swr", () => ({
  default: (key: unknown) => {
    if (typeof key === "string" && key.startsWith("gen-current:")) {
      return { data: mockCurrentData, mutate: vi.fn() };
    }
    if (typeof key === "string" && key.startsWith("gen-programme:")) {
      return { data: mockProgrammeData, mutate: vi.fn() };
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

beforeEach(() => {
  vi.useFakeTimers();
  mockCurrentData = [PROPOSEE];
  mockProgrammeData = [PROPOSEE, HIST];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AffectationsPage — séparation des résultats", () => {
  it("place les déjà traitées dans une section distincte des propositions courantes", async () => {
    render(<AffectationsPage />);
    fireEvent.click(screen.getByText("go"));

    // Le pipeline reste affiché le délai minimal avant la bascule en revue.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DWELL_MS);
    });

    const section = screen.getByText(/Historique du programme hors sélection actuelle/i);
    expect(section.textContent).toMatch(/\(1\)/);

    expect(screen.getAllByText(/Programmation avancée/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Introduction à la programmation/).length).toBeGreaterThan(0);
  });

  it("garde une affectation traitée DU périmètre courant dans la section courante, pas dans l'historique", async () => {
    // Le périmètre d'étape contient une proposée + une validée ; l'historique ne
    // doit contenir que l'affectation hors périmètre.
    mockCurrentData = [PROPOSEE, VALIDEE_CURRENT];
    mockProgrammeData = [PROPOSEE, VALIDEE_CURRENT, HIST];

    render(<AffectationsPage />);
    fireEvent.click(screen.getByText("go"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DWELL_MS);
    });

    const summary = screen.getByText(/Historique du programme hors sélection actuelle/i);
    // Seule l'affectation hors périmètre (HIST) est dans l'historique.
    expect(summary.textContent).toMatch(/\(1\)/);

    const details = summary.closest("details");
    expect(details).not.toBeNull();
    const history = within(details as HTMLElement);
    // Hors périmètre → présent dans l'historique.
    expect(history.queryAllByText(/Introduction à la programmation/).length).toBeGreaterThan(0);
    // Validée mais DANS le périmètre courant → absente de l'historique…
    expect(history.queryAllByText(/Structures de données/)).toHaveLength(0);
    // …et bien présente dans la vue courante.
    expect(screen.getAllByText(/Structures de données/).length).toBeGreaterThan(0);
  });
});
