import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AffectationCompactTable } from "./AffectationCompactTable";
import type { AffectationOut } from "@/lib/types/api";

const POIDS = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

function makeAff(
  id: number,
  coursId: number,
  professeurId: number,
  score: number,
  overrides: Partial<AffectationOut> = {},
): AffectationOut {
  return {
    id,
    session_id: 1,
    professeur_id: professeurId,
    cours_id: coursId,
    score_total: score,
    score_comp: score,
    score_exp: score,
    score_hist: 0,
    score_sem: score,
    justification: "Compétences couvertes à 80 %, expérience pertinente.",
    justification_statut: "statique",
    statut: "proposee",
    origine: "algo",
    valide_par_user_id: null,
    valide_le: null,
    cree_le: "2026-05-28T17:00:00Z",
    cours_nom: null,
    cours_code: null,
    professeur_nom: null,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  poids: POIDS,
  coursNames: { 10: "IAI-303 — NLP", 11: "IAI-304 — Vision" },
  professorNames: { 100: "Marc-A. Roy", 101: "Rania El-Khoury" },
  onValidate: vi.fn(),
  onReject: vi.fn(),
};

describe("AffectationCompactTable", () => {
  it("affiche les colonnes Cours / Prof / Score / Justification", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Cours/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Prof/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Score/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Justification/ })).toBeInTheDocument();
  });

  it("trie les lignes par score décroissant", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.65),
          makeAff(2, 10, 101, 0.82),
          makeAff(3, 11, 100, 0.71),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1); // skip header
    const scores = rows.map((r) => within(r).getByTestId("score").textContent);
    expect(scores).toEqual(["0.82", "0.71", "0.65"]);
  });

  it("affiche le code de cours quand disponible", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByText(/IAI-303/)).toBeInTheDocument();
    expect(screen.getByText("Marc-A. Roy")).toBeInTheDocument();
  });

  it("affiche un badge de justification à côté de l'aperçu", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82, { justification_statut: "enrichie" })]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByLabelText(/Justification enrichie par l'IA/i)).toBeInTheDocument();
  });

  it("propose Valider et Rejeter sur une proposition", () => {
    const onValidate = vi.fn();
    const onReject = vi.fn();
    render(
      <AffectationCompactTable
        affectations={[makeAff(7, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
        onValidate={onValidate}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(onValidate).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole("button", { name: /Rejeter/i }));
    expect(onReject).toHaveBeenCalledWith(7);
  });

  it("masque les actions sur les affectations déjà décidées", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82, { statut: "validee" })]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.queryByRole("button", { name: /Valider/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rejeter/i })).not.toBeInTheDocument();
  });

  it("affiche un message vide si aucune affectation", () => {
    render(
      <AffectationCompactTable affectations={[]} {...DEFAULT_PROPS} />,
    );

    expect(screen.getByText(/Aucune proposition/i)).toBeInTheDocument();
  });
});
