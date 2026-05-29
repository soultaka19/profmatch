import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoursDeleteDialog } from "./CoursDeleteDialog";
import { coursApi } from "@/lib/api/cours";
import { toastSuccess, toastError } from "@/lib/toast";

// On mocke la frontière d'unité (@/lib/toast) plutôt que sonner : le test vérifie
// que le dialog appelle bien nos helpers, indépendamment de leur implémentation.
vi.mock("@/lib/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock("@/lib/api/cours", () => ({ coursApi: { remove: vi.fn() } }));

const cours = { id: 1, code: "INF1001", nom: "Intro", credits: 3, heures: 45 };

describe("CoursDeleteDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toast de succès après suppression", async () => {
    (coursApi.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    render(<CoursDeleteDialog cours={cours} onClose={() => {}} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("toast d'erreur si l'API échoue", async () => {
    (coursApi.remove as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    render(<CoursDeleteDialog cours={cours} onClose={() => {}} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
