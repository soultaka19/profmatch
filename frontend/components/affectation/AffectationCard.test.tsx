import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AffectationCard } from "./AffectationCard";
import type { AffectationOut } from "@/lib/types/api";

const aff: AffectationOut = {
  id: 1,
  session_id: 1,
  professeur_id: 42,
  cours_id: 10,
  score_total: 0.84,
  score_comp: 0.857,
  score_exp: 0.75,
  score_hist: 0.9,
  score_sem: 0.92,
  justification: "• Compétences : Maîtrise de React. • Expérience : 9 ans.",
  statut: "proposee",
  origine: "algo",
  valide_par_user_id: null,
  valide_le: null,
  cree_le: "2026-05-22T00:00:00Z",
  cours_nom: null,
  cours_code: null,
  professeur_nom: null,
};
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("AffectationCard", () => {
  it("affiche le nom du professeur", () => {
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText("Ahmed Diallo")).toBeInTheDocument();
  });

  it("affiche le score global", () => {
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("demande l'ouverture de la justification sans agrandir la carte", () => {
    const onViewJustification = vi.fn();
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onViewJustification={onViewJustification}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Voir la justification/i }));
    expect(onViewJustification).toHaveBeenCalledWith(aff);
    expect(screen.queryByText(/Maîtrise de React/i)).not.toBeInTheDocument();
  });

  it("appelle onValidate au clic Valider", () => {
    const onValidate = vi.fn();
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={onValidate}
        onReject={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(onValidate).toHaveBeenCalledWith(1);
  });

  it("désactive les actions pendant une validation en cours", () => {
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
        pendingAction="validate"
      />
    );

    expect(screen.getByRole("button", { name: /Validation/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Rejeter/i })).toBeDisabled();
  });

  it("affiche le feedback inline de la derniere action", () => {
    render(
      <AffectationCard
        aff={{ ...aff, statut: "validee" }}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
        actionFeedback={{ tone: "success", message: "Affectation validée." }}
      />
    );

    expect(screen.getByText("Affectation validée.")).toBeInTheDocument();
  });

  it("appelle onReject au clic Rejeter", () => {
    const onReject = vi.fn();
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={onReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Rejeter/i }));
    expect(onReject).toHaveBeenCalledWith(1);
  });

  it("masque les boutons si statut validee", () => {
    render(
      <AffectationCard
        aff={{ ...aff, statut: "validee" }}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /Valider/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rejeter/i })).toBeNull();
  });

  it("affiche le badge Manuel quand origine = manuel", () => {
    render(
      <AffectationCard
        aff={{ ...aff, origine: "manuel" }}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText("Manuel")).toBeInTheDocument();
  });

  it("n'affiche pas le badge Manuel quand origine = algo", () => {
    render(
      <AffectationCard
        aff={aff}
        poids={poids}
        professorName="Ahmed Diallo"
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.queryByText("Manuel")).not.toBeInTheDocument();
  });
});
