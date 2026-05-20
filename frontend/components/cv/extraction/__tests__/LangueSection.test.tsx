import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LangueSection } from "../LangueSection";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: { langues: { remove: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const items = [
  { id: 1, langue: "Français", niveau: "natif" as const, source: "llm" as const },
  { id: 2, langue: "Anglais", niveau: "C1" as const, source: "manual" as const },
];

beforeEach(() => vi.clearAllMocks());

describe("LangueSection", () => {
  it("affiche eyebrow 04 + langues + niveaux CECRL", () => {
    render(<LangueSection items={items} onMutate={vi.fn()} />);
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("natif")).toBeInTheDocument();
    expect(screen.getByText("Anglais")).toBeInTheDocument();
    expect(screen.getByText("C1")).toBeInTheDocument();
  });

  it("supprime un item via AlertDialog", async () => {
    const onMutate = vi.fn();
    const { extractionApi } = await import("@/lib/api/extraction");
    render(<LangueSection items={items} onMutate={onMutate} />);
    fireEvent.click(screen.getByLabelText("Supprimer Français"));
    fireEvent.click(screen.getByRole("button", { name: /^Supprimer$/i }));
    await waitFor(() => {
      expect(extractionApi.langues.remove).toHaveBeenCalledWith(1);
      expect(onMutate).toHaveBeenCalled();
    });
  });
});
