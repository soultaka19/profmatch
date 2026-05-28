import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnrichmentCounter } from "./EnrichmentCounter";

describe("EnrichmentCounter", () => {
  it("affiche le ratio enrichies / total quand l'IA travaille encore", () => {
    render(
      <EnrichmentCounter
        totaux={{
          total: 78,
          statique: 55,
          en_cours: 0,
          enrichie: 23,
          echec: 0,
        }}
      />,
    );

    expect(screen.getByText("23 / 78")).toBeInTheDocument();
    expect(screen.getByText(/enrichies par l'IA/i)).toBeInTheDocument();
  });

  it("inclut les échecs dans le compteur 'traitées' pour ne pas tourner indéfiniment", () => {
    render(
      <EnrichmentCounter
        totaux={{
          total: 10,
          statique: 0,
          en_cours: 0,
          enrichie: 7,
          echec: 3,
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-complete", "true");
  });

  it("affiche un état neutre quand les totaux ne sont pas encore connus", () => {
    render(<EnrichmentCounter totaux={undefined} />);

    expect(screen.getByText(/Enrichissement IA/i)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  it("expose les chiffres en tabular-nums pour éviter le jiggle visuel", () => {
    render(
      <EnrichmentCounter
        totaux={{ total: 78, statique: 55, en_cours: 0, enrichie: 23, echec: 0 }}
      />,
    );

    const counter = screen.getByText("23 / 78");
    expect(counter.className).toMatch(/tabular-nums/);
  });
});
