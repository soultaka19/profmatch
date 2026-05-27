import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilReadOnlyView } from "./ProfilReadOnlyView";
import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const detail: ProfesseurDetail = {
  professeur_id: 1,
  nom_complet: "Alice Martin",
  email: "alice@test.ca",
  cv_statut: "traite",
  cv_nom_original: "alice.pdf",
  traite_le: "2026-05-20T00:00:00Z",
  profil: { resume: "Dev senior", source: "llm" },
  competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
  experiences: [
    {
      id: 1, poste: "Dev", employeur: "Acme", annee_debut: 2020,
      annee_fin: null, description_courte: "Backend", source: "llm", ordre: 0,
    },
  ],
  formations: [
    { id: 1, diplome: "Bac info", etablissement: "UL", annee: 2017, source: "llm", ordre: 0 },
  ],
  langues: [{ id: 1, langue: "Français", niveau: "natif", source: "manual" }],
};

describe("ProfilReadOnlyView", () => {
  it("affiche les données structurées du profil", () => {
    render(<ProfilReadOnlyView detail={detail} />);
    expect(screen.getByText("Dev senior")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Bac info")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("n'expose aucune action de modification (lecture seule)", () => {
    render(<ProfilReadOnlyView detail={detail} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche un état vide pour les sections sans donnée", () => {
    render(
      <ProfilReadOnlyView
        detail={{
          ...detail,
          profil: { resume: null, source: "llm" },
          competences: [],
          experiences: [],
          formations: [],
          langues: [],
        }}
      />
    );
    expect(screen.getByText(/Aucun résumé/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucune compétence/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucune expérience/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucune formation/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucune langue/i)).toBeInTheDocument();
  });
});
