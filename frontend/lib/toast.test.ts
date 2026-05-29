import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { toastSuccess, toastError } from "@/lib/toast";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("toast helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toastSuccess transmet le message", () => {
    toastSuccess("Cours créé");
    expect(toast.success).toHaveBeenCalledWith("Cours créé");
  });

  it("toastError affiche le message d'une ApiError", () => {
    toastError(new ApiError("Code déjà utilisé", 409), "Échec");
    expect(toast.error).toHaveBeenCalledWith("Code déjà utilisé");
  });

  it("toastError retombe sur le fallback pour une erreur inconnue", () => {
    toastError("boom", "Échec de l'opération");
    expect(toast.error).toHaveBeenCalledWith("Échec de l'opération");
  });
});
