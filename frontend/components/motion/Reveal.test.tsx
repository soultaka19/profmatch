import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Reveal } from "./Reveal";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let lastCallback: IOCallback | null = null;

class FakeIO {
  constructor(cb: IOCallback) {
    lastCallback = cb;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  lastCallback = null;
  vi.stubGlobal("IntersectionObserver", FakeIO);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("rend les enfants et démarre masqué jusqu'à l'entrée dans le viewport", () => {
    render(
      <Reveal>
        <p>contenu</p>
      </Reveal>,
    );
    expect(screen.getByText("contenu")).toBeInTheDocument();
    expect(screen.getByText("contenu").parentElement).toHaveAttribute("data-shown", "false");
  });

  it("se révèle quand l'élément entre dans le viewport", () => {
    render(
      <Reveal>
        <p>contenu</p>
      </Reveal>,
    );
    act(() => {
      lastCallback?.([{ isIntersecting: true }]);
    });
    expect(screen.getByText("contenu").parentElement).toHaveAttribute("data-shown", "true");
  });

  it("affiche directement le contenu sans IntersectionObserver (dégradation)", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(
      <Reveal>
        <p>fallback</p>
      </Reveal>,
    );
    expect(screen.getByText("fallback").parentElement).toHaveAttribute("data-shown", "true");
  });
});
