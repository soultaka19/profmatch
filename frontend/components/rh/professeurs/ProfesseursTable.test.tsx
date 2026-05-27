import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfesseursTable } from "./ProfesseursTable";
import type { ProfesseurListItem } from "@/lib/api/rhProfesseurs";

const items: ProfesseurListItem[] = [
  {
    professeur_id: 1,
    nom_complet: "Alice Martin",
    email: "alice@test.ca",
    cv_statut: "traite",
    cv_nom_original: "alice.pdf",
    traite_le: "2026-05-20T00:00:00Z",
  },
  {
    professeur_id: 2,
    nom_complet: "Bob Tremblay",
    email: "bob@test.ca",
    cv_statut: null,
    cv_nom_original: null,
    traite_le: null,
  },
];

describe("ProfesseursTable", () => {
  it("affiche une ligne par professeur", () => {
    render(<ProfesseursTable items={items} onPreview={vi.fn()} />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("bob@test.ca")).toBeInTheDocument();
  });

  it("appelle onPreview avec l'id du professeur au clic", () => {
    const onPreview = vi.fn();
    render(<ProfesseursTable items={items} onPreview={onPreview} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Prévisualiser le CV de Alice Martin" })
    );
    expect(onPreview).toHaveBeenCalledWith(1);
  });
});
