import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MesAffectationsPage from "../page";
import type { AffectationProfOut } from "@/lib/types/api";

vi.mock("swr", () => ({
  default: vi.fn(() => swrState),
}));

vi.mock("@/lib/api/affectations", () => ({
  affectationsApi: {
    mesAffectations: vi.fn(),
  },
}));

let swrState: {
  data?: AffectationProfOut[];
  error?: Error;
  isLoading?: boolean;
} = {};

const affectation: AffectationProfOut = {
  id: 1,
  session_id: 1,
  cours_id: 1,
  score_total: 0.72,
  score_comp: 0.8,
  score_exp: 0.7,
  score_hist: 0.6,
  score_sem: 0.5,
  justification: "Analyse disponible",
  statut: "proposee",
  origine: "algo",
  valide_le: null,
  cree_le: "2026-05-25T12:00:00Z",
  session_nom: "Hiver 2026",
  cours_code: "IFM-30733",
  cours_nom: "Introduction a la programmation",
};

describe("MesAffectationsPage", () => {
  beforeEach(() => {
    swrState = {};
  });

  it("affiche l'etat de chargement", () => {
    swrState = { isLoading: true };

    render(<MesAffectationsPage />);

    expect(screen.getByText(/chargement de vos affectations/i)).toBeInTheDocument();
  });

  it("affiche l'etat vide", () => {
    swrState = { data: [], isLoading: false };

    render(<MesAffectationsPage />);

    expect(screen.getByText(/aucune affectation pour le moment/i)).toBeInTheDocument();
  });

  it("groupe les affectations validees par session sans filtres de statut", () => {
    swrState = {
      isLoading: false,
      data: [
        { ...affectation, statut: "validee" },
        {
          ...affectation,
          id: 2,
          statut: "validee",
          cours_code: "IAI-301",
          cours_nom: "Machine Learning fondamental",
        },
      ],
    };

    render(<MesAffectationsPage />);

    expect(screen.getAllByText(/Hiver 2026/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/IFM-30733/)).toBeInTheDocument();
    expect(screen.getByText(/IAI-301/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /proposees/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rejetees/i })).not.toBeInTheDocument();
  });

  it("affiche une erreur de chargement", () => {
    swrState = { isLoading: false, error: new Error("boom") };

    render(<MesAffectationsPage />);

    expect(screen.getByText(/impossible de charger vos affectations/i)).toBeInTheDocument();
  });
});
