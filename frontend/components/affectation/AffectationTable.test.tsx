import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AffectationTable } from "./AffectationTable";
import type { AffectationOut } from "@/lib/types/api";

const makeAff = (id: number, cours_id: number, score: number): AffectationOut => ({
  id,
  session_id: 1,
  professeur_id: id * 10,
  cours_id,
  score_total: score,
  score_comp: 0.8,
  score_exp: 0.7,
  score_hist: 0.9,
  score_sem: 0.85,
  justification: null,
  statut: "proposee",
  valide_par_user_id: null,
  valide_le: null,
  cree_le: "2026-05-22T00:00:00Z",
  cours_nom: null,
  cours_code: null,
  professeur_nom: null,
});

const affectations = [
  makeAff(1, 10, 0.84),
  makeAff(2, 10, 0.72),
  makeAff(3, 20, 0.91),
];

const coursNames: Record<number, string> = {
  10: "PI-301 Algorithmes",
  20: "IAI-301 ML",
};
const professorNames: Record<number, string> = {
  10: "Ahmed Diallo",
  20: "Fatou Ba",
  30: "Luc Martin",
};
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("AffectationTable", () => {
  it("groupe les affectations par cours", () => {
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText("PI-301 Algorithmes")).toBeInTheDocument();
    expect(screen.getByText("IAI-301 ML")).toBeInTheDocument();
  });

  it("affiche le bon nombre de candidats par cours", () => {
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText("2 candidats")).toBeInTheDocument();
    expect(screen.getByText("1 candidat")).toBeInTheDocument();
  });

  it("affiche un message si aucune affectation", () => {
    render(
      <AffectationTable
        affectations={[]}
        coursNames={{}}
        professorNames={{}}
        poids={poids}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/aucune proposition/i)).toBeInTheDocument();
  });
});
