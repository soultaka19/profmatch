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

  it("affiche Fortement recommandé pour score ≥ 0.8", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);
    expect(screen.getByText(/Fortement recommandé/i)).toBeInTheDocument();
  });

  it("affiche Recommandé avec réserves pour 0.6 ≤ score < 0.8", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.72} />);
    expect(screen.getByText(/Recommandé avec réserves/i)).toBeInTheDocument();
  });

  it("affiche À examiner pour score < 0.6", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.45} />);
    expect(screen.getByText(/À examiner/i)).toBeInTheDocument();
  });
  it("affiche des libellés complets pour les dimensions W1-W4", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);

    expect(screen.getByText(/Compétences/i)).toBeInTheDocument();
    expect(screen.getByText(/Expérience/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    expect(screen.getByText(/Sémantique/i)).toBeInTheDocument();
  });
});
