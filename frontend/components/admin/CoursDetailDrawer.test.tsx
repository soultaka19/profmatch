import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CoursDetailDrawer } from "./CoursDetailDrawer";

vi.mock("@/lib/api/cours", () => ({
  coursApi: {
    get: vi.fn().mockResolvedValue({
      id: 7,
      code: "420-101",
      nom: "Programmation I",
      description: "Introduction à la programmation.",
      credits: 3,
      heures: 60,
    }),
  },
}));

vi.mock("@/components/admin/CoursCompetencesPanel", () => ({
  CoursCompetencesPanel: () => <div data-testid="competences-panel" />,
}));
vi.mock("@/components/admin/CoursEditDialog", () => ({
  CoursEditDialog: () => null,
}));

describe("CoursDetailDrawer", () => {
  it("affiche le nom et la description du cours quand ouvert", async () => {
    render(<CoursDetailDrawer coursId={7} open onOpenChange={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Programmation I")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Introduction à la programmation."),
    ).toBeInTheDocument();
  });
});
