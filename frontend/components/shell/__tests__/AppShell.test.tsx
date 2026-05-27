import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Home, ListChecks, Sparkles } from "lucide-react";
import { AppShell } from "../AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/rh/affectations",
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "rh@test.ca", nom_complet: "RH", role: "rh" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/theme/ThemeSwitcher", () => ({
  ThemeSwitcher: () => <button type="button">Thème</button>,
}));

const rhNavigation = [
  {
    label: "Ressources humaines",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: Home },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: Sparkles },
      { href: "/dashboard/rh/historique", label: "Historique", icon: ListChecks },
    ],
  },
];

describe("AppShell", () => {
  it("dérive le breadcrumb depuis la route active", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(screen.getAllByText("Générer affectations")).toHaveLength(2);
  });

  it("affiche le contexte d'espace et réserve un emplacement d'action principal", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord" sectionLabel="Ressources humaines">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(screen.getAllByText("Ressources humaines")).toHaveLength(2);
    expect(document.querySelector("#app-topbar-page-action")).toBeInTheDocument();
  });

  it("utilise une largeur large pour les écrans de données", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord" contentWidth="wide">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(container.querySelector("main > div")).toHaveClass("max-w-[1360px]");
  });

  it("expose un bouton de menu mobile accessible", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(
      screen.getByRole("button", { name: /ouvrir le menu/i })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("ouvre un tiroir mobile unique et permet de le fermer", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    expect(container.querySelectorAll("#app-mobile-sidebar")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: /navigation principale/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fermer le menu/i }));
    expect(container.querySelector("#app-mobile-sidebar")).not.toBeInTheDocument();
  });

  it("ferme le tiroir mobile avec la touche Escape", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector("#app-mobile-sidebar")).not.toBeInTheDocument();
  });
});
