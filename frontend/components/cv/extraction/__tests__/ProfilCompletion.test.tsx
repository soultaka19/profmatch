import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilCompletion, computeCompletionPercent } from "../ProfilCompletion";
import type { ExtractionData } from "@/lib/api/extraction";

function buildData(overrides: Partial<ExtractionData> = {}): ExtractionData {
  return {
    profil: { resume: null, source: "llm" },
    competences: [],
    experiences: [],
    formations: [],
    langues: [],
    ...overrides,
  };
}

describe("computeCompletionPercent", () => {
  it("retourne 0% quand toutes les sections sont vides", () => {
    expect(computeCompletionPercent(buildData())).toBe(0);
  });

  it("retourne 100% quand toutes les sections sont remplies", () => {
    const data = buildData({
      profil: { resume: "Mon profil", source: "manual" },
      competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
      experiences: [{ id: 1, poste: "Dev", employeur: "X", annee_debut: 2020, annee_fin: null, description_courte: null, source: "llm", ordre: 0 }],
      formations: [{ id: 1, diplome: "BSc", etablissement: "U", annee: 2018, source: "llm", ordre: 0 }],
      langues: [{ id: 1, langue: "Français", niveau: "natif", source: "llm" }],
    });
    expect(computeCompletionPercent(data)).toBe(100);
  });

  it("retourne 60% avec 3 sections sur 5", () => {
    const data = buildData({
      profil: { resume: "x", source: "llm" },
      competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
      experiences: [{ id: 1, poste: "Dev", employeur: "X", annee_debut: 2020, annee_fin: null, description_courte: null, source: "llm", ordre: 0 }],
    });
    expect(computeCompletionPercent(data)).toBe(60);
  });

  it("ignore un resume vide ou whitespace-only", () => {
    expect(computeCompletionPercent(buildData({ profil: { resume: "", source: "llm" } }))).toBe(0);
    expect(computeCompletionPercent(buildData({ profil: { resume: "   ", source: "llm" } }))).toBe(0);
  });
});

describe("ProfilCompletion", () => {
  it("affiche le pourcentage et le label", () => {
    const data = buildData({
      profil: { resume: "x", source: "llm" },
      competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
    });
    render(<ProfilCompletion data={data} />);
    expect(screen.getByText(/40\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/profil est complet/i)).toBeInTheDocument();
  });

  it("ajuste l'aria-valuenow sur la barre de progression", () => {
    const data = buildData({
      profil: { resume: "x", source: "llm" },
      competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
      experiences: [{ id: 1, poste: "Dev", employeur: "X", annee_debut: 2020, annee_fin: null, description_courte: null, source: "llm", ordre: 0 }],
    });
    render(<ProfilCompletion data={data} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});
