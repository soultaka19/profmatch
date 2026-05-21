import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilHeaderCard, computeInitials } from "../ProfilHeaderCard";

describe("computeInitials", () => {
  it("retourne les 2 premières lettres pour Prénom Nom", () => {
    expect(computeInitials("Souleymane Diallo")).toBe("SD");
    expect(computeInitials("Jean Tremblay")).toBe("JT");
  });

  it("compose initiales sur prénom+dernier nom pour 3 mots", () => {
    expect(computeInitials("Mamadou Gando Baldé")).toBe("MB");
  });

  it("duplique l'initiale pour un seul mot", () => {
    expect(computeInitials("Cher")).toBe("CC");
  });

  it("retourne ? pour vide ou whitespace", () => {
    expect(computeInitials("")).toBe("?");
    expect(computeInitials("   ")).toBe("?");
    expect(computeInitials(undefined)).toBe("?");
  });

  it("met les initiales en majuscules", () => {
    expect(computeInitials("john doe")).toBe("JD");
  });
});

describe("ProfilHeaderCard", () => {
  it("affiche le nom complet, email et initiales", () => {
    render(<ProfilHeaderCard nomComplet="Souleymane Diallo" email="soultaka@example.com" />);
    expect(screen.getByText("Souleymane Diallo")).toBeInTheDocument();
    expect(screen.getByText("soultaka@example.com")).toBeInTheDocument();
    expect(screen.getByText("SD")).toBeInTheDocument();
  });

  it("affiche ? quand le nom est vide", () => {
    render(<ProfilHeaderCard nomComplet="" email="a@b.c" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
