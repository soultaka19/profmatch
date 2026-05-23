import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightSliders } from "./WeightSliders";

const defaultWeights = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("WeightSliders", () => {
  it("affiche les 4 labels W1-W4", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    expect(screen.getAllByText(/W1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/W2/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/W3/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/W4/).length).toBeGreaterThanOrEqual(1);
  });

  it("badge affiche 1.000 quand somme = 1", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    expect(screen.getByText("1.000")).toBeInTheDocument();
  });

  it("affiche 2.000 quand somme invalide", () => {
    render(
      <WeightSliders
        value={{ w1: 0.5, w2: 0.5, w3: 0.5, w4: 0.5 }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("2.000")).toBeInTheDocument();
  });

  it("affiche le message d'erreur quand somme invalide", () => {
    render(
      <WeightSliders
        value={{ w1: 0.5, w2: 0.5, w3: 0.5, w4: 0.5 }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/somme doit être égale/i)).toBeInTheDocument();
  });

  it("affiche les descriptions W1-W4", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    expect(screen.getByText(/Compétences/i)).toBeInTheDocument();
    expect(screen.getByText(/Expérience/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    expect(screen.getByText(/Sémantique/i)).toBeInTheDocument();
  });
});
