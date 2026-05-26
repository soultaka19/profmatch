import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MesAffectationsPage from "../page";
import type { AffectationProfOut } from "@/lib/types/api";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/api/affectations", () => ({
  affectationsApi: {
    mesAffectations: vi.fn(),
  },
}));

const mockAff: AffectationProfOut = {
  id: 1,
  session_id: 10,
  session_nom: "Automne 2026",
  cours_id: 20,
  cours_code: "WEB-301",
  cours_nom: "Développement web avancé",
  score_total: 0.84,
  score_comp: 0.857,
  score_exp: 0.75,
  score_hist: 1.0,
  score_sem: 0.62,
  justification: "• Compétences : ok\nRecommandation : Fortement recommandé.",
  statut: "validee",
  origine: "algo",
  valide_le: "2026-05-26T12:00:00Z",
  cree_le: "2026-05-26T10:00:00Z",
};

// SWR mock — contrôlé par useSWRData helper
let useSWRData: { data?: AffectationProfOut[]; isLoading?: boolean; error?: Error } = {};

vi.mock("swr", () => ({
  default: vi.fn(() => useSWRData),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MesAffectationsPage", () => {
  beforeEach(() => {
    useSWRData = {};
  });

  it("affiche le spinner pendant le chargement", () => {
    useSWRData = { isLoading: true };
    render(<MesAffectationsPage />);
    expect(screen.getByText(/chargement de vos affectations/i)).toBeInTheDocument();
  });

  it("affiche l'empty state quand aucune affectation", () => {
    useSWRData = { data: [], isLoading: false };
    render(<MesAffectationsPage />);
    expect(screen.getByText(/aucune affectation pour le moment/i)).toBeInTheDocument();
  });

  it("affiche le nom du cours et la session quand des affectations existent", () => {
    useSWRData = { data: [mockAff], isLoading: false };
    render(<MesAffectationsPage />);
    expect(screen.getByText(/WEB-301/i)).toBeInTheDocument();
    // "Automne 2026" apparaît dans le heading de section ET dans la card
    expect(screen.getAllByText(/Automne 2026/i).length).toBeGreaterThanOrEqual(1);
  });

  it("affiche le message d'erreur en cas d'échec API", () => {
    useSWRData = { error: new Error("Network error"), isLoading: false };
    render(<MesAffectationsPage />);
    expect(screen.getByText(/impossible de charger/i)).toBeInTheDocument();
  });

  it("groupe les affectations par session", () => {
    const aff2: AffectationProfOut = {
      ...mockAff,
      id: 2,
      session_id: 11,
      session_nom: "Hiver 2027",
      cours_code: "DB-201",
      cours_nom: "Bases de données",
    };
    useSWRData = { data: [mockAff, aff2], isLoading: false };
    render(<MesAffectationsPage />);
    // Chaque session_nom apparaît au moins une fois (heading section + card)
    expect(screen.getAllByText(/Automne 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Hiver 2027/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/WEB-301/i)).toBeInTheDocument();
    expect(screen.getByText(/DB-201/i)).toBeInTheDocument();
  });
});
