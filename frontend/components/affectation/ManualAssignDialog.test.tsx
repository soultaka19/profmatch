import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAssignDialog } from "./ManualAssignDialog";

vi.mock("@/lib/api/affectations", () => ({
  affectationsApi: {
    listProfesseursDisponibles: vi.fn().mockResolvedValue([]),
    createManuelle: vi.fn().mockResolvedValue({}),
  },
}));

describe("ManualAssignDialog", () => {
  it("affiche le bouton déclencheur", () => {
    render(<ManualAssignDialog sessionId={1} coursId={1} onAssigned={vi.fn()} />);
    expect(
      screen.getByText(/Affecter un autre professeur/i)
    ).toBeInTheDocument();
  });

  it("ouvre le dialog au clic", () => {
    render(<ManualAssignDialog sessionId={1} coursId={1} onAssigned={vi.fn()} />);
    fireEvent.click(screen.getByText(/Affecter un autre professeur/i));
    expect(
      screen.getByText(/Affecter manuellement un professeur/i)
    ).toBeInTheDocument();
  });
});
