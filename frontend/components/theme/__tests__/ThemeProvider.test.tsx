import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme/config";

function Consumer() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current">{theme}</span>
      <button onClick={() => setTheme("institutionalBurgundy")}>switch</button>
      <button onClick={() => setTheme("slateViolet")}>switch violet</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applique anthraciteIvory par défaut", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current")).toHaveTextContent("anthraciteIvory");
    expect(document.documentElement.getAttribute("data-theme")).toBe("anthraciteIvory");
  });

  it("hydrate depuis localStorage si présent", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "institutionalBurgundy");

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current")).toHaveTextContent("institutionalBurgundy");
    expect(document.documentElement.getAttribute("data-theme")).toBe("institutionalBurgundy");
  });

  it("hydrate slateViolet depuis localStorage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "slateViolet");

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current")).toHaveTextContent("slateViolet");
    expect(document.documentElement.getAttribute("data-theme")).toBe("slateViolet");
  });

  it("persiste le thème dans localStorage et met à jour data-theme", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText("switch").click();
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("institutionalBurgundy");
    expect(document.documentElement.getAttribute("data-theme")).toBe("institutionalBurgundy");
  });

  it("persiste slateViolet dans localStorage et data-theme", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText("switch violet").click();
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("slateViolet");
    expect(document.documentElement.getAttribute("data-theme")).toBe("slateViolet");
  });

  it("ignore une valeur invalide dans localStorage et retombe sur le défaut", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "totallyBogus");

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current")).toHaveTextContent("anthraciteIvory");
  });
});
