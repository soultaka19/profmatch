import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfilSection } from "../ProfilSection";

const onMutate = vi.fn();

describe("ProfilSection", () => {
  it("affiche le placeholder et incite à ajouter si resume null", () => {
    render(<ProfilSection profil={{ resume: null, source: "llm" }} onMutate={onMutate} />);
    expect(screen.getByText(/Aucun résumé/i)).toBeInTheDocument();
    // Bouton "Ajouter" rendu (caché par CSS, mais présent dans DOM)
    expect(screen.getByRole("button", { name: /Ajouter un profil/i })).toBeInTheDocument();
  });

  it("affiche le resume quand profil rempli", () => {
    render(<ProfilSection profil={{ resume: "Dev senior 8 ans", source: "llm" }} onMutate={onMutate} />);
    expect(screen.getByText("Dev senior 8 ans")).toBeInTheDocument();
  });

  it("affiche eyebrow numéroté '00' et titre PROFIL", () => {
    render(<ProfilSection profil={{ resume: null, source: "llm" }} onMutate={onMutate} />);
    expect(screen.getByText("00")).toBeInTheDocument();
    expect(screen.getByText("Profil")).toBeInTheDocument();
  });

  it("ouvre le form au click sur le placeholder", () => {
    render(<ProfilSection profil={{ resume: null, source: "llm" }} onMutate={onMutate} />);
    fireEvent.click(screen.getByText(/Aucun résumé/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
