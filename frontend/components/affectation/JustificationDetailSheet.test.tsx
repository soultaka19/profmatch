import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { JustificationDetailSheet } from "./JustificationDetailSheet";
import type { JustificationDetailOut } from "@/lib/types/api";

const DETAIL: JustificationDetailOut = {
  affectation_id: 42,
  score_total: 0.825,
  score_comp: 0.80,
  score_exp: 0.67,
  score_hist: 0.90,
  score_sem: 0.78,
  similarite_semantique: 0.78,
  annees_experience: 8,
  nb_sessions_precedentes: 2,
  note_rh_moyenne: 4.5,
  competences_requises: [
    { nom: "GPU", importance: 5, couverte: true },
    { nom: "Hugging Face", importance: 4, couverte: true },
    { nom: "NLP", importance: 5, couverte: true },
    { nom: "Transformers", importance: 4, couverte: false },
  ],
  competences_maitrisees: ["GPU", "Hugging Face", "Mathématiques", "NLP", "Python", "PyTorch"],
  justification: "Maîtrise complète de NLP, GPU, Hugging Face. 8 ans d'expérience.",
  justification_statut: "enrichie",
  nom_professeur: "Marc-André Roy",
  code_cours: "IAI-303",
  titre_cours: "Traitement du langage naturel",
};

describe("JustificationDetailSheet", () => {
  it("affiche le score global en pourcentage dans le bandeau de tête", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(await screen.findByText(/83 %/)).toBeInTheDocument();
    expect(screen.getByText("Marc-André Roy")).toBeInTheDocument();
    expect(screen.getByText(/IAI-303/)).toBeInTheDocument();
  });

  it("affiche le ratio 3 / 4 et le W1 pour les compétences", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    // Le texte est segmenté en plusieurs spans pour la mise en valeur du ratio
    expect(await screen.findByText("3 / 4")).toBeInTheDocument();
    expect(screen.getByText(/couvertes/i)).toBeInTheDocument();
    expect(screen.getByText(/W1\s+80\s*%/)).toBeInTheDocument();
  });

  it("marque chaque compétence requise comme couverte ou manquante", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("requise-GPU")).toHaveAttribute(
        "data-couverte",
        "true",
      );
    });
    expect(screen.getByTestId("requise-Transformers")).toHaveAttribute(
      "data-couverte",
      "false",
    );
  });

  it("affiche les compétences maîtrisées en chips", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(await screen.findByText("Python")).toBeInTheDocument();
    expect(screen.getByText("PyTorch")).toBeInTheDocument();
  });

  it("affiche les métadonnées compactes : exp, sessions, similarité", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(await screen.findByText("8 ans")).toBeInTheDocument();
    // Cellule historique : "2 sessions · 4.5 / 5" dans un seul paragraphe
    expect(screen.getByText(/2 sessions.*4\.5/i)).toBeInTheDocument();
    expect(screen.getByText("0.78")).toBeInTheDocument();
  });

  it("affiche la narration IA dans une section dédiée", async () => {
    render(
      <JustificationDetailSheet
        open
        loading={false}
        detail={DETAIL}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/Maîtrise complète de NLP/i),
    ).toBeInTheDocument();
  });

  it("rend un état de chargement quand loading=true", () => {
    render(
      <JustificationDetailSheet
        open
        loading
        detail={null}
        onClose={vi.fn()}
        onValidate={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });
});
