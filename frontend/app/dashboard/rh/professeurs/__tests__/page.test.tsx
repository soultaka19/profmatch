import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Page from "../page";
import type { ProfesseurListResponse } from "@/lib/api/rhProfesseurs";

const listResponse: ProfesseurListResponse = {
  items: [
    {
      professeur_id: 1, nom_complet: "Alice Martin", email: "alice@test.ca",
      cv_statut: "traite", cv_nom_original: "alice.pdf", traite_le: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockList = vi.fn();
vi.mock("@/lib/hooks/useRhProfesseurs", () => ({
  useRhProfesseurs: (...args: unknown[]) => mockList(...args),
  useRhProfesseurDetail: () => ({ data: undefined, isLoading: false, error: undefined }),
  RH_PROFESSEURS_PAGE_SIZE: 10,
}));

describe("Page Professeurs RH", () => {
  beforeEach(() => mockList.mockReset());

  it("affiche le tableau des professeurs", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Professeurs" })).toBeInTheDocument();
  });

  it("affiche un champ de recherche", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    expect(screen.getByPlaceholderText(/Rechercher/i)).toBeInTheDocument();
  });

  it("affiche un état vide", () => {
    mockList.mockReturnValue({
      data: { items: [], total: 0, page: 1, page_size: 10 },
      isLoading: false, error: undefined,
    });
    render(<Page />);
    expect(screen.getByText(/Aucun professeur/i)).toBeInTheDocument();
  });

  it("ouvre le drawer au clic sur Prévisualiser", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    fireEvent.click(
      screen.getByRole("button", { name: "Prévisualiser le CV de Alice Martin" })
    );
    expect(screen.getAllByText("alice@test.ca").length).toBeGreaterThan(0);
  });
});
