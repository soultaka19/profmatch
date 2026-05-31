import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NewGenerationButton } from "./NewGenerationButton";

describe("NewGenerationButton", () => {
  it("réinitialise directement si aucune proposition ne reste à traiter", () => {
    const onReset = vi.fn();
    render(<NewGenerationButton hasPendingProposals={false} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Nouvelle génération" }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("demande confirmation si des propositions restent en attente", () => {
    const onReset = vi.fn();
    render(<NewGenerationButton hasPendingProposals onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Nouvelle génération" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Démarrer" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
