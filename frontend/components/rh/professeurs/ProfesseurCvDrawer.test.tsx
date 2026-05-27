import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfesseurCvDrawer } from "./ProfesseurCvDrawer";
import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const detail: ProfesseurDetail = {
  professeur_id: 1,
  nom_complet: "Alice Martin",
  email: "alice@test.ca",
  cv_statut: "traite",
  cv_nom_original: "alice.pdf",
  traite_le: "2026-05-20T00:00:00Z",
  profil: { resume: "Dev senior", source: "llm" },
  competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
  experiences: [],
  formations: [],
  langues: [],
};

const mockDetail = vi.fn();
vi.mock("@/lib/hooks/useRhProfesseurs", () => ({
  useRhProfesseurDetail: (id: number | null) => mockDetail(id),
}));

describe("ProfesseurCvDrawer", () => {
  beforeEach(() => mockDetail.mockReset());

  it("affiche le profil et un bouton de fermeture quand ouvert", () => {
    mockDetail.mockReturnValue({ data: detail, isLoading: false, error: undefined });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("affiche un indicateur de chargement", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });

  it("affiche un message d'erreur", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error("x") });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument();
  });
});
