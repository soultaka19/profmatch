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

  it("affiche le label du thème courant", () => {
    setup();
    expect(screen.getByRole("button", { name: /Anthracite ivoire/i })).toBeInTheDocument();
  });

  it("ouvre le menu au click et liste les deux thèmes", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    expect(screen.getByRole("menuitem", { name: /Anthracite ivoire/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Bordeaux institutionnel/i })).toBeInTheDocument();
  });

  it("change de thème quand on click sur une option", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Anthracite ivoire/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Bordeaux institutionnel/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("institutionalBurgundy");
    expect(screen.getByRole("button", { name: /Bordeaux institutionnel/i })).toBeInTheDocument();
  });
});
