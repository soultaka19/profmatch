import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Page from "../[id]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "3" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/programmes", () => ({
  programmesApi: {
    get: vi.fn().mockResolvedValue({
      id: 3,
      code: "51046",
      nom: "Génie",
      departement: "TI",
      semestres_admission: ["automne"],
    }),
    calendrier: vi.fn().mockResolvedValue({
      programme_id: 3,
      rythme: "standard",
      sessions_actives: ["automne", "hiver"],
      vacances: ["printemps"],
      etapes_total: 1,
    }),
  },
}));

vi.mock("@/lib/api/etapes", () => ({
  etapesApi: {
    list: vi.fn().mockResolvedValue([
      { id: 1, programme_id: 3, ordre: 1, nom: "A", cree_le: "2025-01-01T00:00:00" },
    ]),
  },
}));

// Stub heavy sub-components that do their own fetches or use portals
vi.mock("@/components/admin/ProgrammeCalendarPanel", () => ({
  ProgrammeCalendarPanel: () => <div data-testid="calendar-panel" />,
}));
vi.mock("@/components/admin/EtapeAccordion", () => ({
  EtapeAccordion: () => <div data-testid="etape-accordion" />,
}));
vi.mock("@/components/admin/EtapeCreateDialog", () => ({
  EtapeCreateDialog: () => <div data-testid="etape-create-dialog" />,
}));
vi.mock("@/components/admin/EtapeDeleteDialog", () => ({
  EtapeDeleteDialog: () => null,
}));
vi.mock("@/components/admin/ProgrammeEditDialog", () => ({
  ProgrammeEditDialog: () => null,
}));

describe("Détail programme", () => {
  it("affiche le département et le nombre d'étapes", async () => {
    render(<Page />);
    await waitFor(() => expect(screen.getByText("TI")).toBeInTheDocument());
    expect(screen.getByText(/1 étape configurée/)).toBeInTheDocument();
  });
});
