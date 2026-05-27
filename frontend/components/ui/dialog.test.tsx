import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

function renderDialog(props: { expandable?: boolean } = {}) {
  return render(
    <Dialog open>
      <DialogContent {...props}>
        <DialogHeader>
          <DialogTitle>Fenêtre</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

describe("DialogContent — agrandissement", () => {
  it("n'expose pas le bouton d'agrandissement par défaut (opt-in)", () => {
    renderDialog();
    expect(
      screen.queryByRole("button", { name: /agrandir la fenêtre/i })
    ).not.toBeInTheDocument();
  });

  it("élargit la fenêtre quand expandable est activé", () => {
    renderDialog({ expandable: true });
    const dialog = screen.getByRole("dialog");
    // Palier replié = max-w-3xl (le minimum) ; agrandi = très large.
    expect(dialog).toHaveClass("max-w-3xl");
    expect(dialog).not.toHaveClass("max-w-[min(1100px,92vw)]");

    fireEvent.click(screen.getByRole("button", { name: "Agrandir la fenêtre" }));
    expect(dialog).toHaveClass("max-w-[min(1100px,92vw)]");

    fireEvent.click(screen.getByRole("button", { name: "Réduire la fenêtre" }));
    expect(dialog).not.toHaveClass("max-w-[min(1100px,92vw)]");
  });
});
