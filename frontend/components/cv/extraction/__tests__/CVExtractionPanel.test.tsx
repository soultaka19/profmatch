import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CVExtractionPanel } from "../CVExtractionPanel";

const fakeData = {
  profil: { resume: "Senior", source: "manual" as const },
  competences: [{ id: 1, nom: "Python", niveau: "expert" as const, source: "llm" as const }],
  experiences: [{
    id: 1, poste: "Dev", employeur: "Acme", annee_debut: 2020, annee_fin: null,
    description_courte: null, source: "llm" as const, ordre: 0,
  }],
  formations: [{
    id: 1, diplome: "Bach", etablissement: "UL", annee: 2017, source: "llm" as const, ordre: 0,
  }],
  langues: [{ id: 1, langue: "Français", niveau: "natif" as const, source: "llm" as const }],
};

vi.mock("@/lib/hooks/useExtraction", () => ({
  useExtraction: () => ({ data: fakeData, isLoading: false, error: null, mutate: vi.fn() }),
}));

vi.mock("@/components/cv/CVTextPreview", () => ({
  CVTextPreview: () => <div data-testid="cv-text-preview">Texte brut</div>,
}));

describe("CVExtractionPanel", () => {
  it("rend les 5 sections + texte brut en bas", () => {
    render(<CVExtractionPanel />);
    expect(screen.getByText("Profil")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Compétences")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Expériences")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Formations")).toBeInTheDocument();
    expect(screen.getByText("Bach")).toBeInTheDocument();
    expect(screen.getByText("Langues")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByTestId("cv-text-preview")).toBeInTheDocument();
  });

  it("rend les 4 eyebrows numérotés 00-04", () => {
    render(<CVExtractionPanel />);
    expect(screen.getByText("00")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });
});
