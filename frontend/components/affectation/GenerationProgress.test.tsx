import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GenerationProgress } from "./GenerationProgress";

describe("GenerationProgress", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche les 4 étapes du pipeline d'affectation", () => {
    render(<GenerationProgress status="processing" />);

    expect(screen.getByText(/Analyse des profils/i)).toBeInTheDocument();
    expect(screen.getByText(/Chargement des cours/i)).toBeInTheDocument();
    expect(screen.getByText(/Calcul des scores W1/i)).toBeInTheDocument();
    expect(screen.getByText(/Rédaction des justifications/i)).toBeInTheDocument();
  });

  it("expose une annonce accessible vivante pour les lecteurs d'écran", () => {
    render(<GenerationProgress status="processing" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status.textContent).toMatch(/(en attente|en cours|Génération)/i);
  });

  it("progresse automatiquement d'étape en étape", () => {
    vi.useFakeTimers();
    render(<GenerationProgress status="processing" />);

    // Au démarrage, étape 1 active
    expect(screen.getByLabelText(/Étape 1 sur 4/i)).toHaveAttribute(
      "data-state",
      "active",
    );

    // Après 500 ms, étape 1 terminée, étape 2 active
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByLabelText(/Étape 1 sur 4/i)).toHaveAttribute(
      "data-state",
      "done",
    );
    expect(screen.getByLabelText(/Étape 2 sur 4/i)).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("coche toutes les étapes quand status=done", () => {
    render(<GenerationProgress status="done" />);

    for (let i = 1; i <= 4; i++) {
      expect(screen.getByLabelText(`Étape ${i} sur 4`)).toHaveAttribute(
        "data-state",
        "done",
      );
    }
  });

  it("traduit aussi le statut pending observé en production locale", () => {
    render(<GenerationProgress status="pending" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
