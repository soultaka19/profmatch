import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JustificationBadge } from "./JustificationBadge";

describe("JustificationBadge", () => {
  it("affiche un badge IA pour les justifications enrichies", () => {
    render(<JustificationBadge statut="enrichie" />);
    const badge = screen.getByLabelText(/Justification enrichie par l'IA/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-statut", "enrichie");
  });

  it("affiche un badge technique pour les justifications statiques", () => {
    render(<JustificationBadge statut="statique" />);
    const badge = screen.getByLabelText(/Justification technique/i);
    expect(badge).toHaveAttribute("data-statut", "statique");
  });

  it("affiche un badge 'en cours' pour les justifications en attente IA", () => {
    render(<JustificationBadge statut="en_cours" />);
    const badge = screen.getByLabelText(/Enrichissement IA en cours/i);
    expect(badge).toHaveAttribute("data-statut", "en_cours");
  });

  it("affiche un badge 'IA indisponible' pour les justifications en échec", () => {
    render(<JustificationBadge statut="echec" />);
    const badge = screen.getByLabelText(/IA indisponible/i);
    expect(badge).toHaveAttribute("data-statut", "echec");
  });

  it("rend null quand le statut n'est pas fourni (rétrocompat)", () => {
    const { container } = render(<JustificationBadge statut={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
