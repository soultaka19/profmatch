import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkles, FileText } from "lucide-react";
import { RoadmapPlaceholder } from "../RoadmapPlaceholder";

describe("RoadmapPlaceholder", () => {
  it("rend le titre, le lead, le hero et N cartes", () => {
    render(
      <RoadmapPlaceholder
        title="Bienvenue, Marie"
        lead="Cet espace vous permettra de générer les propositions."
        heroIcon={<Sparkles data-testid="hero-icon" />}
        heroTitle="Module en cours"
        heroSub="L'algorithme est en cours d'intégration."
        heroEta="4 juin 2026"
        cards={[
          { icon: <FileText />, title: "Carte A", description: "Description A" },
          { icon: <FileText />, title: "Carte B", description: "Description B" },
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /Bienvenue, Marie/i })).toBeInTheDocument();
    expect(screen.getByText(/générer les propositions/i)).toBeInTheDocument();
    expect(screen.getByText(/Module en cours/i)).toBeInTheDocument();
    expect(screen.getByText(/4 juin 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Carte A")).toBeInTheDocument();
    expect(screen.getByText("Carte B")).toBeInTheDocument();
    expect(screen.getByText("Description A")).toBeInTheDocument();
  });

  it("rend les cartes avec le badge 'Bientôt' par défaut", () => {
    render(
      <RoadmapPlaceholder
        title="X"
        lead="Y"
        heroIcon={<Sparkles />}
        heroTitle="Z"
        heroSub="W"
        cards={[{ icon: <FileText />, title: "Une carte", description: "..." }]}
      />
    );
    expect(screen.getAllByText(/Bientôt/i).length).toBeGreaterThan(0);
  });
});
