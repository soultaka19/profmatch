import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AffectationTable } from "./AffectationTable";
import { affectationsApi } from "@/lib/api/affectations";
import type { AffectationOut, JustificationDetailOut } from "@/lib/types/api";

// On garde le vrai module et on n'override que le détail de justification :
// les autres méthodes (list, validate, manuel…) restent réelles mais ne sont
// jamais déclenchées dans ces tests (aucune ouverture réseau).
vi.mock("@/lib/api/affectations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/affectations")>();
  return {
    ...actual,
    affectationsApi: {
      ...actual.affectationsApi,
      getJustificationDetail: vi.fn(),
    },
  };
});

const VIEW_STORAGE_KEY = "profmatch.affectations.view";
const setView = (v: "cards" | "compact") =>
  window.localStorage.setItem(VIEW_STORAGE_KEY, v);

const makeDetail = (id: number): JustificationDetailOut => ({
  affectation_id: id,
  score_total: 0.84,
  score_comp: 0.8,
  score_exp: 0.7,
  score_hist: 0.9,
  score_sem: 0.85,
  similarite_semantique: 0.85,
  annees_experience: 6,
  nb_sessions_precedentes: 0,
  note_rh_moyenne: 0,
  competences_requises: [],
  competences_maitrisees: [],
  justification: `Analyse IA détaillée ${id}`,
  justification_statut: "enrichie",
  nom_professeur: "Ahmed Diallo",
  code_cours: "PI-301",
  titre_cours: "Algorithmes",
});

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(affectationsApi.getJustificationDetail).mockReset();
});

afterEach(() => {
  window.localStorage.clear();
});

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
  justification: `Justification ${id}`,
  statut: "proposee",
  origine: "algo",
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
    setView("cards");
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        sessionId={1}
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onManualAssigned={vi.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: "PI-301 Algorithmes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "IAI-301 ML" })).toBeInTheDocument();
  });

  it("affiche le bon nombre de candidats par cours", () => {
    setView("cards");
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        sessionId={1}
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onManualAssigned={vi.fn()}
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
        sessionId={1}
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onManualAssigned={vi.fn()}
      />
    );
    expect(screen.getByText(/aucune proposition/i)).toBeInTheDocument();
  });

  it("filtre les propositions par niveau de recommandation", () => {
    setView("cards");
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

    fireEvent.change(screen.getByLabelText("Filtrer par recommandation"), {
      target: { value: "forte" },
    });

    expect(screen.getByText("Luc Martin")).toBeInTheDocument();
    expect(screen.queryByText("Fatou Ba")).not.toBeInTheDocument();
  });

  it("ouvre la justification dans le panneau détaillé unifié (vue cartes)", async () => {
    setView("cards");
    vi.mocked(affectationsApi.getJustificationDetail).mockResolvedValue(makeDetail(1));
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

    fireEvent.click(screen.getAllByRole("button", { name: "Voir la justification" })[0]);

    // Même panneau riche (wireframe B) que la vue tableau, alimenté par
    // getJustificationDetail — plus le drawer texte brut d'antan.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Match compétences")).toBeInTheDocument();
    expect(await screen.findByText("Analyse IA détaillée 1")).toBeInTheDocument();
    expect(affectationsApi.getJustificationDetail).toHaveBeenCalledWith(1);
  });

  it("permet de parcourir les cours un par un", () => {
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

    fireEvent.change(screen.getByLabelText("Cours à réviser"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cours suivant" }));

    expect(screen.getByRole("heading", { name: "IAI-301 ML" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PI-301 Algorithmes" })).not.toBeInTheDocument();
  });

  it("adapte les filtres en consultation historique sans action de revue", () => {
    render(
      <AffectationTable
        mode="history"
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Filtrer par cours")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cours suivant" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Affecter un autre professeur/i)).not.toBeInTheDocument();
  });

  it("propose un toggle pour basculer entre vue cartes et vue tableau compact", () => {
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        sessionId={1}
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onManualAssigned={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Vue cartes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vue tableau compact/i })).toBeInTheDocument();
  });

  it("affiche la vue tableau compacte par défaut, basculable en cartes", () => {
    render(
      <AffectationTable
        affectations={affectations}
        coursNames={coursNames}
        professorNames={professorNames}
        poids={poids}
        sessionId={1}
        onValidate={vi.fn()}
        onReject={vi.fn()}
        onManualAssigned={vi.fn()}
      />
    );

    // Défaut = tableau compact (mode de revue privilégié), vue paginée par cours
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText(/Cours 1 \/ 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Vue cartes/i }));

    // Maintenant les cartes : plus de tableau, sections groupées par cours
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "PI-301 Algorithmes" })).toHaveLength(1);
  });
});
