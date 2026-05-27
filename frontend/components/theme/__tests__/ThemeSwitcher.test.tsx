import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../ThemeProvider";
import { ThemeSwitcher } from "../ThemeSwitcher";

function setup() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("affiche le label du theme courant", () => {
    setup();
    expect(screen.getByRole("button", { name: /Anthracite ivoire/i })).toBeInTheDocument();
  });

  it("ouvre le panneau Apparence et liste trois themes visuels", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByText("Apparence")).toBeInTheDocument();
    expect(screen.getByText(/Th.me visuel/i)).toBeInTheDocument();
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(3);
    expect(screen.getByRole("menuitemradio", { name: /Anthracite ivoire/i })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: /Bordeaux institutionnel/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Violet ardoise/i })).toBeInTheDocument();
  });

  it("change de theme quand on selectionne une option", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Bordeaux institutionnel/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("institutionalBurgundy");
    expect(screen.getByRole("button", { name: /Bordeaux institutionnel/i })).toBeInTheDocument();
  });

  it("selectionne Violet ardoise depuis son apercu visuel", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));

    const violetOption = screen.getByRole("menuitemradio", { name: /Violet ardoise/i });
    expect(violetOption.querySelector("[data-theme-swatch]")).toBeInTheDocument();
    fireEvent.click(violetOption);

    expect(document.documentElement.getAttribute("data-theme")).toBe("slateViolet");
    expect(screen.getByRole("button", { name: /Violet ardoise/i })).toBeInTheDocument();
  });

  it("ferme le panneau avec Escape", () => {
    setup();
    const trigger = screen.getByRole("button", { name: /Anthracite ivoire/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("place le focus sur le theme actif quand le panneau s ouvre", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));

    expect(screen.getByRole("menuitemradio", { name: /Anthracite ivoire/i })).toHaveFocus();
  });

  it("navigue entre les themes au clavier et selectionne avec Enter", () => {
    setup();
    const trigger = screen.getByRole("button", { name: /Anthracite ivoire/i });
    fireEvent.click(trigger);

    const initial = screen.getByRole("menuitemradio", { name: /Anthracite ivoire/i });
    fireEvent.keyDown(initial, { key: "ArrowDown" });
    expect(screen.getByRole("menuitemradio", { name: /Bordeaux institutionnel/i })).toHaveFocus();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    const violet = screen.getByRole("menuitemradio", { name: /Violet ardoise/i });
    expect(violet).toHaveFocus();
    fireEvent.keyDown(violet, { key: "Enter" });

    expect(document.documentElement.getAttribute("data-theme")).toBe("slateViolet");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
