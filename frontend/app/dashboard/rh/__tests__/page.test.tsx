import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RhDashboardPage from "../page";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "rh@test.ca", nom_complet: "Amina RH", role: "rh" },
  }),
}));

describe("RhDashboardPage", () => {
  it("présente un hub RH opérationnel au lieu d'un placeholder", () => {
    render(<RhDashboardPage />);

    expect(screen.getByText(/Bienvenue, Amina RH/i)).toBeInTheDocument();
    expect(screen.queryByText(/Module en cours de développement/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Générer des affectations/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Consulter l'historique/i })).toBeInTheDocument();
    expect(screen.getByText(/choisir une session/i)).toBeInTheDocument();
  });
});
