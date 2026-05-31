import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormationSection } from "../FormationSection";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: { formations: { remove: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const items = [
  { id: 1, diplome: "Maîtrise", etablissement: "U. Laval", annee: 2018, source: "llm" as const, ordre: 0 },
];

beforeEach(() => vi.clearAllMocks());

describe("FormationSection", () => {
  it("affiche diplôme + établissement + année (sans numéro d'index)", () => {
    render(<FormationSection items={items} onMutate={vi.fn()} />);
    expect(screen.queryByText("03")).not.toBeInTheDocument();
    expect(screen.getByText("Maîtrise")).toBeInTheDocument();
    expect(screen.getByText("U. Laval")).toBeInTheDocument();
    expect(screen.getByText("2018")).toBeInTheDocument();
  });

  it("supprime un item via AlertDialog", async () => {
    const onMutate = vi.fn();
    const { extractionApi } = await import("@/lib/api/extraction");
    render(<FormationSection items={items} onMutate={onMutate} />);
    fireEvent.click(screen.getByLabelText("Supprimer Maîtrise"));
    fireEvent.click(screen.getByRole("button", { name: /^Supprimer$/i }));
    await waitFor(() => {
      expect(extractionApi.formations.remove).toHaveBeenCalledWith(1);
      expect(onMutate).toHaveBeenCalled();
    });
  });
});
