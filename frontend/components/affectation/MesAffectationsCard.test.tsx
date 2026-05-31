import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MesAffectationsCard } from "./MesAffectationsCard";
import type { AffectationProfOut } from "@/lib/types/api";

const affectation: AffectationProfOut = {
  id: 7,
  session_id: 2,
  cours_id: 12,
  score_total: 0.84,
  score_comp: 0.9,
  score_exp: 0.8,
  score_hist: 0.7,
  score_sem: 0.6,
  justification: "Competences fortes\nExperience pertinente",
  statut: "validee",
  origine: "algo",
  valide_le: "2026-05-26T12:00:00Z",
  cree_le: "2026-05-25T12:00:00Z",
  session_nom: "Automne 2026",
  cours_code: "WEB-301",
  cours_nom: "Developpement web avance",
};

describe("MesAffectationsCard", () => {
  it("affiche une affectation professeur en lecture seule", () => {
    render(<MesAffectationsCard affectation={affectation} />);

    expect(screen.getByText(/WEB-301/)).toBeInTheDocument();
    expect(screen.getByText(/Automne 2026/)).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(screen.getByText("Validee")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /valider/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rejeter/i })).not.toBeInTheDocument();
  });

  it("affiche les sous-scores sans ponderations par defaut", () => {
    render(<MesAffectationsCard affectation={affectation} />);

    expect(screen.getByText("Competences 90%")).toBeInTheDocument();
    expect(screen.getByText("Experience 80%")).toBeInTheDocument();
    expect(screen.getByText("Historique 70%")).toBeInTheDocument();
    expect(screen.getByText("Semantique 60%")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Score total/)).not.toBeInTheDocument();
  });

  it("n'expose aucune justification IA (vue prof)", () => {
    render(<MesAffectationsCard affectation={affectation} />);

    // La justification n'est plus proposée côté professeur.
    expect(
      screen.queryByRole("button", { name: /voir la justification/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Competences fortes")).not.toBeInTheDocument();
    expect(screen.queryByText("Experience pertinente")).not.toBeInTheDocument();
  });
});
