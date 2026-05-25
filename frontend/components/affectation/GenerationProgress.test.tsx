import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenerationProgress } from "./GenerationProgress";

describe("GenerationProgress", () => {
  it("traduit un traitement en cours avec une annonce accessible", () => {
    render(<GenerationProgress status="processing" />);

    expect(screen.getByText("Calcul des propositions en cours")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Calcul des propositions en cours");
    expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
  });

  it("traduit une tâche en attente", () => {
    render(<GenerationProgress status="queued" />);

    expect(screen.getByText("Génération en attente de traitement")).toBeInTheDocument();
  });

  it("traduit aussi le statut pending observé en production locale", () => {
    render(<GenerationProgress status="pending" />);

    expect(screen.getByText("Génération en attente de traitement")).toBeInTheDocument();
  });
});
