import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceBadge } from "../SourceBadge";

describe("SourceBadge", () => {
  it("renders 'ia' for llm source with primary color", () => {
    render(<SourceBadge source="llm" />);
    const el = screen.getByLabelText("Extrait par l'IA");
    expect(el).toBeInTheDocument();
    expect(el.textContent).toMatch(/ia/i);
    expect(el.className).toContain("text-primary");
    expect(el.className).toContain("italic");
  });

  it("renders 'manuel' for manual source with neutral color", () => {
    render(<SourceBadge source="manual" />);
    const el = screen.getByLabelText("Édité manuellement");
    expect(el).toBeInTheDocument();
    expect(el.textContent).toMatch(/manuel/i);
    expect(el.className).toContain("text-fg-subtle");
  });

  it("applies different visual treatment between variants", () => {
    const { rerender } = render(<SourceBadge source="llm" />);
    const llm = screen.getByLabelText("Extrait par l'IA");
    const llmClass = llm.className;
    rerender(<SourceBadge source="manual" />);
    const manual = screen.getByLabelText("Édité manuellement");
    expect(manual.className).not.toBe(llmClass);
  });
});
