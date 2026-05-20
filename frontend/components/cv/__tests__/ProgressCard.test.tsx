import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressCard } from "../ProgressCard";

describe("ProgressCard", () => {
  it("rend le nom du fichier + badge 'Extraction en cours'", () => {
    render(
      <ProgressCard
        fileName="cv-jean.pdf"
        fileMeta="287 ko · PDF"
        activeStep="extraction"
      />
    );
    expect(screen.getByText("cv-jean.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Extraction en cours/i)).toBeInTheDocument();
    expect(screen.getByText("287 ko · PDF")).toBeInTheDocument();
  });

  it("rend les 3 steps avec l'étape active marquée data-state", () => {
    render(<ProgressCard fileName="x.pdf" fileMeta="" activeStep="extraction" />);
    const upload = screen.getByTestId("step-upload");
    const extraction = screen.getByTestId("step-extraction");
    const indexation = screen.getByTestId("step-indexation");
    expect(upload).toHaveAttribute("data-state", "done");
    expect(extraction).toHaveAttribute("data-state", "active");
    expect(indexation).toHaveAttribute("data-state", "pending");
  });

  it("met le step 'upload' en active si activeStep=upload", () => {
    render(<ProgressCard fileName="x.pdf" fileMeta="" activeStep="upload" />);
    expect(screen.getByTestId("step-upload")).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("step-extraction")).toHaveAttribute("data-state", "pending");
  });
});
