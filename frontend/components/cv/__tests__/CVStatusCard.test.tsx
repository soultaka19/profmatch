import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CVStatusCard } from "../CVStatusCard";
import type { CVResponse } from "@/lib/types/api";

const baseCV: CVResponse = {
  id: 1,
  nom_original: "cv-jean.pdf",
  source: "upload",
  taille_octets: 287000,
  mime_type: "application/pdf",
  statut: "traite",
  message_erreur: null,
  televerse_le: "2026-05-20T14:23:00Z",
  traite_le: "2026-05-20T14:23:05Z",
};

describe("CVStatusCard", () => {
  it("rend l'état 'traité' avec badge Analysé", () => {
    render(<CVStatusCard data={baseCV} loading={false} />);
    expect(screen.getByText(/Analysé/i)).toBeInTheDocument();
    expect(screen.getByText("cv-jean.pdf")).toBeInTheDocument();
  });

  it("rend l'état 'en_cours' via ProgressCard", () => {
    render(<CVStatusCard data={{ ...baseCV, statut: "en_cours" }} loading={false} />);
    expect(screen.getByText(/Extraction en cours/i)).toBeInTheDocument();
  });

  it("rend l'état 'erreur' avec message", () => {
    render(
      <CVStatusCard
        data={{ ...baseCV, statut: "erreur", message_erreur: "PDF illisible" }}
        loading={false}
      />
    );
    expect(screen.getByText(/^Erreur$/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF illisible/i)).toBeInTheDocument();
  });

  it("ne rend rien si data est null", () => {
    const { container } = render(<CVStatusCard data={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
