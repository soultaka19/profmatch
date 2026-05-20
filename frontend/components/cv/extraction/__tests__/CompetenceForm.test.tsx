import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompetenceForm } from "../CompetenceForm";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: {
    competences: {
      add: vi.fn().mockResolvedValue({ id: 99, nom: "Rust", niveau: "intermediaire", source: "manual" }),
      update: vi.fn().mockResolvedValue({ id: 1, nom: "Python", niveau: "expert", source: "manual" }),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => { vi.clearAllMocks(); });

describe("CompetenceForm", () => {
  it("désactive Enregistrer si nom vide", () => {
    render(<CompetenceForm open onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeDisabled();
  });

  it("appelle add() en mode création", async () => {
    const { extractionApi } = await import("@/lib/api/extraction");
    const onMutate = vi.fn();
    const onClose = vi.fn();
    render(<CompetenceForm open onOpenChange={onClose} onMutate={onMutate} />);
    fireEvent.change(screen.getByLabelText(/^Compétence$/i), { target: { value: "Rust" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(extractionApi.competences.add).toHaveBeenCalledWith({ nom: "Rust", niveau: "intermediaire" });
      expect(onMutate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  it("appelle update() en mode édition", async () => {
    const { extractionApi } = await import("@/lib/api/extraction");
    const initial = { id: 1, nom: "Python", niveau: "avance" as const, source: "llm" as const };
    render(<CompetenceForm open initial={initial} onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(extractionApi.competences.update).toHaveBeenCalledWith(1, { nom: "Python", niveau: "avance" });
    });
  });

  it("affiche le bon titre selon mode", () => {
    const { rerender } = render(<CompetenceForm open onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    expect(screen.getByText("Nouvelle compétence")).toBeInTheDocument();
    rerender(
      <CompetenceForm
        open
        initial={{ id: 1, nom: "X", niveau: "expert", source: "llm" }}
        onOpenChange={vi.fn()}
        onMutate={vi.fn()}
      />
    );
    expect(screen.getByText("Modifier une compétence")).toBeInTheDocument();
  });
});
