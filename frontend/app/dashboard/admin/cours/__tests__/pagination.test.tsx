import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Page from "../page";
import { coursApi } from "@/lib/api/cours";

vi.mock("@/lib/api/cours", () => ({
  coursApi: {
    list: vi.fn().mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, code: `INF${i}`, nom: `Cours ${i}`, credits: 3, heures: 45,
      })),
    ),
    get: vi.fn(),
  },
}));

describe("Page Cours — pagination", () => {
  it("n'affiche que 5 lignes sur 7 et le compteur total", async () => {
    render(<Page />);
    await waitFor(() => expect(screen.getByText("7 cours")).toBeInTheDocument());
    expect(screen.getAllByRole("row").length).toBe(5 + 1); // 5 lignes + en-tête
    expect(screen.getByText("1–5 sur 7")).toBeInTheDocument();
  });
});
