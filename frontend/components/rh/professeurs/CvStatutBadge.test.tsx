import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CvStatutBadge } from "./CvStatutBadge";

describe("CvStatutBadge", () => {
  it("affiche le libellé pour un CV traité", () => {
    render(<CvStatutBadge statut="traite" />);
    expect(screen.getByText("Traité")).toBeInTheDocument();
  });

  it("affiche « Aucun CV » quand le statut est null", () => {
    render(<CvStatutBadge statut={null} />);
    expect(screen.getByText("Aucun CV")).toBeInTheDocument();
  });

  it("affiche « Erreur » pour le statut erreur", () => {
    render(<CvStatutBadge statut="erreur" />);
    expect(screen.getByText("Erreur")).toBeInTheDocument();
  });
});
