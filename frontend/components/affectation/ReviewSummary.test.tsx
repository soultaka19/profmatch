import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewSummary } from "./ReviewSummary";
import type { AffectationOut } from "@/lib/types/api";

const item = (id: number, coursId: number, total: number, statut: AffectationOut["statut"]): AffectationOut => ({
  id,
  session_id: 1,
  professeur_id: id,
  cours_id: coursId,
  score_total: total,
  score_comp: total,
  score_exp: total,
  score_hist: total,
  score_sem: total,
  justification: null,
  statut,
  valide_par_user_id: null,
  valide_le: null,
  cree_le: "2026-05-25T00:00:00Z",
  cours_nom: null,
  cours_code: null,
  professeur_nom: null,
});

describe("ReviewSummary", () => {
  it("résume les cours, recommandations et décisions", () => {
    render(
      <ReviewSummary
        affectations={[
          item(1, 10, 0.85, "validee"),
          item(2, 10, 0.65, "proposee"),
          item(3, 20, 0.45, "rejetee"),
        ]}
      />
    );

    const summary = screen.getByLabelText("Synthèse des propositions");
    expect(summary).toHaveTextContent("2cours analysés");
    expect(summary).toHaveTextContent("3propositions");
    expect(summary).toHaveTextContent("2traitées sur 3");
    expect(summary).toHaveTextContent("1fortement recommandée");
    expect(summary).toHaveTextContent("1avec réserves");
    expect(summary).toHaveTextContent("1à examiner");
  });
});
