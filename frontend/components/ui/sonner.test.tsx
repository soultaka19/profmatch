import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Toaster } from "./sonner";

const sonnerSpy = vi.fn((_props: unknown) => null);

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: unknown) => sonnerSpy(props),
}));

describe("Toaster", () => {
  it("presente les retours d'action de maniere stable et dismissible", () => {
    render(<Toaster />);

    expect(sonnerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        position: "top-right",
        closeButton: true,
        duration: 4500,
      })
    );
  });
});
