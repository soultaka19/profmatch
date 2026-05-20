import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompetenceSection } from "../CompetenceSection";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: {
    competences: { remove: vi.fn().mockResolvedValue(undefined), add: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const items = [
  { id: 1, nom: "Python", niveau: "expert" as const, source: "llm" as const },
  { id: 2, nom: "Java", niveau: "avance" as const, source: "manual" as const },
];

beforeEach(() => { vi.clearAllMocks(); });

describe("CompetenceSection", () => {
  it("affiche eyebrow '01' et count", () => {
    render(<CompetenceSection items={items} onMutate={vi.fn()} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Compétences")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("liste les compétences avec niveau et source", () => {
    render(<CompetenceSection items={items} onMutate={vi.fn()} />);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Expert")).toBeInTheDocument();
    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getByText("Avancé")).toBeInTheDocument();
    expect(screen.getByLabelText("Extrait par l'IA")).toBeInTheDocument();
    expect(screen.getByLabelText("Édité manuellement")).toBeInTheDocument();
  });

  it("affiche le placeholder cliquable si vide", () => {
    render(<CompetenceSection items={[]} onMutate={vi.fn()} />);
    expect(screen.getByText(/Aucune compétence détectée/i)).toBeInTheDocument();
  });

  it("ouvre l'AlertDialog au click sur supprimer", () => {
    render(<CompetenceSection items={items} onMutate={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Supprimer Python"));
    expect(screen.getByText(/Supprimer cette compétence/i)).toBeInTheDocument();
    expect(screen.getByText(/Python.*supprimée définitivement/i)).toBeInTheDocument();
  });

  it("appelle remove et mutate au confirm suppression", async () => {
    const onMutate = vi.fn();
    const { extractionApi } = await import("@/lib/api/extraction");
    render(<CompetenceSection items={items} onMutate={onMutate} />);
    fireEvent.click(screen.getByLabelText("Supprimer Python"));
    fireEvent.click(screen.getByRole("button", { name: /^Supprimer$/i }));
    await waitFor(() => {
      expect(extractionApi.competences.remove).toHaveBeenCalledWith(1);
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it("ouvre le form au click Ajouter", () => {
    render(<CompetenceSection items={items} onMutate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));
    expect(screen.getByText("Nouvelle compétence")).toBeInTheDocument();
  });
});
