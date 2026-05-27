import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";

function renderSheet(props: { expandable?: boolean } = {}) {
  return render(
    <Sheet open>
      <SheetContent {...props}>
        <SheetHeader>
          <SheetTitle>Panneau</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

describe("SheetContent — agrandissement", () => {
  it("bascule la largeur du panneau via le bouton d'agrandissement", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    // Largeur par défaut = sm:max-w-3xl (l'ancien « agrandi » devenu le minimum).
    expect(dialog).toHaveClass("sm:max-w-3xl");
    expect(dialog).not.toHaveClass("sm:max-w-[min(1100px,92vw)]");

    fireEvent.click(screen.getByRole("button", { name: "Agrandir le panneau" }));
    expect(dialog).toHaveClass("sm:max-w-[min(1100px,92vw)]");
    expect(screen.getByRole("button", { name: "Réduire le panneau" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Réduire le panneau" }));
    expect(dialog).not.toHaveClass("sm:max-w-[min(1100px,92vw)]");
  });

  it("n'affiche aucun bouton d'agrandissement quand expandable={false}", () => {
    renderSheet({ expandable: false });
    expect(
      screen.queryByRole("button", { name: /agrandir le panneau/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });
});
