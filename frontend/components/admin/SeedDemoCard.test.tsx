import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeedDemoCard } from "./SeedDemoCard";
import { maintenanceApi } from "@/lib/api/maintenance";

vi.mock("@/lib/api/maintenance", () => ({
  maintenanceApi: { seedDemo: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe("SeedDemoCard", () => {
  it("charge le jeu de démo après confirmation et affiche les compteurs", async () => {
    vi.mocked(maintenanceApi.seedDemo).mockResolvedValue({
      utilisateurs: 14,
      professeurs: 12,
      cours: 10,
      sessions: 1,
      embeddings_professeurs: 12,
      embeddings_cours: 10,
    });

    render(<SeedDemoCard />);

    fireEvent.click(screen.getByRole("button", { name: /Charger le jeu de démo/i }));
    // Confirmation dans le dialogue
    fireEvent.click(screen.getByRole("button", { name: /^Charger$/ }));

    expect(maintenanceApi.seedDemo).toHaveBeenCalledTimes(1);
    // Compteurs rendus après succès (valeurs uniques pour éviter l'ambiguïté)
    expect(await screen.findByText("Utilisateurs")).toBeInTheDocument();
    expect(await screen.findByText("14")).toBeInTheDocument();
  });

  it("n'appelle pas l'API si l'utilisateur annule", () => {
    render(<SeedDemoCard />);

    fireEvent.click(screen.getByRole("button", { name: /Charger le jeu de démo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));

    expect(maintenanceApi.seedDemo).not.toHaveBeenCalled();
  });
});
