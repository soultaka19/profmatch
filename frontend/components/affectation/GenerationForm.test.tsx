import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GenerationForm } from "./GenerationForm";

const controls = vi.hoisted(() => ({
  mode: "loading" as "loading" | "ready",
  updatePonderations: vi.fn(),
  generer: vi.fn(),
  sessions: [{ id: 7, nom: "Hiver 2027", annee: 2027, semestre: "hiver", statut: "ouverte" }],
  programmes: [{ id: 46, code: "51046", nom: "Programmation informatique", departement: null, semestres_admission: [] }],
  ponderations: { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
  etapes: [
    { id: 1, programme_id: 46, ordre: 1, nom: "Étape 1", total_cours: 2, cours_couverts: 0, affectation_complete: false },
    { id: 2, programme_id: 46, ordre: 2, nom: "Étape 2", total_cours: 2, cours_couverts: 2, affectation_complete: true },
  ],
}));

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (controls.mode === "loading") {
      return { data: undefined, error: undefined, isLoading: true };
    }
    if (key === "/api/sessions/") {
      return { data: controls.sessions, isLoading: false };
    }
    if (key?.includes("programmes-eligibles")) {
      return { data: controls.programmes, isLoading: false };
    }
    if (key?.includes("/ponderations")) {
      return { data: controls.ponderations, isLoading: false };
    }
    if (key?.includes("/programmes/46/etapes-statut")) {
      return { data: controls.etapes, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  },
}));

vi.mock("@/lib/api/affectations", () => ({
  sessionsApi: {
    list: vi.fn(),
    getPonderations: vi.fn(),
    updatePonderations: controls.updatePonderations,
    programmesEligibles: vi.fn(),
    etapesStatut: vi.fn(),
  },
  affectationsApi: {
    generer: controls.generer,
  },
  etapesApi: { list: vi.fn() },
}));

describe("GenerationForm", () => {
  beforeEach(() => {
    controls.mode = "loading";
    controls.updatePonderations.mockReset();
    controls.generer.mockReset();
  });

  it("annonce le chargement des sessions avant de permettre une sélection", () => {
    render(<GenerationForm onTaskStarted={vi.fn()} />);

    expect(screen.getByText(/Chargement des sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Lancer la génération/i).closest("button")).toBeDisabled();
  });

  it("transmet le périmètre choisi après préparation de la génération", async () => {
    controls.mode = "ready";
    controls.updatePonderations.mockResolvedValue({});
    controls.generer.mockResolvedValue({ task_id: "task-7" });
    const onTaskStarted = vi.fn();
    render(<GenerationForm onTaskStarted={onTaskStarted} />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Hiver 2027" }));
    fireEvent.click(screen.getByRole("button", { name: /Programmation informatique/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Étape 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /Lancer la génération/i }));

    await waitFor(() => expect(onTaskStarted).toHaveBeenCalledTimes(1));
    expect(onTaskStarted).toHaveBeenCalledWith(
      "task-7",
      7,
      expect.objectContaining({
        session: { id: 7, nom: "Hiver 2027" },
        programmes: [{ id: 46, code: "51046", nom: "Programmation informatique" }],
        etapes: [expect.objectContaining({ id: 1, ordre: 1 })],
        weights: { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
      })
    );
  });

  it("désactive les étapes déjà entièrement affectées", () => {
    controls.mode = "ready";
    render(<GenerationForm onTaskStarted={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Hiver 2027" }));
    fireEvent.click(screen.getByRole("button", { name: /Programmation informatique/i }));

    expect(screen.getByRole("checkbox", { name: /Étape 1/i })).not.toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Étape 2/i })).toBeDisabled();
    expect(screen.getByText(/Déjà affectée/i)).toBeInTheDocument();
  });
});
