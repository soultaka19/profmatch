import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoursCreateDialog } from "./CoursCreateDialog";
import { coursApi } from "@/lib/api/cours";
import { coursCompetencesApi } from "@/lib/api/coursCompetences";

vi.mock("@/lib/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock("@/lib/api/cours", () => ({ coursApi: { create: vi.fn() } }));
vi.mock("@/lib/api/coursCompetences", () => ({ coursCompetencesApi: { create: vi.fn() } }));

describe("CoursCreateDialog — compétences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crée le cours puis attache les compétences saisies", async () => {
    (coursApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42, code: "INF1001", nom: "Intro" });
    (coursCompetencesApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    render(<CoursCreateDialog onCreated={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /Nouveau cours/i }));
    await userEvent.type(screen.getByLabelText("Code"), "INF1001");
    await userEvent.type(screen.getByLabelText("Nom"), "Intro");
    await userEvent.type(screen.getByLabelText(/Compétence/i), "Python");
    await userEvent.click(screen.getByRole("button", { name: /Ajouter à la liste/i }));
    await userEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(coursApi.create).toHaveBeenCalledTimes(1);
    expect(coursCompetencesApi.create).toHaveBeenCalledWith(42, { nom: "Python", importance: 3 });
  });
});
