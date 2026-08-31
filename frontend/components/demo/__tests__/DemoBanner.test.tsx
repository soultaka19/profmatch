import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DemoBanner } from "../DemoBanner";

const changerDeRole = vi.fn();
const quitter = vi.fn();

let etat = {
  estDemo: true,
  resteSecondes: 3_500,
  expire: false,
  appelsTotal: 6,
  appelsRestants: 4,
  changerDeRole,
  quitter,
};

vi.mock("@/components/demo/DemoProvider", () => ({
  useDemo: () => etat,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: 1, email: "demo@demo.profmatch", nom_complet: "Demo", role: "rh" } }),
}));

describe("DemoBanner", () => {
  it("ne s'affiche pas hors démonstration", () => {
    etat = { ...etat, estDemo: false };
    const { container } = render(<DemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("annonce le temps restant et le budget IA", () => {
    etat = { ...etat, estDemo: true, resteSecondes: 3_500, appelsRestants: 4, appelsTotal: 6 };
    render(<DemoBanner />);

    // 3500 s = 58 min 20 s : le visiteur doit lire un compte à rebours, pas
    // une date d'expiration à convertir de tête.
    expect(screen.getByText(/effacé dans 58:20/)).toBeInTheDocument();
    expect(screen.getByText("4/6 appels IA")).toBeInTheDocument();
  });

  it("permet de passer d'un rôle à l'autre sans se reconnecter", () => {
    etat = { ...etat, estDemo: true };
    render(<DemoBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    expect(changerDeRole).toHaveBeenCalledWith("admin");
  });

  it("dit que l'espace a expiré plutôt que d'afficher 00:00", () => {
    etat = { ...etat, estDemo: true, expire: true, resteSecondes: 0 };
    render(<DemoBanner />);

    expect(screen.getByText(/a expiré/)).toBeInTheDocument();
    expect(screen.queryByText(/appels IA/)).not.toBeInTheDocument();
  });
});
