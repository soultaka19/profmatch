import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminStatsCards } from "./AdminStatsCards";

const stats = {
  utilisateurs_total: 5, professeurs_total: 3, cv_traites: 2, cv_en_attente: 1,
  cours_total: 8, programmes_total: 2, sessions_total: 1, sessions_ouvertes: 1,
  affectations_total: 4, affectations_validees: 2,
};

describe("AdminStatsCards", () => {
  it("affiche les compteurs et un squelette en chargement", () => {
    const { rerender } = render(<AdminStatsCards stats={undefined} isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<AdminStatsCards stats={stats} isLoading={false} />);
    expect(screen.getByText("8")).toBeInTheDocument(); // cours
    expect(screen.getByText(/Cours/)).toBeInTheDocument();
  });
});
