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
  it("affiche les colonnes Rang / Prof / Score / Actions uniquement", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Rang/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Prof/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Score/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Actions/ })).toBeInTheDocument();
    // Colonnes volontairement absentes : Cours (bandeau de pagination),
    // IA (badge accessible via le détail), Justification (ouvre le panneau)
    expect(
      screen.queryByRole("columnheader", { name: /^Cours$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /^IA$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Justification/ }),
    ).not.toBeInTheDocument();
  });

  it("affiche le score en pourcentage", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByTestId("score")).toHaveTextContent("82 %");
  });

  it("ne rend PAS le texte de la justification dans le tableau", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.82, {
            justification: "TEXTE JUSTIFICATION ULTRA SPECIFIQUE ABCDEF",
          }),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(
      screen.queryByText(/TEXTE JUSTIFICATION ULTRA SPECIFIQUE/),
    ).not.toBeInTheDocument();
  });

  it("classe les candidats #1 / #2 / #3 par score à l'intérieur du cours affiché", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.50),
          makeAff(2, 10, 101, 0.90),
          makeAff(3, 10, 102, 0.70),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    // tri local au cours : 0.90 / 0.70 / 0.50 → #1, #2, #3
    expect(within(rows[0]).getByText("#1")).toBeInTheDocument();
    expect(within(rows[1]).getByText("#2")).toBeInTheDocument();
    expect(within(rows[2]).getByText("#3")).toBeInTheDocument();
  });

  it("ouvre le détail via un bouton explicite 'Voir'", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByRole("button", { name: /Voir/i })).toBeInTheDocument();
  });

  it("affiche un seul cours à la fois (les autres sont accessibles via pagination)", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.82),
          makeAff(2, 11, 101, 0.95),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    // Un seul cours visible à la fois — donc une seule ligne sur les 2 affectations
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
  });

  it("affiche le nom complet du cours en titre de la vue paginée", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82)]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByText(/IAI-303 — NLP/i)).toBeInTheDocument();
    expect(screen.getByText("Marc-A. Roy")).toBeInTheDocument();
  });

  it("affiche un compteur Cours X / Y", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.82),
          makeAff(2, 11, 101, 0.95),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(screen.getByText(/Cours 1 \/ 2/i)).toBeInTheDocument();
  });

  it("expose des boutons Précédent / Suivant pour naviguer entre cours", () => {
    render(
      <AffectationCompactTable
        affectations={[
          makeAff(1, 10, 100, 0.82),
          makeAff(2, 11, 101, 0.95),
        ]}
        {...DEFAULT_PROPS}
      />,
    );

    const prev = screen.getByRole("button", { name: /Précédent/i });
    const next = screen.getByRole("button", { name: /Suivant/i });

    // 1er cours par défaut → Précédent désactivé, Suivant actif
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    expect(screen.getByText(/IAI-303 — NLP/)).toBeInTheDocument();

    fireEvent.click(next);

    // Bascule sur le 2e cours
    expect(screen.getByText(/IAI-304 — Vision/)).toBeInTheDocument();
    expect(screen.getByText(/Cours 2 \/ 2/i)).toBeInTheDocument();
    // Maintenant Précédent actif, Suivant désactivé (dernier)
    expect(screen.getByRole("button", { name: /Précédent/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Suivant/i })).toBeDisabled();
  });

  it("ne rend AUCUN badge de justification dans le tableau (détail seulement)", () => {
    render(
      <AffectationCompactTable
        affectations={[makeAff(1, 10, 100, 0.82, { justification_statut: "enrichie" })]}
        {...DEFAULT_PROPS}
      />,
    );

    expect(
      screen.queryByLabelText(/Justification enrichie par l'IA/i),
    ).not.toBeInTheDocument();
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
