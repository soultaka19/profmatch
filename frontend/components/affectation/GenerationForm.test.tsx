import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenerationForm } from "./GenerationForm";

vi.mock("swr", () => ({
  default: () => ({ data: undefined, error: undefined, isLoading: true }),
}));

describe("GenerationForm", () => {
  it("annonce le chargement des sessions avant de permettre une sélection", () => {
    render(<GenerationForm onTaskStarted={vi.fn()} />);

    expect(screen.getByText(/Chargement des sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Lancer la génération/i).closest("button")).toBeDisabled();
  });
});
