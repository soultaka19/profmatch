import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBreakdown } from "./ScoreBreakdown";

const scores = { comp: 0.857, exp: 0.75, hist: 0.9, sem: 0.92 };
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("ScoreBreakdown", () => {
  it("affiche le score global en %", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("affiche 4 segments dans la barre", () => {
    const { container } = render(
      <ScoreBreakdown scores={scores} poids={poids} total={0.84} />
    );
    const segments = container.querySelectorAll("[style*='width']");
    expect(segments.length).toBeGreaterThanOrEqual(4);
  });

  it("affiche Fortement recommande pour score eleve", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);
    expect(screen.getByText(/Fortement recommand/i)).toBeInTheDocument();
  });

  it("affiche Recommande avec reserves pour score moyen", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.72} />);
    expect(screen.getByText(/Recommand.*avec r/i)).toBeInTheDocument();
  });

  it("affiche A examiner pour score faible", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.45} />);
    expect(screen.getByText(/examiner/i)).toBeInTheDocument();
  });

  it("affiche des libelles complets pour les dimensions W1-W4", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);

    expect(screen.getByText(/Comp/i)).toBeInTheDocument();
    expect(screen.getByText(/Exp/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    expect(screen.getByText(/mantique/i)).toBeInTheDocument();
  });

  it("utilise les tokens analytiques des dimensions de score", () => {
    const { container } = render(
      <ScoreBreakdown scores={scores} poids={poids} total={0.84} />
    );

    expect(container.querySelector(".bg-score-competences")).toBeInTheDocument();
    expect(container.querySelector(".bg-score-experience")).toBeInTheDocument();
    expect(container.querySelector(".bg-score-historique")).toBeInTheDocument();
    expect(container.querySelector(".bg-score-semantique")).toBeInTheDocument();
  });
});
