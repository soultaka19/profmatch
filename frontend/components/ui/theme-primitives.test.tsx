import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Slider } from "./slider";

describe("theme-aware UI primitives", () => {
  it("uses ProfMatch tokens for primary and secondary actions", () => {
    render(
      <>
        <Button>Enregistrer</Button>
        <Button variant="outline">Annuler</Button>
        <Badge variant="secondary">Proposee</Badge>
      </>
    );

    expect(screen.getByRole("button", { name: "Enregistrer" })).toHaveClass("hover:bg-primary-dark");
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveClass("bg-canvas-pure", "hover:bg-surface");
    expect(screen.getByText("Proposee")).toHaveClass("bg-surface", "text-fg");
  });

  it("uses themed surfaces and focus states for form controls", () => {
    const { container } = render(
      <>
        <Input aria-label="Nom" />
        <Checkbox aria-label="Actif" />
        <Slider defaultValue={[50]} />
      </>
    );

    expect(screen.getByLabelText("Nom")).toHaveClass("bg-canvas-pure", "focus-visible:ring-primary-ring");
    expect(screen.getByLabelText("Nom")).toHaveClass("focus-visible:border-primary-border");
    expect(screen.getByLabelText("Actif")).toHaveClass("ring-offset-canvas-pure", "focus-visible:ring-primary-ring");
    expect(container.querySelector("[data-orientation='horizontal'] span")).toHaveClass("bg-surface");
  });
});
