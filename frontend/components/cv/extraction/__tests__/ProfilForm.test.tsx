import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfilForm } from "../ProfilForm";

vi.mock("@/lib/api/extraction", () => ({
  extractionApi: {
    profil: { update: vi.fn().mockResolvedValue({ resume: "X", source: "manual" }) },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfilForm", () => {
  it("affiche le compteur de caractères", () => {
    render(<ProfilForm open initialResume="Hello" onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    expect(screen.getByText("5 / 1000")).toBeInTheDocument();
  });

  it("désactive Enregistrer et colore le compteur en destructive quand > 1000", () => {
    render(<ProfilForm open initialResume="" onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x".repeat(1001) } });
    expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeDisabled();
    const counter = screen.getByText("1001 / 1000");
    expect(counter.className).toContain("text-destructive");
  });

  it("appelle l'API et ferme au succès", async () => {
    const { extractionApi } = await import("@/lib/api/extraction");
    const onClose = vi.fn();
    const onMutate = vi.fn();
    render(<ProfilForm open initialResume="" onOpenChange={onClose} onMutate={onMutate} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Mon résumé" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(extractionApi.profil.update).toHaveBeenCalledWith({ resume: "Mon résumé" });
      expect(onMutate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  it("envoie resume:null si vide après trim", async () => {
    const { extractionApi } = await import("@/lib/api/extraction");
    render(<ProfilForm open initialResume="" onOpenChange={vi.fn()} onMutate={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(extractionApi.profil.update).toHaveBeenCalledWith({ resume: null });
    });
  });
});
