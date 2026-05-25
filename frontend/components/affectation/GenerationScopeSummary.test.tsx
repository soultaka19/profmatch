import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenerationScopeSummary } from "./GenerationScopeSummary";
import type { GenerationScope } from "./types";

const scope: GenerationScope = {
  session: { id: 7, nom: "Hiver 2027" },
  programmes: [{ id: 46, code: "51046", nom: "Programmation informatique" }],
  etapes: [{ id: 1, ordre: 1, nom: "Étape 1", programmeId: 46, programmeCode: "51046" }],
  weights: { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
};

describe("GenerationScopeSummary", () => {
  it("affiche le périmètre et les pondérations de la génération", () => {
    render(<GenerationScopeSummary scope={scope} />);

    expect(screen.getByText("Hiver 2027")).toBeInTheDocument();
    expect(screen.getByText(/Programmation informatique/)).toBeInTheDocument();
    expect(screen.getByText(/Étape 1/)).toBeInTheDocument();
    expect(screen.getByText(/W1 40%/)).toBeInTheDocument();
  });

  it("indique toutes les étapes si aucune étape n'est ciblée", () => {
    render(<GenerationScopeSummary scope={{ ...scope, etapes: [] }} />);

    expect(screen.getByText("Toutes les étapes")).toBeInTheDocument();
  });
});
