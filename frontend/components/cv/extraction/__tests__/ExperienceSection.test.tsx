import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExperienceSection } from "../ExperienceSection";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: { experiences: { remove: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const items = [
  {
    id: 1, poste: "Lead Dev", employeur: "Acme", annee_debut: 2020, annee_fin: null,
    description_courte: "Backend Django", source: "llm" as const, ordre: 0,
  },
  {
    id: 2, poste: "Stagiaire", employeur: "Beta", annee_debut: 2018, annee_fin: 2019,
    description_courte: null, source: "manual" as const, ordre: 1,
  },
];

beforeEach(() => vi.clearAllMocks());

describe("ExperienceSection", () => {
  it("affiche les items + période formatée (sans numéro d'index)", () => {
    render(<ExperienceSection items={items} onMutate={vi.fn()} />);
    expect(screen.queryByText("02")).not.toBeInTheDocument();
    expect(screen.getByText("Lead Dev")).toBeInTheDocument();
    expect(screen.getByText("2020 → actuel")).toBeInTheDocument();
    expect(screen.getByText("2018 → 2019")).toBeInTheDocument();
    expect(screen.getByText("Backend Django")).toBeInTheDocument();
  });

  it("supprime un item via AlertDialog", async () => {
    const onMutate = vi.fn();
    const { extractionApi } = await import("@/lib/api/extraction");
    render(<ExperienceSection items={items} onMutate={onMutate} />);
    fireEvent.click(screen.getByLabelText("Supprimer Lead Dev"));
    fireEvent.click(screen.getByRole("button", { name: /^Supprimer$/i }));
    await waitFor(() => {
      expect(extractionApi.experiences.remove).toHaveBeenCalledWith(1);
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it("ouvre form au click Ajouter", () => {
    render(<ExperienceSection items={items} onMutate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ajouter$/i }));
    expect(screen.getByText("Nouvelle expérience")).toBeInTheDocument();
  });
});
